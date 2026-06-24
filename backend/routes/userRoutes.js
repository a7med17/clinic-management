// Legacy administrative user CRUD route group; adminRoutes is the frontend-facing management API.
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const router = express.Router();

// All user management routes require Admin role
// Keep this legacy surface admin-only to avoid widening access to account data.
router.use(authMiddleware);
router.use(roleMiddleware(['Admin']));

/**
 * @route   GET /api/users
 * @desc    List all users
 * @access  Admin
 */
router.get('/', getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/:id', getUserById);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Admin
 */
router.post('/', createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update a user
 * @access  Admin
 */
router.put('/:id', updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate a user (soft delete)
 * @access  Admin
 */
router.delete('/:id', deleteUser);

module.exports = router;
