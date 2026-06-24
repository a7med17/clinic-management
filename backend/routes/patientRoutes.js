// Shared patient-directory routes used by authorized clinical and front-desk workflows.
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
// Ownership/role checks are enforced by the route and controller appropriate to each action.
router.use(authMiddleware);

/**
 * @route   GET /api/patients
 * @desc    List all patients (Patients see only own record)
 * @access  Admin, Doctor, Receptionist, Patient (own)
 */
router.get('/', roleMiddleware(['Admin', 'Doctor', 'Receptionist', 'Patient']), getAllPatients);

/**
 * @route   GET /api/patients/:id
 * @desc    Get patient by ID
 * @access  Admin, Doctor, Receptionist, Patient (own)
 */
router.get('/:id', roleMiddleware(['Admin', 'Doctor', 'Receptionist', 'Patient']), getPatientById);

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
router.put('/:id', roleMiddleware(['Admin', 'Doctor', 'Receptionist', 'Patient']), updatePatient);

/**
 * @route   DELETE /api/patients/:id
 * @desc    Delete a patient
 * @access  Admin
 */
router.delete('/:id', roleMiddleware(['Admin']), deletePatient);

module.exports = router;
