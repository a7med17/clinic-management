const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

/**
 * GET /api/doctors
 * List all doctors
 */
const getAllDoctors = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('doctors')
      .select('*')
      .order('name', { ascending: true });

    // Optional filters
    if (req.query.specialization) {
      query = query.ilike('specialization', `%${req.query.specialization}%`);
    }
    if (req.query.is_available !== undefined) {
      query = query.eq('is_available', req.query.is_available === 'true');
    }
    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,specialization.ilike.%${req.query.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DOCTORS] Fetch error:', error.message);
      return errorResponse(res, 'Failed to retrieve doctors.', 500);
    }

    return successResponse(res, 'Doctors retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/doctors/:id
 * Get a single doctor with their schedules
 */
const getDoctorById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !doctor) {
      return errorResponse(res, 'Doctor not found.', 404);
    }

    // Fetch schedules for this doctor
    const { data: schedules } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctor.id)
      .order('day_of_week', { ascending: true });

    return successResponse(res, 'Doctor retrieved successfully', {
      ...doctor,
      schedules: schedules || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/doctors
 * Create a new doctor
 */
const createDoctor = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { name, specialization, license_number, email, phone, consultation_fee, user_id } = req.body;

    if (!name || !specialization) {
      return errorResponse(res, 'Name and specialization are required.', 400);
    }

    const insertData = {
      name: name.trim(),
      specialization: specialization.trim(),
      license_number: license_number || null,
      email: email ? email.toLowerCase().trim() : null,
      phone: phone || null,
      consultation_fee: consultation_fee || null,
      user_id: user_id || null
    };

    const { data: newDoctor, error } = await supabase
      .from('doctors')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[DOCTORS] Create error:', error.message);
      if (error.message.includes('doctors_email_unique')) {
        return errorResponse(res, 'A doctor with this email already exists.', 409);
      }
      return errorResponse(res, 'Failed to create doctor.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_DOCTOR: ${newDoctor.name}`,
      table_name: 'doctors'
    });

    return successResponse(res, 'Doctor created successfully', newDoctor, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/doctors/:id
 * Update a doctor
 */
const updateDoctor = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { name, specialization, license_number, email, phone, consultation_fee, is_available } = req.body;
    const updateData = { updated_at: new Date().toISOString() };

    if (name !== undefined) updateData.name = name.trim();
    if (specialization !== undefined) updateData.specialization = specialization.trim();
    if (license_number !== undefined) updateData.license_number = license_number;
    if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
    if (phone !== undefined) updateData.phone = phone;
    if (consultation_fee !== undefined) updateData.consultation_fee = consultation_fee;
    if (is_available !== undefined) updateData.is_available = is_available;

    const { data: updatedDoctor, error } = await supabase
      .from('doctors')
      .update(updateData)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !updatedDoctor) {
      if (error && error.message.includes('doctors_email_unique')) {
        return errorResponse(res, 'A doctor with this email already exists.', 409);
      }
      return errorResponse(res, 'Doctor not found or update failed.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `UPDATE_DOCTOR: ${updatedDoctor.name}`,
      table_name: 'doctors'
    });

    return successResponse(res, 'Doctor updated successfully', updatedDoctor);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/doctors/:id
 * Delete a doctor
 */
const deleteDoctor = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedDoctor, error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', req.params.id)
      .select('id, name')
      .single();

    if (error || !deletedDoctor) {
      return errorResponse(res, 'Doctor not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DELETE_DOCTOR: ${deletedDoctor.name}`,
      table_name: 'doctors'
    });

    return successResponse(res, 'Doctor deleted successfully', deletedDoctor);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
