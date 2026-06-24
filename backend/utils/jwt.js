// JWT helpers centralize token policy so authentication middleware and controllers agree on its format.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Reject weak or absent secrets rather than silently signing tokens with an unsafe fallback.
const isJwtConfigured = () => Boolean(JWT_SECRET && JWT_SECRET.length >= 32);

/**
 * Generate JWT token
 * @param {object} payload - User info (id, role, email)
 * @returns {string} Signed JWT
 */
const generateToken = (payload) => {
  if (!isJwtConfigured()) {
    throw new Error('JWT authentication is not configured. Set a JWT_SECRET of at least 32 characters.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Verify JWT token
 * @param {string} token - Signed JWT
 * @returns {object|null} Decoded payload or null
 */
const verifyToken = (token) => {
  if (!isJwtConfigured()) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  isJwtConfigured
};
