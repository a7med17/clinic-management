// Doctor self-service portal: only a doctor can read or update their assigned clinical work.
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  createLabTest,
  getAppointment,
  getAppointments,
  getDashboard,
  getLabTests,
  getPatient,
  getPatients,
  getProfile,
  updateAppointmentNotes,
  updateAppointmentStatus
} = require('../controllers/doctorPortalController');

const router = express.Router();

// Apply the shared authorization gate once for the complete portal route group.
router.use(authMiddleware);
router.use(roleMiddleware(['Doctor']));

router.get('/dashboard', getDashboard);
router.get('/appointments', getAppointments);
router.get('/appointments/:id', getAppointment);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.patch('/appointments/:id/notes', updateAppointmentNotes);
router.get('/patients', getPatients);
router.get('/patients/:id', getPatient);
router.get('/lab-tests', getLabTests);
router.post('/lab-tests', createLabTest);
router.get('/profile', getProfile);

module.exports = router;
