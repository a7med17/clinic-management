// Public account entry points plus authenticated self-service profile/password endpoints.
const express = require('express');
const { body } = require('express-validator');
const { login, register, getCurrentUser, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validationMiddleware,
  login
);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validationMiddleware,
  register
);

/**
 * @route GET /api/auth/me
 * @desc Retrieve current logged-in user profile
 * @access Private
 */
// These endpoints rely on the current JWT; no role restriction is needed because each user edits only themself.
router.get('/me', authMiddleware, getCurrentUser);
router.patch('/change-password', authMiddleware, changePassword);

module.exports = router;
