// Shared appointment resource controller. Portal controllers provide role-specific views over the same table.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');
const { validateAppointmentSlot } = require('../services/appointmentAvailabilityService');

// Translate an authenticated user id into the patient/doctor record id stored on appointments.
const getLinkedRecordId = async (table, userId) => {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .single();
  return error ? null : data?.id || null;
};

// Enforce ownership for patient/doctor reads while allowing operational staff to manage appointments.
const canAccessAppointment = async (user, appointment) => {
  if (user.role === 'Admin' || user.role === 'Receptionist') return true;
  if (user.role === 'Patient') {
    return appointment.patient_id === await getLinkedRecordId('patients', user.id);
  }
  if (user.role === 'Doctor') {
    return appointment.doctor_id === await getLinkedRecordId('doctors', user.id);
  }
  return false;
};

/**
 * GET /api/appointments
 * List all appointments with patient and doctor names
 */
const getAllAppointments = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id ( id, name, email, phone ),
        doctors:doctor_id ( id, name, specialization )
      `)
      .order('appointment_date', { ascending: false });

    // Optional filters
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    if (req.query.doctor_id) {
      query = query.eq('doctor_id', req.query.doctor_id);
    }
    if (req.query.patient_id) {
      query = query.eq('patient_id', req.query.patient_id);
    }
    if (req.query.date_from) {
      query = query.gte('appointment_date', req.query.date_from);
    }
    if (req.query.date_to) {
      query = query.lte('appointment_date', req.query.date_to);
    }

    // Scope by role
    if (req.user.role === 'Patient') {
      // Find this patient's record to get patient_id
      const patientId = await getLinkedRecordId('patients', req.user.id);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else {
        return successResponse(res, 'No appointments found', []);
      }
    } else if (req.user.role === 'Doctor') {
      const doctorId = await getLinkedRecordId('doctors', req.user.id);

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      } else {
        return successResponse(res, 'No appointments found', []);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[APPOINTMENTS] Fetch error:', error.message);
      return errorResponse(res, 'Failed to retrieve appointments.', 500);
    }

    return successResponse(res, 'Appointments retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/appointments/:id
 * Get a single appointment with full details
 */
const getAppointmentById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id ( id, name, email, phone, gender, date_of_birth, blood_type ),
        doctors:doctor_id ( id, name, specialization, consultation_fee )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !appointment) {
      return errorResponse(res, 'Appointment not found.', 404);
    }

    if (!await canAccessAppointment(req.user, appointment)) {
      return errorResponse(res, 'You are not authorized to access this appointment.', 403);
    }

    return successResponse(res, 'Appointment retrieved successfully', appointment);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/appointments
 * Create a new appointment
 * The unique_doctor_timeslot index prevents double booking automatically
 */
const createAppointment = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { patient_id, doctor_id, appointment_date, notes } = req.body;

    if (!patient_id || !doctor_id || !appointment_date) {
      return errorResponse(res, 'patient_id, doctor_id, and appointment_date are required.', 400);
    }

    if (req.user.role === 'Patient') {
      const ownPatientId = await getLinkedRecordId('patients', req.user.id);
      if (!ownPatientId || ownPatientId !== patient_id) {
        return errorResponse(res, 'Patients can only book appointments for their own profile.', 403);
      }
    }

    // Verify patient exists
    const { data: patient } = await supabase
      .from('patients')
      .select('id, name')
      .eq('id', patient_id)
      .single();

    if (!patient) {
      return errorResponse(res, 'Patient not found.', 404);
    }

    const slot = await validateAppointmentSlot({ doctorId: doctor_id, appointmentDate: appointment_date });
    if (!slot.ok) return errorResponse(res, slot.message, slot.status, slot.detail);

    const { data: newAppointment, error } = await supabase
      .from('appointments')
      .insert({
        patient_id,
        doctor_id,
        appointment_date: slot.date,
        status: 'Pending',
        notes: notes || null
      })
      .select(`
        *,
        patients:patient_id ( id, name ),
        doctors:doctor_id ( id, name, specialization )
      `)
      .single();

    if (error) {
      console.error('[APPOINTMENTS] Create error:', error.message);
      // Handle the unique constraint violation for double booking
      if (error.message.includes('unique_doctor_timeslot') || error.code === '23505') {
        return errorResponse(res, 'This doctor already has an appointment at the requested time.', 409);
      }
      return errorResponse(res, 'Failed to create appointment.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_APPOINTMENT: Patient ${patient.name} with Doctor ${slot.doctor.name}`,
      table_name: 'appointments'
    });

    return successResponse(res, 'Appointment created successfully', newAppointment, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/appointments/:id
 * Update appointment status, notes, doctor_notes
 */
const updateAppointment = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { status, notes, doctor_notes, appointment_date } = req.body;
    const updateData = { updated_at: new Date().toISOString() };

    const { data: existingAppointment, error: existingError } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .eq('id', req.params.id)
      .single();

    if (existingError || !existingAppointment) {
      return errorResponse(res, 'Appointment not found.', 404);
    }
    if (!await canAccessAppointment(req.user, existingAppointment)) {
      return errorResponse(res, 'You are not authorized to update this appointment.', 403);
    }

    if (status !== undefined) {
      const validStatuses = ['Pending', 'Confirmed', 'Checked In', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
      if (!validStatuses.includes(status)) {
        return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
      }
      updateData.status = status;
    }
    if (notes !== undefined) updateData.notes = notes;
    if (doctor_notes !== undefined) updateData.doctor_notes = doctor_notes;
    if (appointment_date !== undefined) {
      const slot = await validateAppointmentSlot({
        doctorId: existingAppointment.doctor_id,
        appointmentDate: appointment_date,
        excludeAppointmentId: existingAppointment.id
      });
      if (!slot.ok) return errorResponse(res, slot.message, slot.status, slot.detail);
      updateData.appointment_date = slot.date;
    }

    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        patients:patient_id ( id, name ),
        doctors:doctor_id ( id, name )
      `)
      .single();

    if (error || !updatedAppointment) {
      if (error && (error.message.includes('unique_doctor_timeslot') || error.code === '23505')) {
        return errorResponse(res, 'Cannot reschedule: doctor already has an appointment at that time.', 409);
      }
      return errorResponse(res, 'Appointment not found or update failed.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `UPDATE_APPOINTMENT: ${req.params.id} → ${status || 'updated'}`,
      table_name: 'appointments'
    });

    return successResponse(res, 'Appointment updated successfully', updatedAppointment);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/appointments/:id
 * Delete an appointment
 */
const deleteAppointment = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedAppointment, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .single();

    if (error || !deletedAppointment) {
      return errorResponse(res, 'Appointment not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DELETE_APPOINTMENT: ${req.params.id}`,
      table_name: 'appointments'
    });

    return successResponse(res, 'Appointment deleted successfully', deletedAppointment);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
