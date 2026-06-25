// Doctor portal controller. Every query starts from the authenticated doctor's linked profile.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

// Shared status vocabularies prevent invalid state updates from reaching the database.
const STATUSES = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
const LAB_STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled'];
const CONSULTATION_NOTE_SCHEMA = 'medicore.consultation.v1';
const CONSULTATION_FIELDS = ['chief_complaint', 'symptoms', 'diagnosis_summary', 'treatment_plan', 'doctor_notes'];

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

const emptyConsultation = () => ({
  chief_complaint: '',
  symptoms: '',
  diagnosis_summary: '',
  treatment_plan: '',
  doctor_notes: ''
});

const parseConsultationNotes = (doctorNotes) => {
  if (!doctorNotes || typeof doctorNotes !== 'string') return emptyConsultation();

  try {
    const parsed = JSON.parse(doctorNotes);
    if (parsed?.schema !== CONSULTATION_NOTE_SCHEMA) {
      return { ...emptyConsultation(), doctor_notes: doctorNotes };
    }

    return CONSULTATION_FIELDS.reduce((consultation, field) => {
      consultation[field] = typeof parsed[field] === 'string' ? parsed[field] : '';
      return consultation;
    }, emptyConsultation());
  } catch (error) {
    return { ...emptyConsultation(), doctor_notes: doctorNotes };
  }
};

const mergeConsultationInput = (existingNotes, body) => {
  const consultation = parseConsultationNotes(existingNotes);

  CONSULTATION_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
      consultation[field] = typeof body[field] === 'string' ? body[field].trim() : '';
    }
  });

  return consultation;
};

const serializeConsultationNotes = (consultation) => JSON.stringify({
  schema: CONSULTATION_NOTE_SCHEMA,
  ...consultation
});

const consultationResponse = (appointment) => {
  const consultation = parseConsultationNotes(appointment.doctor_notes);
  const safeAppointment = { ...appointment, doctor_notes: consultation.doctor_notes };

  return {
    appointment: safeAppointment,
    consultation: {
      id: appointment.id,
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      status: appointment.status === 'Completed' ? 'Completed' : 'Draft',
      updated_at: appointment.updated_at,
      ...consultation
    }
  };
};

const persistConsultation = async (req, res, next, complete) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;

    const { data: existing, error: existingError } = await supabase
      .from('appointments')
      .select(appointmentSelect)
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .single();
    if (existingError || !existing) return errorResponse(res, 'Appointment not found.', 404);
    if (existing.status === 'Completed' && !complete) return errorResponse(res, 'Completed consultations cannot be edited in this workflow.', 400);

    const consultation = mergeConsultationInput(existing.doctor_notes, req.body);
    const update = {
      doctor_notes: serializeConsultationNotes(consultation),
      updated_at: new Date().toISOString()
    };
    if (complete) update.status = 'Completed';

    const { data, error } = await supabase
      .from('appointments')
      .update(update)
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .select(appointmentSelect)
      .single();
    if (error || !data) return errorResponse(res, 'Failed to save consultation.', 500, error?.message);

    return successResponse(
      res,
      complete ? 'Consultation completed successfully' : 'Consultation saved successfully',
      consultationResponse(data)
    );
  } catch (error) {
    next(error);
  }
};

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

const getConsultation = async (req, res, next) => {
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
    return successResponse(res, 'Consultation retrieved successfully', consultationResponse(data));
  } catch (error) {
    next(error);
  }
};

const saveConsultation = (req, res, next) => persistConsultation(req, res, next, false);

const completeConsultation = (req, res, next) => persistConsultation(req, res, next, true);

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

const getPatientConsultations = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(appointmentSelect)
      .eq('doctor_id', doctor.id)
      .eq('patient_id', req.params.patientId)
      .neq('doctor_notes', null)
      .neq('doctor_notes', '')
      .order('appointment_date', { ascending: false });
    if (error) return errorResponse(res, 'Failed to retrieve consultation history.', 500, error.message);

    const consultations = (appointments || []).map((appointment) => {
      const parsed = parseConsultationNotes(appointment.doctor_notes);
      return {
        id: appointment.id,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        appointment_date: appointment.appointment_date,
        status: appointment.status === 'Completed' ? 'Completed' : 'Draft',
        updated_at: appointment.updated_at,
        chief_complaint: parsed.chief_complaint,
        diagnosis_summary: parsed.diagnosis_summary,
        symptoms: parsed.symptoms,
        treatment_plan: parsed.treatment_plan,
        doctor_notes: parsed.doctor_notes,
        patient: appointment.patients,
        doctor: appointment.doctors
      };
    });

    return successResponse(res, 'Patient consultations retrieved successfully', consultations);
  } catch (error) {
    next(error);
  }
};

const getPrescription = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;

    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, patient_id')
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .single();
    if (apptError || !appointment) return errorResponse(res, 'Appointment not found.', 404);

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select('*, prescription_items:prescription_items(*)')
      .eq('appointment_id', req.params.id)
      .maybeSingle();
    if (error) return errorResponse(res, 'Failed to retrieve prescription.', 500, error.message);
    if (!prescription) return errorResponse(res, 'No prescription found for this appointment.', 404);

    return successResponse(res, 'Prescription retrieved successfully', prescription);
  } catch (error) {
    next(error);
  }
};

const savePrescription = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;

    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, patient_id')
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .single();
    if (apptError || !appointment) return errorResponse(res, 'Appointment not found.', 404);

    const { notes, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'At least one prescription item is required.', 400);
    }
    for (const item of items) {
      if (!item.medicine_name || !item.dosage || !item.frequency || !item.duration) {
        return errorResponse(res, 'Each item requires medicine_name, dosage, frequency, and duration.', 400);
      }
    }

    const { data: existing } = await supabase
      .from('prescriptions')
      .select('id, status')
      .eq('appointment_id', req.params.id)
      .maybeSingle();
    if (existing?.status === 'Finalized') return errorResponse(res, 'Finalized prescriptions cannot be edited.', 400);

    let prescriptionId = existing?.id;

    if (prescriptionId) {
      await supabase.from('prescriptions').update({ notes, updated_at: new Date().toISOString() }).eq('id', prescriptionId);
      await supabase.from('prescription_items').delete().eq('prescription_id', prescriptionId);
    } else {
      const { data: created, error: createError } = await supabase
        .from('prescriptions')
        .insert({ appointment_id: req.params.id, patient_id: appointment.patient_id, doctor_id: doctor.id, notes, status: 'Draft' })
        .select('id')
        .single();
      if (createError || !created) return errorResponse(res, 'Failed to create prescription.', 500, createError?.message);
      prescriptionId = created.id;
    }

    const rows = items.map((item) => ({
      prescription_id: prescriptionId,
      medicine_id: item.medicine_id || null,
      medicine_name: item.medicine_name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions || ''
    }));
    const { error: insertError } = await supabase.from('prescription_items').insert(rows);
    if (insertError) return errorResponse(res, 'Failed to save prescription items.', 500, insertError.message);

    const { data: result, error: fetchError } = await supabase
      .from('prescriptions')
      .select('*, prescription_items:prescription_items(*)')
      .eq('id', prescriptionId)
      .single();
    if (fetchError) return errorResponse(res, 'Prescription saved but failed to reload.', 500, fetchError.message);

    return successResponse(res, 'Prescription saved successfully', result);
  } catch (error) {
    next(error);
  }
};

const finalizePrescription = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select('*, prescription_items:prescription_items(*)')
      .eq('id', req.params.id)
      .single();
    if (error || !prescription) return errorResponse(res, 'Prescription not found.', 404);
    if (prescription.doctor_id !== doctor.id) return errorResponse(res, 'Prescription not found.', 404);
    if (prescription.status === 'Finalized') return errorResponse(res, 'Prescription is already finalized.', 400);
    if (!prescription.prescription_items?.length) return errorResponse(res, 'Cannot finalize a prescription with no items.', 400);

    const { data: updated, error: updateError } = await supabase
      .from('prescriptions')
      .update({ status: 'Finalized', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, prescription_items:prescription_items(*)')
      .single();
    if (updateError) return errorResponse(res, 'Failed to finalize prescription.', 500, updateError.message);

    return successResponse(res, 'Prescription finalized successfully', updated);
  } catch (error) {
    next(error);
  }
};

const getPatientPrescriptions = async (req, res, next) => {
  try {
    const doctor = await requireDoctor(req, res);
    if (!doctor) return;

    const { data: hasAccess } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor.id)
      .eq('patient_id', req.params.patientId)
      .limit(1)
      .maybeSingle();
    if (!hasAccess) return errorResponse(res, 'Patient not assigned to this doctor.', 403);

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, prescription_items:prescription_items(*)')
      .eq('patient_id', req.params.patientId)
      .order('created_at', { ascending: false });
    if (error) return errorResponse(res, 'Failed to retrieve patient prescriptions.', 500, error.message);

    return successResponse(res, 'Patient prescriptions retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAppointments,
  getAppointment,
  getConsultation,
  saveConsultation,
  completeConsultation,
  updateAppointmentStatus,
  updateAppointmentNotes,
  getPatients,
  getPatient,
  getPatientConsultations,
  getLabTests,
  createLabTest,
  getProfile,
  getPrescription,
  savePrescription,
  finalizePrescription,
  getPatientPrescriptions
};
