const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
} = require('../controllers/patientController');

const router = express.Router();

// All patient routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/patients
 * @desc    List all patients (Patients see only own record)
 * @access  Admin, Doctor, Receptionist, Patient (own)
 */
router.get('/', getAllPatients);

/**
 * @route   GET /api/patients/:id
 * @desc    Get patient by ID
 * @access  Admin, Doctor, Receptionist, Patient (own)
 */
router.get('/:id', getPatientById);

/**
 * @route   POST /api/patients
 * @desc    Create a new patient
 * @access  Admin, Doctor, Receptionist
 */
router.post('/', roleMiddleware(['Admin', 'Doctor', 'Receptionist']), createPatient);

/**
 * @route   PUT /api/patients/:id
 * @desc    Update a patient (Patient can update own)
 * @access  Admin, Doctor, Receptionist, Patient (own)
 */
router.put('/:id', updatePatient);

/**
 * @route   DELETE /api/patients/:id
 * @desc    Delete a patient
 * @access  Admin
 */
router.delete('/:id', roleMiddleware(['Admin']), deletePatient);

module.exports = router;
