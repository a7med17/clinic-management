const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');

const router = express.Router();

// All appointment routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/appointments
 * @desc    List appointments (scoped by role)
 * @access  Admin, Doctor (own), Patient (own), Receptionist
 */
router.get('/', getAllAppointments);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment by ID
 * @access  Admin, Doctor, Patient, Receptionist
 */
router.get('/:id', getAppointmentById);

/**
 * @route   POST /api/appointments
 * @desc    Create a new appointment
 * @access  Admin, Doctor, Patient, Receptionist
 */
router.post('/', createAppointment);

/**
 * @route   PUT /api/appointments/:id
 * @desc    Update appointment (status, notes)
 * @access  Admin, Doctor, Receptionist
 */
router.put('/:id', roleMiddleware(['Admin', 'Doctor', 'Receptionist']), updateAppointment);

/**
 * @route   DELETE /api/appointments/:id
 * @desc    Delete an appointment
 * @access  Admin, Receptionist
 */
router.delete('/:id', roleMiddleware(['Admin', 'Receptionist']), deleteAppointment);

module.exports = router;
