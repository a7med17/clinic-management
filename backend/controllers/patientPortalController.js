// Patient portal controller. Every data set is anchored to the caller's own patient profile.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');
const { validateAppointmentSlot } = require('../services/appointmentAvailabilityService');

// These sets separate bookable/upcoming appointments from historical terminal states.
const ACTIVE_APPOINTMENT_STATUSES = ['Pending', 'Confirmed', 'Checked In', 'In Consultation'];
const FINAL_APPOINTMENT_STATUSES = ['Completed', 'Cancelled', 'No Show'];

// Backfills a minimal patient record for older accounts that predate automatic profile creation.
const getPatientRecord = async (userId) => {
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data;

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', userId)
    .eq('role', 'Patient')
    .single();

  if (!user) return null;

  const { data: created } = await supabase
    .from('patients')
    .insert({ user_id: user.id, name: user.name, email: user.email })
    .select('*')
    .single();

  return created || null;
};

// Resolves the calling patient's profile once and writes an appropriate error response when unavailable.
const requirePatient = async (req, res) => {
  if (!supabase) {
    errorResponse(res, 'Database is not configured.', 503);
    return null;
  }

  const patient = await getPatientRecord(req.user.id);
  if (!patient) {
    errorResponse(res, 'Patient profile not found for this user.', 404);
    return null;
  }
  return patient;
};

const countRows = async (table, filter) => {
  const { count, error } = await filter(supabase.from(table).select('id', { count: 'exact', head: true }));
  if (error) throw error;
  return count || 0;
};

// Relation projections keep portal responses shaped for the mobile UI without extra client requests.
const appointmentSelect = `
  *,
  doctors:doctor_id ( id, name, specialization, email, phone, consultation_fee, is_available )
`;

const labSelect = `
  *,
  doctors:doctor_id ( id, name, specialization, email, phone )
`;

// Combines the concise health summary and recent activity the patient landing screen needs.
const getDashboard = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;

    const now = new Date().toISOString();
    const [appointmentCount, upcoming, recentAppointments, recentLabs, latestLab] = await Promise.all([
      countRows('appointments', (query) => query.eq('patient_id', patient.id)),
      supabase
        .from('appointments')
        .select(appointmentSelect)
        .eq('patient_id', patient.id)
        .in('status', ACTIVE_APPOINTMENT_STATUSES)
        .gte('appointment_date', now)
        .order('appointment_date', { ascending: true })
        .limit(1),
      supabase
        .from('appointments')
        .select(appointmentSelect)
        .eq('patient_id', patient.id)
        .order('appointment_date', { ascending: false })
        .limit(3),
      supabase
        .from('lab_tests')
        .select(labSelect)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('lab_tests')
        .select(labSelect)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(1)
    ]);

    const failed = [upcoming, recentAppointments, recentLabs, latestLab].find((result) => result.error);
    if (failed) return errorResponse(res, 'Failed to retrieve patient dashboard.', 500, failed.error.message);

    return successResponse(res, 'Patient dashboard retrieved successfully', {
      patient,
      appointmentCount,
      upcomingAppointment: upcoming.data?.[0] || null,
      latestLabResult: latestLab.data?.[0] || null,
      healthSummary: {
        bloodType: patient.blood_type,
        allergies: patient.allergies,
        medicalConditions: patient.medical_conditions,
        emergencyContact: patient.emergency_contact
      },
      recentActivity: {
        appointments: recentAppointments.data || [],
        labResults: recentLabs.data || []
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;

    const { view, status } = req.query;
    const now = new Date().toISOString();
    let query = supabase
      .from('appointments')
      .select(appointmentSelect)
      .eq('patient_id', patient.id)
      .order('appointment_date', { ascending: view !== 'past' });

    if (view === 'upcoming') query = query.gte('appointment_date', now);
    if (view === 'past') query = query.lt('appointment_date', now);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return errorResponse(res, 'Failed to retrieve appointments.', 500, error.message);
    return successResponse(res, 'Patient appointments retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;

    const { doctor_id, appointment_date, notes } = req.body;
    if (!doctor_id || !appointment_date) {
      return errorResponse(res, 'doctor_id and appointment_date are required.', 400);
    }

    const slot = await validateAppointmentSlot({ doctorId: doctor_id, appointmentDate: appointment_date });
    if (!slot.ok) return errorResponse(res, slot.message, slot.status, slot.detail);

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: patient.id,
        doctor_id,
        appointment_date: slot.date,
        status: 'Pending',
        notes: notes || null
      })
      .select(appointmentSelect)
      .single();

    if (error) {
      if (error.code === '23505') return errorResponse(res, 'This appointment slot is unavailable.', 409);
      return errorResponse(res, 'Failed to book appointment.', 500, error.message);
    }

    return successResponse(res, 'Appointment booked successfully', data, 201);
  } catch (error) {
    next(error);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;

    const { data: appointment, error: findError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .eq('patient_id', patient.id)
      .maybeSingle();

    if (findError) return errorResponse(res, 'Failed to retrieve appointment.', 500, findError.message);
    if (!appointment) return errorResponse(res, 'Appointment not found.', 404);
    if (FINAL_APPOINTMENT_STATUSES.includes(appointment.status)) {
      return errorResponse(res, `Cannot cancel an appointment with status ${appointment.status}.`, 409);
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointment.id)
      .select(appointmentSelect)
      .single();

    if (error) return errorResponse(res, 'Failed to cancel appointment.', 500, error.message);
    return successResponse(res, 'Appointment cancelled successfully', data);
  } catch (error) {
    next(error);
  }
};

const getRecords = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;

    const [appointments, labs] = await Promise.all([
      supabase
        .from('appointments')
        .select(appointmentSelect)
        .eq('patient_id', patient.id)
        .order('appointment_date', { ascending: false }),
      supabase
        .from('lab_tests')
        .select(labSelect)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
    ]);

    if (appointments.error) return errorResponse(res, 'Failed to retrieve appointment history.', 500, appointments.error.message);
    if (labs.error) return errorResponse(res, 'Failed to retrieve lab history.', 500, labs.error.message);

    return successResponse(res, 'Patient records retrieved successfully', {
      profile: patient,
      appointmentHistory: appointments.data || [],
      labResults: labs.data || []
    });
  } catch (error) {
    next(error);
  }
};

const getLabResults = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;

    const { data, error } = await supabase
      .from('lab_tests')
      .select(labSelect)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });

    if (error) return errorResponse(res, 'Failed to retrieve lab results.', 500, error.message);
    return successResponse(res, 'Patient lab results retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;
    return successResponse(res, 'Patient profile retrieved successfully', {
      ...patient,
      role: req.user.role,
      status: 'Active'
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const patient = await requirePatient(req, res);
    if (!patient) return;

    const allowedFields = [
      'name',
      'email',
      'phone',
      'gender',
      'date_of_birth',
      'blood_type',
      'address',
      'emergency_contact',
      'allergies',
      'medical_conditions',
      'insurance_provider'
    ];

    const updates = allowedFields.reduce((acc, field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) acc[field] = req.body[field] || null;
      return acc;
    }, {});

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 'No valid profile fields provided.', 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patient.id)
      .select('*')
      .single();

    if (error) return errorResponse(res, 'Failed to update patient profile.', 500, error.message);
    return successResponse(res, 'Patient profile updated successfully', {
      ...data,
      role: req.user.role,
      status: 'Active'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cancelAppointment,
  createAppointment,
  getAppointments,
  getDashboard,
  getLabResults,
  getProfile,
  getRecords,
  updateProfile
};
