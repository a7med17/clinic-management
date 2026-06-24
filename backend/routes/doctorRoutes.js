// Staff-facing doctor directory and schedule maintenance routes.
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
} = require('../controllers/doctorController');
const {
  getSchedules,
  setSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');

const router = express.Router();

// All doctor routes require authentication
// The module is protected globally; write operations below are restricted to Admin/Receptionist.
router.use(authMiddleware);

/**
 * @route   GET /api/doctors
 * @desc    List all doctors
 * @access  Admin, Doctor, Receptionist, Patient
 */
router.get('/', getAllDoctors);

/**
 * @route   GET /api/doctors/:id
 * @desc    Get doctor by ID with schedules
 * @access  Admin, Doctor, Receptionist, Patient
 */
router.get('/:id', getDoctorById);

/**
 * @route   POST /api/doctors
 * @desc    Create a new doctor
 * @access  Admin, Receptionist
 */
router.post('/', roleMiddleware(['Admin', 'Receptionist']), createDoctor);

/**
 * @route   PUT /api/doctors/:id
 * @desc    Update a doctor
 * @access  Admin, Receptionist
 */
router.put('/:id', roleMiddleware(['Admin', 'Receptionist']), updateDoctor);

/**
 * @route   DELETE /api/doctors/:id
 * @desc    Delete a doctor
 * @access  Admin
 */
router.delete('/:id', roleMiddleware(['Admin']), deleteDoctor);

// ---------- Schedule sub-routes ----------

/**
 * @route   GET /api/doctors/:doctorId/schedules
 * @desc    Get all schedules for a doctor
 * @access  All authenticated users
 */
router.get('/:doctorId/schedules', getSchedules);

/**
 * @route   POST /api/doctors/:doctorId/schedules
 * @desc    Add a schedule for a doctor
 * @access  Admin, Receptionist
 */
router.post('/:doctorId/schedules', roleMiddleware(['Admin', 'Receptionist']), setSchedule);

/**
 * @route   DELETE /api/doctors/:doctorId/schedules/:id
 * @desc    Remove a schedule slot
 * @access  Admin, Receptionist
 */
router.delete('/:doctorId/schedules/:id', roleMiddleware(['Admin', 'Receptionist']), deleteSchedule);

module.exports = router;
