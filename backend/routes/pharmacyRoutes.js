const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/pharmacyController');

const router = express.Router();

// All pharmacy routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/medicines
 * @desc    List all medicines
 * @access  Admin, Pharmacist, Doctor
 */
router.get('/', roleMiddleware(['Admin', 'Pharmacist', 'Doctor']), getAllMedicines);

/**
 * @route   GET /api/medicines/:id
 * @desc    Get medicine by ID
 * @access  Admin, Pharmacist, Doctor
 */
router.get('/:id', roleMiddleware(['Admin', 'Pharmacist', 'Doctor']), getMedicineById);

/**
 * @route   POST /api/medicines
 * @desc    Add a new medicine
 * @access  Admin, Pharmacist
 */
router.post('/', roleMiddleware(['Admin', 'Pharmacist']), createMedicine);

/**
 * @route   PUT /api/medicines/:id
 * @desc    Update a medicine
 * @access  Admin, Pharmacist
 */
router.put('/:id', roleMiddleware(['Admin', 'Pharmacist']), updateMedicine);

/**
 * @route   DELETE /api/medicines/:id
 * @desc    Delete a medicine
 * @access  Admin
 */
router.delete('/:id', roleMiddleware(['Admin']), deleteMedicine);

module.exports = router;
