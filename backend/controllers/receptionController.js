// Reception portal controller for front-desk registration, scheduling, queue handling, and payment collection.
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');
const { validateAppointmentSlot } = require('../services/appointmentAvailabilityService');

// Restrict user-controlled status and payment values to the database-supported workflow states.
const APPOINTMENT_STATUSES = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
const BILLING_STATUSES = ['Unpaid', 'Paid', 'Partially Paid', 'Refunded'];
const PAYMENT_METHODS = ['Cash', 'Card', 'Insurance', 'Bank Transfer'];

// Daily dashboard and waiting-room queries share this non-overlapping time window.
const todayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const countRows = async (table, filter) => {
  const { count, error } = await filter(supabase.from(table).select('id', { count: 'exact', head: true }));
  if (error) throw error;
  return count || 0;
};

// Relation projections return display-ready records without N+1 client requests.
const appointmentSelect = `
  *,
  patients:patient_id ( id, name, email, phone ),
  doctors:doctor_id ( id, name, specialization, email, phone, consultation_fee, is_available )
`;

const invoiceSelect = `
  *,
  patients:patient_id ( id, name, email, phone ),
  appointments:appointment_id ( id, appointment_date, status )
`;

// Normalize optional emails before unique lookups and inserts.
const normalizeEmail = (email) => email ? email.toLowerCase().trim() : null;

// The dashboard aggregates front-desk work and returns a short, ordered live waiting room.
const getDashboard = async (req, res, next) => {
  try {
    if (!supabase) return errorResponse(res, 'Database is not configured.', 503);
    const { start, end } = todayBounds();

    const [todaysAppointments, waitingPatients, checkedInPatients, newRegistrationsToday, pendingBillingCount, waitingRoom] = await Promise.all([
      countRows('appointments', (query) => query.gte('appointment_date', start).lt('appointment_date', end)),
      countRows('appointments', (query) => query.in('status', ['Checked In', 'In Consultation']).gte('appointment_date', start).lt('appointment_date', end)),
      countRows('appointments', (query) => query.eq('status', 'Checked In').gte('appointment_date', start).lt('appointment_date', end)),
      countRows('patients', (query) => query.gte('created_at', start).lt('created_at', end)),
      countRows('invoices', (query) => query.in('status', ['Unpaid', 'Partially Paid'])),
      supabase
        .from('appointments')
        .select(appointmentSelect)
        .in('status', ['Checked In', 'In Consultation'])
        .gte('appointment_date', start)
        .lt('appointment_date', end)
        .order('appointment_date', { ascending: true })
        .limit(5)
    ]);

    if (waitingRoom.error) return errorResponse(res, 'Failed to retrieve waiting room.', 500, waitingRoom.error.message);

    return successResponse(res, 'Reception dashboard retrieved successfully', {
      metrics: { todaysAppointments, waitingPatients, checkedInPatients, newRegistrationsToday, pendingBillingCount },
      waitingRoom: (waitingRoom.data || []).map((item, index) => ({ ...item, queuePosition: index + 1 }))
    });
  } catch (error) {
    next(error);
  }
};

const getPatients = async (req, res, next) => {
  try {
    if (!supabase) return errorResponse(res, 'Database is not configured.', 503);
    const search = typeof req.query.search === 'string'
      ? req.query.search.trim().replace(/[(),]/g, '').slice(0, 100)
      : '';
    let query = supabase.from('patients').select('*').order('created_at', { ascending: false }).limit(50);

    if (search) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
      const fields = [`name.ilike.%${search}%`, `email.ilike.%${search}%`, `phone.ilike.%${search}%`];
      if (isUuid) fields.push(`id.eq.${search}`);
      query = query.or(fields.join(','));
    }

    const { data, error } = await query;
    if (error) return errorResponse(res, 'Failed to retrieve patients.', 500, error.message);

    const patients = data || [];
    const patientIds = patients.map((patient) => patient.id);
    if (!patientIds.length) return successResponse(res, 'Reception patients retrieved successfully', []);

    // Batch related data once, then join it in memory to avoid two additional queries per patient.
    const now = new Date().toISOString();
    const [upcomingResult, invoiceResult] = await Promise.all([
      supabase
        .from('appointments')
        .select(appointmentSelect)
        .in('patient_id', patientIds)
        .gte('appointment_date', now)
        .neq('status', 'Cancelled')
        .order('appointment_date', { ascending: true }),
      supabase
        .from('invoices')
        .select('patient_id')
        .in('patient_id', patientIds)
        .in('status', ['Unpaid', 'Partially Paid'])
    ]);
    if (upcomingResult.error) return errorResponse(res, 'Failed to retrieve upcoming appointments.', 500, upcomingResult.error.message);
    if (invoiceResult.error) return errorResponse(res, 'Failed to retrieve patient billing status.', 500, invoiceResult.error.message);

    const upcomingByPatient = new Map();
    (upcomingResult.data || []).forEach((appointment) => {
      if (!upcomingByPatient.has(appointment.patient_id)) upcomingByPatient.set(appointment.patient_id, appointment);
    });
    const patientIdsWithPendingInvoices = new Set((invoiceResult.data || []).map((invoice) => invoice.patient_id));
    const enriched = patients.map((patient) => ({
      ...patient,
      upcomingAppointment: upcomingByPatient.get(patient.id) || null,
      billingStatus: patientIdsWithPendingInvoices.has(patient.id) ? 'Pending' : 'Clear'
    }));

    return successResponse(res, 'Reception patients retrieved successfully', enriched);
  } catch (error) {
    next(error);
  }
};

// Optionally creates a patient login together with the clinical patient record when an email is supplied.
const createPatient = async (req, res, next) => {
  try {
    if (!supabase) return errorResponse(res, 'Database is not configured.', 503);
    const { name, email, phone, gender, date_of_birth, blood_type, address, emergency_contact, insurance_provider } = req.body;
    if (!name) return errorResponse(res, 'Full name is required.', 400);

    const cleanEmail = normalizeEmail(email);
    let userId = null;

    if (cleanEmail) {
      if (!req.body.password || req.body.password.length < 6) {
        return errorResponse(res, 'A temporary password of at least 6 characters is required when creating a patient login.', 400);
      }
      const { data: existingUser, error: userLookupError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (userLookupError) return errorResponse(res, 'Failed to validate patient email.', 500, userLookupError.message);
      if (existingUser) {
        if (existingUser.role !== 'Patient') {
          return errorResponse(res, 'This email is already assigned to a non-patient account.', 409);
        }
        userId = existingUser.id;
      } else {
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert({
            name: name.trim(),
            email: cleanEmail,
            password_hash: await bcrypt.hash(req.body.password, await bcrypt.genSalt(12)),
            role: 'Patient',
            is_active: true
          })
          .select('id')
          .single();
        if (userError) return errorResponse(res, 'Failed to create patient login account.', 500, userError.message);
        userId = user.id;
      }
    }

    const { data: patient, error } = await supabase
      .from('patients')
      .insert({
        user_id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone || null,
        gender: gender || 'Unspecified',
        date_of_birth: date_of_birth || null,
        blood_type: blood_type || null,
        address: address || null,
        emergency_contact: emergency_contact || null,
        insurance_provider: insurance_provider || null
      })
      .select('*')
      .single();

    if (error?.code === '23505') return errorResponse(res, 'A patient with this email already exists.', 409);
    if (error) return errorResponse(res, 'Failed to register patient.', 500, error.message);
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: `RECEPTION_CREATE_PATIENT: ${patient.name}`, table_name: 'patients' });
    return successResponse(res, 'Patient registered successfully', patient, 201);
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    if (!supabase) return errorResponse(res, 'Database is not configured.', 503);
    const fields = ['name', 'email', 'phone', 'gender', 'date_of_birth', 'blood_type', 'address', 'emergency_contact', 'insurance_provider'];
    const updates = fields.reduce((acc, field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) acc[field] = field === 'email' ? normalizeEmail(req.body[field]) : req.body[field] || null;
      return acc;
    }, { updated_at: new Date().toISOString() });

    const { data, error } = await supabase.from('patients').update(updates).eq('id', req.params.id).select('*').single();
    if (error || !data) return errorResponse(res, 'Patient not found or update failed.', 404, error?.message);
    return successResponse(res, 'Patient updated successfully', data);
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    if (!supabase) return errorResponse(res, 'Database is not configured.', 503);
    const { start, end } = todayBounds();
    const { view, status } = req.query;
    let query = supabase.from('appointments').select(appointmentSelect).order('appointment_date', { ascending: true });
    if (view === 'today') query = query.gte('appointment_date', start).lt('appointment_date', end);
    if (view === 'upcoming') query = query.gte('appointment_date', new Date().toISOString());
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return errorResponse(res, 'Failed to retrieve appointments.', 500, error.message);
    return successResponse(res, 'Reception appointments retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

// Confirmed appointments are created only after the shared slot validator accepts the requested time.
const createAppointment = async (req, res, next) => {
  try {
    if (!supabase) return errorResponse(res, 'Database is not configured.', 503);
    const { patient_id, doctor_id, appointment_date, notes } = req.body;
    if (!patient_id || !doctor_id || !appointment_date) return errorResponse(res, 'patient_id, doctor_id, and appointment_date are required.', 400);

    const slot = await validateAppointmentSlot({ doctorId: doctor_id, appointmentDate: appointment_date });
    if (!slot.ok) return errorResponse(res, slot.message, slot.status, slot.detail);

    const { data, error } = await supabase
      .from('appointments')
      .insert({ patient_id, doctor_id, appointment_date: slot.date, status: 'Confirmed', notes: notes || null })
      .select(appointmentSelect)
      .single();

    if (error) {
      if (error.code === '23505') return errorResponse(res, 'This doctor already has an appointment at the requested time.', 409);
      return errorResponse(res, 'Failed to book appointment.', 500, error.message);
    }
    return successResponse(res, 'Appointment booked successfully', data, 201);
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    if (!supabase) return errorResponse(res, 'Database is not configured.', 503);
    const { doctor_id, appointment_date, status, notes } = req.body;
    const updates = { updated_at: new Date().toISOString() };

    if (status !== undefined) {
      if (!APPOINTMENT_STATUSES.includes(status)) return errorResponse(res, `Invalid status. Must be one of: ${APPOINTMENT_STATUSES.join(', ')}`, 400);
      updates.status = status;
    }
    if (notes !== undefined) updates.notes = notes;

    if (doctor_id || appointment_date) {
      const { data: current } = await supabase.from('appointments').select('doctor_id, appointment_date').eq('id', req.params.id).single();
      if (!current) return errorResponse(res, 'Appointment not found.', 404);
      const slot = await validateAppointmentSlot({
        doctorId: doctor_id || current.doctor_id,
        appointmentDate: appointment_date || current.appointment_date,
        excludeAppointmentId: req.params.id
      });
      if (!slot.ok) return errorResponse(res, slot.message, slot.status, slot.detail);
      updates.doctor_id = doctor_id || current.doctor_id;
      updates.appointment_date = slot.date;
    }

    const { data, error } = await supabase.from('appointments').update(updates).eq('id', req.params.id).select(appointmentSelect).single();
    if (error || !data) {
      if (error?.code === '23505') return errorResponse(res, 'Cannot reschedule: doctor already has an appointment at that time.', 409);
      return errorResponse(res, 'Appointment not found or update failed.', 404, error?.message);
    }
    return successResponse(res, 'Appointment updated successfully', data);
  } catch (error) {
    next(error);
  }
};

const checkInAppointment = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'Checked In', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(appointmentSelect)
      .single();
    if (error || !data) return errorResponse(res, 'Appointment not found or check-in failed.', 404, error?.message);
    return successResponse(res, 'Patient checked in successfully', data);
  } catch (error) {
    next(error);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(appointmentSelect)
      .single();
    if (error || !data) return errorResponse(res, 'Appointment not found or cancellation failed.', 404, error?.message);
    return successResponse(res, 'Appointment cancelled successfully', data);
  } catch (error) {
    next(error);
  }
};

const getWaitingRoom = async (req, res, next) => {
  try {
    const { start, end } = todayBounds();
    const { data, error } = await supabase
      .from('appointments')
      .select(appointmentSelect)
      .in('status', ['Checked In', 'In Consultation'])
      .gte('appointment_date', start)
      .lt('appointment_date', end)
      .order('appointment_date', { ascending: true });
    if (error) return errorResponse(res, 'Failed to retrieve waiting room.', 500, error.message);
    return successResponse(res, 'Waiting room retrieved successfully', (data || []).map((item, index) => ({ ...item, queuePosition: index + 1 })));
  } catch (error) {
    next(error);
  }
};

const getInvoices = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('invoices').select(invoiceSelect).order('created_at', { ascending: false });
    if (error) return errorResponse(res, 'Failed to retrieve invoices.', 500, error.message);
    return successResponse(res, 'Reception invoices retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const { patient_id, appointment_id, due_date, items } = req.body;
    if (!patient_id || !due_date) return errorResponse(res, 'patient_id and due_date are required.', 400);
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = Array.isArray(items) ? items.reduce((sum, item) => sum + ((Number(item.quantity) || 1) * (Number(item.unit_price) || 0)), 0) : Number(req.body.total_amount) || 0;
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({ invoice_number: invoiceNumber, patient_id, appointment_id: appointment_id || null, total_amount: totalAmount, status: 'Unpaid', due_date })
      .select(invoiceSelect)
      .single();
    if (error) return errorResponse(res, 'Failed to create invoice.', 500, error.message);

    if (Array.isArray(items) && items.length) {
      await supabase.from('invoice_items').insert(items.map((item) => ({
        invoice_id: invoice.id,
        item_name: item.item_name || 'Service',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total_price: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0)
      })));
    }
    return successResponse(res, 'Invoice created successfully', invoice, 201);
  } catch (error) {
    next(error);
  }
};

// Persist the payment first, then recalculate the invoice status from the complete payment history.
const recordPayment = async (req, res, next) => {
  try {
    const { amount, payment_method } = req.body;
    if (!amount || Number(amount) <= 0) return errorResponse(res, 'A positive payment amount is required.', 400);
    if (!PAYMENT_METHODS.includes(payment_method)) return errorResponse(res, `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}`, 400);

    const { data: invoice } = await supabase.from('invoices').select('id, total_amount').eq('id', req.params.id).single();
    if (!invoice) return errorResponse(res, 'Invoice not found.', 404);

    const { data: payment, error } = await supabase.from('payments').insert({ invoice_id: req.params.id, amount, payment_method }).select('*').single();
    if (error) return errorResponse(res, 'Failed to record payment.', 500, error.message);

    const { data: payments } = await supabase.from('payments').select('amount').eq('invoice_id', req.params.id);
    const totalPaid = (payments || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total = Number(invoice.total_amount || 0);
    const status = totalPaid >= total ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';

    await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', req.params.id);
    return successResponse(res, 'Payment recorded successfully', { payment, invoice_status: status, total_paid: totalPaid, remaining: Math.max(0, total - totalPaid) }, 201);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at, updated_at')
      .eq('id', req.user.id)
      .eq('role', 'Receptionist')
      .single();
    if (error || !data) return errorResponse(res, 'Receptionist profile not found.', 404, error?.message);
    return successResponse(res, 'Receptionist profile retrieved successfully', { ...data, phone: null });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = normalizeEmail(req.body.email);
    if (!Object.keys(updates).length) return errorResponse(res, 'No valid profile fields provided.', 400);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .eq('role', 'Receptionist')
      .select('id, name, email, role, is_active, created_at, updated_at')
      .single();
    if (error || !data) return errorResponse(res, 'Receptionist profile update failed.', 404, error?.message);
    return successResponse(res, 'Receptionist profile updated successfully', { ...data, phone: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cancelAppointment,
  checkInAppointment,
  createAppointment,
  createInvoice,
  createPatient,
  getAppointments,
  getDashboard,
  getInvoices,
  getPatients,
  getProfile,
  getWaitingRoom,
  recordPayment,
  updateAppointment,
  updatePatient,
  updateProfile
};
