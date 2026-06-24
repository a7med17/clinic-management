// Shared patient directory CRUD. Patient callers are restricted to their own linked profile.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

/**
 * GET /api/patients
 * List all patients
 */
const getAllPatients = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    // Optional filters
    if (req.query.gender) {
      query = query.eq('gender', req.query.gender);
    }
    if (req.query.blood_type) {
      query = query.eq('blood_type', req.query.blood_type);
    }
    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,email.ilike.%${req.query.search}%,phone.ilike.%${req.query.search}%`);
    }

    // If the user is a Patient, they can only see their own record
    if (req.user.role === 'Patient') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PATIENTS] Fetch error:', error.message);
      return errorResponse(res, 'Failed to retrieve patients.', 500);
    }

    return successResponse(res, 'Patients retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients/:id
 * Get a single patient
 */
const getPatientById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('patients')
      .select('*')
      .eq('id', req.params.id);

    // Patients can only view their own record
    if (req.user.role === 'Patient') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: patient, error } = await query.single();

    if (error || !patient) {
      return errorResponse(res, 'Patient not found.', 404);
    }

    return successResponse(res, 'Patient retrieved successfully', patient);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/patients
 * Create a new patient
 */
const createPatient = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const {
      name, email, phone, gender, date_of_birth,
      blood_type, address, emergency_contact,
      allergies, medical_conditions, insurance_provider, user_id
    } = req.body;

    if (!name) {
      return errorResponse(res, 'Patient name is required.', 400);
    }

    const insertData = {
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : null,
      phone: phone || null,
      gender: gender || 'Unspecified',
      date_of_birth: date_of_birth || null,
      blood_type: blood_type || null,
      address: address || null,
      emergency_contact: emergency_contact || null,
      allergies: allergies || null,
      medical_conditions: medical_conditions || null,
      insurance_provider: insurance_provider || null,
      user_id: user_id || null
    };

    const { data: newPatient, error } = await supabase
      .from('patients')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[PATIENTS] Create error:', error.message);
      if (error.message.includes('patients_email_unique')) {
        return errorResponse(res, 'A patient with this email already exists.', 409);
      }
      return errorResponse(res, 'Failed to create patient.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_PATIENT: ${newPatient.name}`,
      table_name: 'patients'
    });

    return successResponse(res, 'Patient created successfully', newPatient, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/patients/:id
 * Update a patient
 */
const updatePatient = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const {
      name, email, phone, gender, date_of_birth,
      blood_type, address, emergency_contact,
      allergies, medical_conditions, insurance_provider
    } = req.body;

    const updateData = { updated_at: new Date().toISOString() };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (blood_type !== undefined) updateData.blood_type = blood_type;
    if (address !== undefined) updateData.address = address;
    if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (medical_conditions !== undefined) updateData.medical_conditions = medical_conditions;
    if (insurance_provider !== undefined) updateData.insurance_provider = insurance_provider;

    let query = supabase
      .from('patients')
      .update(updateData)
      .eq('id', req.params.id);

    // Patients can only update their own record
    if (req.user.role === 'Patient') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: updatedPatient, error } = await query.select('*').single();

    if (error || !updatedPatient) {
      if (error && error.message.includes('patients_email_unique')) {
        return errorResponse(res, 'A patient with this email already exists.', 409);
      }
      return errorResponse(res, 'Patient not found or update failed.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `UPDATE_PATIENT: ${updatedPatient.name}`,
      table_name: 'patients'
    });

    return successResponse(res, 'Patient updated successfully', updatedPatient);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/patients/:id
 * Delete a patient
 */
const deletePatient = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedPatient, error } = await supabase
      .from('patients')
      .delete()
      .eq('id', req.params.id)
      .select('id, name')
      .single();

    if (error || !deletedPatient) {
      return errorResponse(res, 'Patient not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DELETE_PATIENT: ${deletedPatient.name}`,
      table_name: 'patients'
    });

    return successResponse(res, 'Patient deleted successfully', deletedPatient);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
};
