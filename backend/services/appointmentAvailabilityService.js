const { supabase } = require('../config/supabase');

/**
 * Validates the single source of truth for appointment availability before an insert or reschedule.
 * The database unique index remains the final concurrency safeguard against double booking.
 */
const validateAppointmentSlot = async ({ doctorId, appointmentDate, excludeAppointmentId = null }) => {
  if (!supabase) {
    return { ok: false, status: 503, message: 'Database is not configured.' };
  }

  const date = new Date(appointmentDate);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, status: 400, message: 'appointment_date must be a valid date.' };
  }

  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('id, name, is_available')
    .eq('id', doctorId)
    .single();

  if (doctorError || !doctor) return { ok: false, status: 404, message: 'Doctor not found.' };
  if (doctor.is_available === false) return { ok: false, status: 409, message: 'Doctor is not currently available.' };

  const day = date.getDay();
  const time = date.toTimeString().slice(0, 8);
  const { data: schedules, error: scheduleError } = await supabase
    .from('doctor_schedules')
    .select('start_time, end_time')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', day);

  if (scheduleError) return { ok: false, status: 500, message: 'Failed to verify doctor schedule.', detail: scheduleError.message };

  if (schedules?.length) {
    const withinSchedule = schedules.some((slot) => time >= slot.start_time && time < slot.end_time);
    if (!withinSchedule) return { ok: false, status: 409, message: 'Appointment is outside this doctor schedule.' };
  } else if (time < '08:00:00' || time >= '17:00:00') {
    return { ok: false, status: 409, message: 'Appointment is outside working hours.' };
  }

  let duplicateQuery = supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date.toISOString())
    .neq('status', 'Cancelled')
    .limit(1);

  if (excludeAppointmentId) duplicateQuery = duplicateQuery.neq('id', excludeAppointmentId);
  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();

  if (duplicateError) return { ok: false, status: 500, message: 'Failed to verify appointment availability.', detail: duplicateError.message };
  if (duplicate) return { ok: false, status: 409, message: 'This doctor already has an appointment at the requested time.' };

  return { ok: true, date: date.toISOString(), doctor };
};

module.exports = { validateAppointmentSlot };
