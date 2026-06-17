const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest
} = require('../controllers/labController');

const router = express.Router();

// All lab routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/lab-tests
 * @desc    List lab tests (scoped by role)
 * @access  Admin, Laboratory Staff, Doctor (own), Patient (own)
 */
router.get('/', getAllLabTests);

/**
 * @route   GET /api/lab-tests/:id
 * @desc    Get lab test by ID
 * @access  Admin, Laboratory Staff, Doctor, Patient
 */
router.get('/:id', getLabTestById);

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

module.exports = router;
