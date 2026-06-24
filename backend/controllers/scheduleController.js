// Doctor availability slots used to validate bookings in reception and patient workflows.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

/**
 * GET /api/doctors/:doctorId/schedules
 * Get all schedules for a doctor
 */
const getSchedules = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', req.params.doctorId)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('[SCHEDULES] Fetch error:', error.message);
      return errorResponse(res, 'Failed to retrieve schedules.', 500);
    }

    return successResponse(res, 'Schedules retrieved successfully', data || []);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/doctors/:doctorId/schedules
 * Add a schedule slot for a doctor
 */
const setSchedule = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { day_of_week, start_time, end_time } = req.body;

    if (day_of_week === undefined || !start_time || !end_time) {
      return errorResponse(res, 'day_of_week, start_time, and end_time are required.', 400);
    }

    if (day_of_week < 0 || day_of_week > 6) {
      return errorResponse(res, 'day_of_week must be between 0 (Sunday) and 6 (Saturday).', 400);
    }

    if (start_time >= end_time) {
      return errorResponse(res, 'start_time must be before end_time.', 400);
    }

    // Reject orphaned schedules before the foreign-key error reaches the caller.
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('id', req.params.doctorId)
      .single();

    if (!doctor) {
      return errorResponse(res, 'Doctor not found.', 404);
    }

    const { data: newSchedule, error } = await supabase
      .from('doctor_schedules')
      .insert({
        doctor_id: req.params.doctorId,
        day_of_week,
        start_time,
        end_time
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SCHEDULES] Create error:', error.message);
      return errorResponse(res, 'Failed to create schedule.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_SCHEDULE: Doctor ${req.params.doctorId}, Day ${day_of_week}`,
      table_name: 'doctor_schedules'
    });

    return successResponse(res, 'Schedule created successfully', newSchedule, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/doctors/:doctorId/schedules/:id
 * Remove a schedule slot
 */
const deleteSchedule = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedSchedule, error } = await supabase
      .from('doctor_schedules')
      .delete()
      .eq('id', req.params.id)
      .eq('doctor_id', req.params.doctorId)
      .select('id')
      .single();

    if (error || !deletedSchedule) {
      return errorResponse(res, 'Schedule not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DELETE_SCHEDULE: ${req.params.id}`,
      table_name: 'doctor_schedules'
    });

    return successResponse(res, 'Schedule deleted successfully', deletedSchedule);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchedules,
  setSchedule,
  deleteSchedule
};
