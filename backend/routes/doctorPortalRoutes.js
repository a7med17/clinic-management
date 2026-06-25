// Doctor self-service portal: only a doctor can read or update their assigned clinical work.
const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const {
  completeConsultation,
  createLabTest,
  getAppointment,
  getAppointments,
  getConsultation,
  getDashboard,
  getLabTests,
  getPatient,
  getPatientConsultations,
  getPatients,
  getProfile,
  saveConsultation,
  updateAppointmentNotes,
  updateAppointmentStatus
} = require('../controllers/doctorPortalController');

const router = express.Router();
const consultationFields = [
  'chief_complaint',
  'symptoms',
  'diagnosis_summary',
  'treatment_plan',
  'doctor_notes'
];
const consultationLabels = {
  chief_complaint: 'Chief complaint',
  symptoms: 'Symptoms',
  diagnosis_summary: 'Diagnosis summary',
  treatment_plan: 'Treatment plan',
  doctor_notes: 'Doctor notes'
};
const optionalConsultationField = (field) =>
  body(field)
    .optional({ checkFalsy: true })
    .isString()
    .withMessage(`${consultationLabels[field]} must be text`)
    .bail()
    .trim()
    .isLength({ max: 4000 })
    .withMessage(`${consultationLabels[field]} must be 4000 characters or fewer`);
const requiredConsultationField = (field) =>
  body(field)
    .isString()
    .withMessage(`${consultationLabels[field]} is required`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${consultationLabels[field]} is required`)
    .bail()
    .isLength({ max: 4000 })
    .withMessage(`${consultationLabels[field]} must be 4000 characters or fewer`);
const hasConsultationContent = body().custom((_, { req }) => {
  const hasValue = consultationFields.some((field) => typeof req.body?.[field] === 'string' && req.body[field].trim());
  if (!hasValue) throw new Error('At least one consultation field is required');
  return true;
});
const saveConsultationValidators = [
  ...consultationFields.map(optionalConsultationField),
  hasConsultationContent,
  validationMiddleware
];
const completeConsultationValidators = [
  requiredConsultationField('chief_complaint'),
  optionalConsultationField('symptoms'),
  requiredConsultationField('diagnosis_summary'),
  optionalConsultationField('treatment_plan'),
  optionalConsultationField('doctor_notes'),
  validationMiddleware
];

// Apply the shared authorization gate once for the complete portal route group.
router.use(authMiddleware);
router.use(roleMiddleware(['Doctor']));

router.get('/dashboard', getDashboard);
router.get('/appointments', getAppointments);
router.get('/appointments/:id/consultation', getConsultation);
router.put('/appointments/:id/consultation', saveConsultationValidators, saveConsultation);
router.post('/appointments/:id/consultation/complete', completeConsultationValidators, completeConsultation);
router.get('/appointments/:id', getAppointment);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.patch('/appointments/:id/notes', updateAppointmentNotes);
router.get('/patients', getPatients);
router.get('/patients/:patientId/consultations', getPatientConsultations);
router.get('/patients/:id', getPatient);
router.get('/lab-tests', getLabTests);
router.post('/lab-tests', createLabTest);
router.get('/profile', getProfile);

module.exports = router;
