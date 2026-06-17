const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

/**
 * GET /api/lab-tests
 * List all lab tests
 */
const getAllLabTests = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    let query = supabase
      .from('lab_tests')
      .select(`
        *,
        patients:patient_id ( id, name, email ),
        doctors:doctor_id ( id, name, specialization )
      `)
      .order('created_at', { ascending: false });

    // Optional filters
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    if (req.query.patient_id) {
      query = query.eq('patient_id', req.query.patient_id);
    }
    if (req.query.doctor_id) {
      query = query.eq('doctor_id', req.query.doctor_id);
    }
    if (req.query.search) {
      query = query.ilike('test_name', `%${req.query.search}%`);
    }

    // Scope by role
    if (req.user.role === 'Patient') {
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (patientRecord) {
        query = query.eq('patient_id', patientRecord.id);
      } else {
        return successResponse(res, 'No lab tests found', []);
      }
    } else if (req.user.role === 'Doctor') {
      const { data: doctorRecord } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (doctorRecord) {
        query = query.eq('doctor_id', doctorRecord.id);
      } else {
        return successResponse(res, 'No lab tests found', []);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[LAB] Fetch error:', error.message);
      return errorResponse(res, 'Failed to retrieve lab tests.', 500);
    }

    return successResponse(res, 'Lab tests retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/lab-tests/:id
 * Get a single lab test
 */
const getLabTestById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: labTest, error } = await supabase
      .from('lab_tests')
      .select(`
        *,
        patients:patient_id ( id, name, email, phone ),
        doctors:doctor_id ( id, name, specialization )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !labTest) {
      return errorResponse(res, 'Lab test not found.', 404);
    }

    return successResponse(res, 'Lab test retrieved successfully', labTest);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/lab-tests
 * Create a new lab test order
 */
const createLabTest = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { patient_id, doctor_id, test_name } = req.body;

    if (!test_name) {
      return errorResponse(res, 'test_name is required.', 400);
    }

    const { data: newLabTest, error } = await supabase
      .from('lab_tests')
      .insert({
        patient_id: patient_id || null,
        doctor_id: doctor_id || null,
        test_name: test_name.trim(),
        status: 'Pending'
      })
      .select(`
        *,
        patients:patient_id ( id, name ),
        doctors:doctor_id ( id, name )
      `)
      .single();

    if (error) {
      console.error('[LAB] Create error:', error.message);
      return errorResponse(res, 'Failed to create lab test.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CREATE_LAB_TEST: ${newLabTest.test_name}`,
      table_name: 'lab_tests'
    });

    return successResponse(res, 'Lab test created successfully', newLabTest, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/lab-tests/:id
 * Update a lab test (status, result)
 */
const updateLabTest = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { status, result, test_name } = req.body;
    const updateData = {};

    if (test_name !== undefined) updateData.test_name = test_name.trim();
    if (status !== undefined) updateData.status = status;
    if (result !== undefined) updateData.result = result;

    const { data: updatedLabTest, error } = await supabase
      .from('lab_tests')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        patients:patient_id ( id, name ),
        doctors:doctor_id ( id, name )
      `)
      .single();

    if (error || !updatedLabTest) {
      return errorResponse(res, 'Lab test not found or update failed.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `UPDATE_LAB_TEST: ${updatedLabTest.test_name} → ${status || 'updated'}`,
      table_name: 'lab_tests'
    });

    return successResponse(res, 'Lab test updated successfully', updatedLabTest);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/lab-tests/:id
 * Delete a lab test
 */
const deleteLabTest = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: deletedLabTest, error } = await supabase
      .from('lab_tests')
      .delete()
      .eq('id', req.params.id)
      .select('id, test_name')
      .single();

    if (error || !deletedLabTest) {
      return errorResponse(res, 'Lab test not found.', 404);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `DELETE_LAB_TEST: ${deletedLabTest.test_name}`,
      table_name: 'lab_tests'
    });

    return successResponse(res, 'Lab test deleted successfully', deletedLabTest);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest
};
