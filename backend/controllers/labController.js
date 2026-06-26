// Laboratory test CRUD and lab request queue for Laboratory Staff.
const { successResponse, errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

const LAB_STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled'];

const PRIORITY_ORDER = { Stat: 3, Urgent: 2, Routine: 1 };

const getHighestPriority = (tests) => {
  if (!tests?.length) return 'Routine';
  return tests.reduce((max, test) => {
    return (PRIORITY_ORDER[test.priority] || 0) > (PRIORITY_ORDER[max] || 0) ? test.priority : max;
  }, 'Routine');
};

const getLinkedRecordId = async (table, userId) => {
  const { data } = await supabase.from(table).select('id').eq('user_id', userId).maybeSingle();
  return data?.id || null;
};

const canAccessLabTest = async (user, labTest) => {
  if (user.role === 'Admin' || user.role === 'Laboratory Staff') return true;
  if (user.role === 'Patient') return labTest.patient_id === await getLinkedRecordId('patients', user.id);
  if (user.role === 'Doctor') return labTest.doctor_id === await getLinkedRecordId('doctors', user.id);
  return false;
};

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
    if (!await canAccessLabTest(req.user, labTest)) return errorResponse(res, 'Lab test not found.', 404);

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

    if (test_name !== undefined) {
      if (typeof test_name !== 'string' || !test_name.trim()) return errorResponse(res, 'test_name must be a non-empty string.', 400);
      updateData.test_name = test_name.trim();
    }
    if (status !== undefined) {
      if (!LAB_STATUSES.includes(status)) return errorResponse(res, `Invalid status. Must be one of: ${LAB_STATUSES.join(', ')}`, 400);
      updateData.status = status;
    }
    if (result !== undefined) updateData.result = result;
    if (!Object.keys(updateData).length) return errorResponse(res, 'At least one valid lab-test field is required.', 400);

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

/**
 * GET /api/lab/dashboard
 * Laboratory staff dashboard summary counts.
 */
const getLabDashboard = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Pending requests: submitted requests with at least one test in Pending status
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('lab_requests')
      .select('id, lab_request_tests:lab_request_tests!inner(status)')
      .eq('status', 'Submitted')
      .eq('lab_request_tests.status', 'Pending');

    if (pendingError) {
      console.error('[LAB QUEUE] Pending count error:', pendingError.message);
      return errorResponse(res, 'Failed to retrieve pending count.', 500);
    }

    // Processing requests: submitted requests with at least one test in Processing status
    const { data: processingRequests, error: processingError } = await supabase
      .from('lab_requests')
      .select('id, lab_request_tests:lab_request_tests!inner(status)')
      .eq('status', 'Submitted')
      .eq('lab_request_tests.status', 'Processing');

    if (processingError) {
      console.error('[LAB QUEUE] Processing count error:', processingError.message);
      return errorResponse(res, 'Failed to retrieve processing count.', 500);
    }

    // Completed today: submitted requests with at least one test completed today
    const { data: completedRequests, error: completedError } = await supabase
      .from('lab_requests')
      .select('id, lab_request_tests:lab_request_tests!inner(status, created_at)')
      .eq('status', 'Submitted')
      .eq('lab_request_tests.status', 'Completed')
      .gte('lab_request_tests.created_at', todayStart.toISOString())
      .lte('lab_request_tests.created_at', todayEnd.toISOString());

    if (completedError) {
      console.error('[LAB QUEUE] Completed today count error:', completedError.message);
      return errorResponse(res, 'Failed to retrieve completed today count.', 500);
    }

    // Urgent requests: submitted requests with at least one test with Urgent or Stat priority
    const { data: urgentRequests, error: urgentError } = await supabase
      .from('lab_requests')
      .select('id, lab_request_tests:lab_request_tests!inner(priority)')
      .eq('status', 'Submitted')
      .in('lab_request_tests.priority', ['Urgent', 'Stat']);

    if (urgentError) {
      console.error('[LAB QUEUE] Urgent count error:', urgentError.message);
      return errorResponse(res, 'Failed to retrieve urgent count.', 500);
    }

    const dashboard = {
      pendingRequests: pendingRequests?.length || 0,
      processingRequests: processingRequests?.length || 0,
      completedToday: completedRequests?.length || 0,
      urgentRequests: urgentRequests?.length || 0,
    };

    return successResponse(res, 'Dashboard retrieved successfully', dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/lab/requests
 * List all submitted lab requests ordered by priority then submitted time.
 */
const getLabRequests = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: requests, error } = await supabase
      .from('lab_requests')
      .select(`
        id,
        status,
        notes,
        created_at,
        updated_at,
        appointment_id,
        patient_id,
        doctor_id,
        appointments:appointment_id ( id, appointment_date, status ),
        patients:patient_id ( id, name ),
        doctors:doctor_id ( id, name ),
        lab_request_tests:lab_request_tests ( id, test_name, priority, status, clinical_notes, created_at )
      `)
      .eq('status', 'Submitted')
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('[LAB QUEUE] List requests error:', error.message);
      return errorResponse(res, 'Failed to retrieve lab requests.', 500);
    }

    // Sort by highest priority among tests (Stat > Urgent > Routine), then by updated_at (submitted time)
    const sortedRequests = (requests || []).map((req) => {
      const maxPriority = getHighestPriority(req.lab_request_tests);
      return { ...req, highest_priority: maxPriority };
    }).sort((a, b) => {
      const priorityDiff = (PRIORITY_ORDER[b.highest_priority] || 0) - (PRIORITY_ORDER[a.highest_priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.updated_at) - new Date(b.updated_at);
    });

    return successResponse(res, 'Lab requests retrieved successfully', sortedRequests);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/lab/requests/:id
 * Full read-only detail for a single lab request.
 */
const getLabRequestById = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: labRequest, error } = await supabase
      .from('lab_requests')
      .select(`
        id,
        status,
        notes,
        created_at,
        updated_at,
        appointment_id,
        patient_id,
        doctor_id,
        appointments:appointment_id ( id, appointment_date, status, notes ),
        patients:patient_id ( id, name, email, phone, date_of_birth, gender, blood_type ),
        doctors:doctor_id ( id, name, specialization, phone, email ),
        lab_request_tests:lab_request_tests ( id, test_name, priority, status, clinical_notes, created_at )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !labRequest) {
      return errorResponse(res, 'Lab request not found.', 404);
    }

    return successResponse(res, 'Lab request retrieved successfully', labRequest);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/lab/requests/:id/start-processing
 * Start processing a submitted lab request (changes Pending tests to Processing).
 */
const startProcessingLabRequest = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { data: labRequest, error: fetchError } = await supabase
      .from('lab_requests')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !labRequest) {
      return errorResponse(res, 'Lab request not found.', 404);
    }

    if (labRequest.status !== 'Submitted') {
      return errorResponse(res, 'Only submitted lab requests can be processed.', 400);
    }

    // Update all pending test items to Processing
    const { error: updateError } = await supabase
      .from('lab_request_tests')
      .update({ status: 'Processing' })
      .eq('lab_request_id', req.params.id)
      .eq('status', 'Pending');

    if (updateError) {
      console.error('[LAB QUEUE] Start processing error:', updateError.message);
      return errorResponse(res, 'Failed to start processing lab request.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `START_PROCESSING_LAB_REQUEST: ${req.params.id}`,
      table_name: 'lab_requests'
    });

    // Return updated request
    const { data: updated } = await supabase
      .from('lab_requests')
      .select(`
        id, status, notes, created_at, updated_at, appointment_id, patient_id, doctor_id,
        appointments:appointment_id ( id, appointment_date, status ),
        patients:patient_id ( id, name ),
        doctors:doctor_id ( id, name ),
        lab_request_tests:lab_request_tests ( id, test_name, priority, status, clinical_notes, created_at )
      `)
      .eq('id', req.params.id)
      .single();

    return successResponse(res, 'Lab request processing started.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/lab/requests/:id/cancel
 * Cancel a submitted lab request.
 */
const cancelLabRequest = async (req, res, next) => {
  try {
    if (!supabase) {
      return errorResponse(res, 'Database is not configured.', 503);
    }

    const { cancellation_reason } = req.body;

    const { data: labRequest, error: fetchError } = await supabase
      .from('lab_requests')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !labRequest) {
      return errorResponse(res, 'Lab request not found.', 404);
    }

    if (labRequest.status !== 'Submitted') {
      return errorResponse(res, 'Only submitted lab requests can be cancelled.', 400);
    }

    // Update the lab request status and cancellation reason
    const updates = { status: 'Cancelled' };
    if (cancellation_reason !== undefined) {
      updates.cancellation_reason = cancellation_reason;
    }

    const { error: reqUpdateError } = await supabase
      .from('lab_requests')
      .update(updates)
      .eq('id', req.params.id);

    if (reqUpdateError) {
      console.error('[LAB QUEUE] Cancel request error:', reqUpdateError.message);
      return errorResponse(res, 'Failed to cancel lab request.', 500);
    }

    // Cancel all pending/processing test items
    const { error: testUpdateError } = await supabase
      .from('lab_request_tests')
      .update({ status: 'Cancelled' })
      .eq('lab_request_id', req.params.id)
      .in('status', ['Pending', 'Processing']);

    if (testUpdateError) {
      console.error('[LAB QUEUE] Cancel tests error:', testUpdateError.message);
      return errorResponse(res, 'Failed to cancel lab request tests.', 500);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: `CANCEL_LAB_REQUEST: ${req.params.id}${cancellation_reason ? ` - ${cancellation_reason}` : ''}`,
      table_name: 'lab_requests'
    });

    // Return updated request
    const { data: updated } = await supabase
      .from('lab_requests')
      .select(`
        id, status, notes, created_at, updated_at, appointment_id, patient_id, doctor_id,
        appointments:appointment_id ( id, appointment_date, status ),
        patients:patient_id ( id, name ),
        doctors:doctor_id ( id, name ),
        lab_request_tests:lab_request_tests ( id, test_name, priority, status, clinical_notes, created_at )
      `)
      .eq('id', req.params.id)
      .single();

    return successResponse(res, 'Lab request cancelled.', updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest,
  getLabDashboard,
  getLabRequests,
  getLabRequestById,
  startProcessingLabRequest,
  cancelLabRequest
};
