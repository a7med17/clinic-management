// Patient self-service portal: controllers scope every result to the authenticated patient profile.
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  cancelAppointment,
  createAppointment,
  getAppointments,
  getDashboard,
  getLabResults,
  getProfile,
  getRecords,
  updateProfile
} = require('../controllers/patientPortalController');

const router = express.Router();

// Apply the shared authorization gate once for the complete portal route group.
router.use(authMiddleware);
router.use(roleMiddleware(['Patient']));

router.get('/dashboard', getDashboard);
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.patch('/appointments/:id/cancel', cancelAppointment);
router.get('/records', getRecords);
router.get('/lab-results', getLabResults);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;
