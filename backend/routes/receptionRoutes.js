// Reception workflow endpoints for registration, scheduling, queue management, and billing collection.
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  cancelAppointment,
  checkInAppointment,
  createAppointment,
  createInvoice,
  createPatient,
  getAppointments,
  getDashboard,
  getInvoices,
  getPatients,
  getProfile,
  getWaitingRoom,
  recordPayment,
  updateAppointment,
  updatePatient,
  updateProfile
} = require('../controllers/receptionController');

const router = express.Router();

// Reception workflows are inaccessible to users outside the Receptionist role.
router.use(authMiddleware);
router.use(roleMiddleware(['Receptionist']));

router.get('/dashboard', getDashboard);
router.get('/patients', getPatients);
router.post('/patients', createPatient);
router.put('/patients/:id', updatePatient);
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.put('/appointments/:id', updateAppointment);
router.patch('/appointments/:id/check-in', checkInAppointment);
router.patch('/appointments/:id/cancel', cancelAppointment);
router.get('/waiting-room', getWaitingRoom);
router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.patch('/invoices/:id/payment', recordPayment);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;
