// Doctor portal controller. Every query starts from the authenticated doctor's linked profile.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

// Shared status vocabularies prevent invalid state updates from reaching the database.
const STATUSES = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
const LAB_STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled'];

// Daily metrics use a [start, next-day) window to avoid time-boundary double counting.
const todayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

// Backfills a minimal doctor record for older accounts created before profile provisioning existed.
const getDoctorRecord = async (userId) => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return data;

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', userId)
    .eq('role', 'Doctor')
    .single();
  if (!user) return null;

  const { data: created, error: createError } = await supabase
    .from('doctors')
    .insert({
      user_id: user.id,
      name: user.name,
      email: user.email,
      specialization: 'General Practice'
    })
    .select('*')
    .single();
  if (createError || !created) return null;
  return created;
};

const countRows = async (table, filter) => {
  const { count, error } = await filter(supabase.from(table).select('id', { count: 'exact', head: true }));
  if (error) throw error;
  return count || 0;
};

// Resolves the calling doctor's profile once and writes an appropriate error response when unavailable.
const requireDoctor = async (req, res) => {
  if (!supabase) {
    errorResponse(res, 'Database is not configured.', 503);
    return null;
  }
  const doctor = await getDoctorRecord(req.user.id);
  if (!doctor) {
    errorResponse(res, 'Doctor profile not found for this user.', 404);
    return null;
  }
  return doctor;
};

// Reusable relation projection keeps appointment responses consistent across portal screens.
const appointmentSelect = `
  *,
  patients:patient_id (
    id, name, email, phone, gender, date_of_birth, blood_type,
    address, emergency_contact, allergies, medical_conditions, insurance_provider
  ),
  doctors:doctor_id ( id, name, specialization, email, phone, consultation_fee, is_available )
`;

// Compose dashboard counts and the next few appointments in parallel for a single doctor.
const getDashboard = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { start, end } = todayBounds();

    const [todaysAppointments, pendingConsultations, patientQueue, labRequests, completedToday, upcoming] = await Promise.all([
      countRows('appointments', (query) => query.eq('doctor_id', doctor.id).gte('appointment_date', start).lt('appointment_date', end)),
      countRows('appointments', (query) => query.eq('doctor_id', doctor.id).in('status', ['Pending', 'Confirmed', 'Checked In', 'In Consultation'])),
      countRows('appointments', (query) => query.eq('doctor_id', doctor.id).in('status', ['Checked In', 'In Consultation']).gte('appointment_date', start).lt('appointment_date', end)),
      countRows('lab_tests', (query) => query.eq('doctor_id', doctor.id)),
      countRows('appointments', (query) => query.eq('doctor_id', doctor.id).eq('status', 'Completed').gte('appointment_date', start).lt('appointment_date', end)),
      supabase
        .from('appointments')
        .select(appointmentSelect)
        .eq('doctor_id', doctor.id)
        .gte('appointment_date', start)
        .order('appointment_date', { ascending: true })
        .limit(3)
    ]);

    if (upcoming.error) return errorResponse(res, 'Failed to retrieve dashboard schedule.', 500, upcoming.error.message);

    return successResponse(res, 'Doctor dashboard retrieved successfully', {
      doctor,
      metrics: { todaysAppointments, pendingConsultations, patientQueue, labRequests, completedToday },
      upcomingAppointments: upcoming.data || []
    });
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { start, end } = todayBounds();
    const { view, status } = req.query;

    let query = supabase
      .from('appointments')
      .select(appointmentSelect)
      .eq('doctor_id', doctor.id)
      .order('appointment_date', { ascending: true });

    if (view === 'today') query = query.gte('appointment_date', start).lt('appointment_date', end);
    if (view === 'upcoming') query = query.gte('appointment_date', start);
    if (status && STATUSES.includes(status)) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return errorResponse(res, 'Failed to retrieve appointments.', 500, error.message);
    return successResponse(res, 'Doctor appointments retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

const getAppointment = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { data, error } = await supabase
      .from('appointments')
      .select(appointmentSelect)
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .single();
    if (error || !data) return errorResponse(res, 'Appointment not found.', 404);
    return successResponse(res, 'Doctor appointment retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

const updateAppointmentStatus = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { status } = req.body;
    if (!STATUSES.includes(status)) return errorResponse(res, `Invalid status. Must be one of: ${STATUSES.join(', ')}`, 400);

    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .select(appointmentSelect)
      .single();
    if (error || !data) return errorResponse(res, 'Appointment not found or status update failed.', 404);
    return successResponse(res, 'Appointment status updated successfully', data);
  } catch (error) {
    next(error);
  }
};

const updateAppointmentNotes = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { doctor_notes, complete } = req.body;

    const { data: existing, error: existingError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .single();
    if (existingError || !existing) return errorResponse(res, 'Appointment not found.', 404);
    if (existing.status === 'Completed' && !complete) return errorResponse(res, 'Completed consultation notes cannot be edited here.', 400);

    const update = { doctor_notes: doctor_notes || '', updated_at: new Date().toISOString() };
    if (complete) update.status = 'Completed';

    const { data, error } = await supabase
      .from('appointments')
      .update(update)
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .select(appointmentSelect)
      .single();
    if (error || !data) return errorResponse(res, 'Failed to save consultation notes.', 500, error?.message);
    return successResponse(res, 'Consultation notes saved successfully', data);
  } catch (error) {
    next(error);
  }
};

const patientSelect = `
  id, user_id, name, email, phone, gender, date_of_birth, blood_type,
  address, emergency_contact, allergies, medical_conditions, insurance_provider,
  created_at, updated_at
`;

const getPatients = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`patient_id, patients:patient_id (${patientSelect})`)
      .eq('doctor_id', doctor.id)
      .order('appointment_date', { ascending: false });
    if (error) return errorResponse(res, 'Failed to retrieve assigned patients.', 500, error.message);

    const map = new Map();
    (appointments || []).forEach((appointment) => {
      if (appointment.patients) map.set(appointment.patient_id, appointment.patients);
    });
    return successResponse(res, 'Doctor patients retrieved successfully', Array.from(map.values()));
  } catch (error) {
    next(error);
  }
};

const getPatient = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`*, patients:patient_id (${patientSelect})`)
      .eq('doctor_id', doctor.id)
      .eq('patient_id', req.params.id)
      .order('appointment_date', { ascending: false });
    if (error) return errorResponse(res, 'Failed to retrieve patient profile.', 500, error.message);
    if (!appointments?.length || !appointments[0].patients) return errorResponse(res, 'Patient not assigned to this doctor.', 404);
    return successResponse(res, 'Doctor patient retrieved successfully', {
      patient: appointments[0].patients,
      appointmentHistory: appointments
    });
  } catch (error) {
    next(error);
  }
};

const getLabTests = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    let query = supabase
      .from('lab_tests')
      .select(`*, patients:patient_id ( id, name, email, phone )`)
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false });
    if (req.query.status && LAB_STATUSES.includes(req.query.status)) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) return errorResponse(res, 'Failed to retrieve lab tests.', 500, error.message);
    return successResponse(res, 'Doctor lab tests retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

const createLabTest = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { patient_id, test_name } = req.body;
    if (!patient_id || typeof test_name !== 'string' || !test_name.trim()) {
      return errorResponse(res, 'patient_id and a non-empty test_name are required.', 400);
    }

    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor.id)
      .eq('patient_id', patient_id)
      .limit(1)
      .maybeSingle();
    if (!appointment) return errorResponse(res, 'Patient is not assigned to this doctor.', 403);

    const { data, error } = await supabase
      .from('lab_tests')
      .insert({ patient_id, doctor_id: doctor.id, test_name: test_name.trim(), status: 'Pending' })
      .select(`*, patients:patient_id ( id, name, email, phone )`)
      .single();
    if (error) return errorResponse(res, 'Failed to create lab request.', 500, error.message);
    return successResponse(res, 'Lab request created successfully', data, 201);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('id', req.user.id)
      .single();
    return successResponse(res, 'Doctor profile retrieved successfully', { ...doctor, user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAppointments,
  getAppointment,
  updateAppointmentStatus,
  updateAppointmentNotes,
  getPatients,
  getPatient,
  getLabTests,
  createLabTest,
  getProfile
};
