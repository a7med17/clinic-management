// Laboratory test routes; result updates are intentionally limited to laboratory staff and admins.
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest,
  getLabDashboard,
  getLabRequests,
  getLabRequestById,
  startProcessingLabRequest,
  cancelLabRequest,
  getLabResults,
  saveLabResults,
  completeLabResults
} = require('../controllers/labController');

const router = express.Router();
const labQueueRouter = express.Router();

// All lab routes require authentication
// Authentication is mandatory before clinical test data is exposed.
router.use(authMiddleware);
labQueueRouter.use(authMiddleware);

/**
 * @route   GET /api/lab-tests
 * @desc    List lab tests (scoped by role)
 * @access  Admin, Laboratory Staff, Doctor (own), Patient (own)
 */
router.get('/', roleMiddleware(['Admin', 'Laboratory Staff', 'Doctor', 'Patient']), getAllLabTests);

/**
 * @route   GET /api/lab-tests/:id
 * @desc    Get lab test by ID
 * @access  Admin, Laboratory Staff, Doctor, Patient
 */
router.get('/:id', roleMiddleware(['Admin', 'Laboratory Staff', 'Doctor', 'Patient']), getLabTestById);

/**
 * @route   POST /api/lab-tests
 * @desc    Create a new lab test order
 * @access  Admin, Doctor, Laboratory Staff
 */
router.post('/', roleMiddleware(['Admin', 'Doctor', 'Laboratory Staff']), createLabTest);

/**
 * @route   PUT /api/lab-tests/:id
 * @desc    Update lab test (status, result)
 * @access  Admin, Laboratory Staff
 */
router.put('/:id', roleMiddleware(['Admin', 'Laboratory Staff']), updateLabTest);

/**
 * @route   DELETE /api/lab-tests/:id
 * @desc    Delete a lab test
 * @access  Admin
 */
router.delete('/:id', roleMiddleware(['Admin']), deleteLabTest);

// ---------------------------------------------------------------------------
// Lab Queue Endpoints  (/api/lab/*)
// ---------------------------------------------------------------------------

/**
 * @route   GET /api/lab/dashboard
 * @desc    Lab staff dashboard summary counts
 * @access  Laboratory Staff
 */
labQueueRouter.get('/dashboard', roleMiddleware(['Laboratory Staff']), getLabDashboard);

/**
 * @route   GET /api/lab/requests
 * @desc    List submitted lab requests ordered by priority then submitted time
 * @access  Laboratory Staff
 */
labQueueRouter.get('/requests', roleMiddleware(['Laboratory Staff']), getLabRequests);

/**
 * @route   GET /api/lab/requests/:id
 * @desc    Full read-only detail for a single lab request
 * @access  Laboratory Staff
 */
labQueueRouter.get('/requests/:id', roleMiddleware(['Laboratory Staff']), getLabRequestById);

/**
 * @route   PATCH /api/lab/requests/:id/start-processing
 * @desc    Start processing a submitted lab request
 * @access  Laboratory Staff
 */
labQueueRouter.patch('/requests/:id/start-processing', roleMiddleware(['Laboratory Staff']), startProcessingLabRequest);

/**
 * @route   PATCH /api/lab/requests/:id/cancel
 * @desc    Cancel a submitted lab request
 * @access  Laboratory Staff
 */
labQueueRouter.patch('/requests/:id/cancel', roleMiddleware(['Laboratory Staff']), cancelLabRequest);

/**
 * @route   GET /api/lab/requests/:id/results
 * @desc    Get existing lab results for a request
 * @access  Laboratory Staff, Admin
 */
labQueueRouter.get('/requests/:id/results', roleMiddleware(['Laboratory Staff', 'Admin']), getLabResults);

/**
 * @route   POST /api/lab/requests/:id/results
 * @desc    Save/draft lab results (upserts on lab_request_id + lab_request_test_id)
 * @access  Laboratory Staff, Admin
 */
labQueueRouter.post('/requests/:id/results', roleMiddleware(['Laboratory Staff', 'Admin']), saveLabResults);

/**
 * @route   PATCH /api/lab/requests/:id/results/complete
 * @desc    Complete all draft results and transition request to Completed if all tests have results
 * @access  Laboratory Staff, Admin
 */
labQueueRouter.patch('/requests/:id/results/complete', roleMiddleware(['Laboratory Staff', 'Admin']), completeLabResults);

module.exports = router;
module.exports.labQueueRouter = labQueueRouter;
