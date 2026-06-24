const { errorResponse } = require('../utils/response');

/**
 * Factory for route-level role guards. It runs after authMiddleware, which supplies req.user.
 * @param {string[]} allowedRoles - List of authorized roles
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required before checking roles.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, `Forbidden. This operation requires one of the following roles: ${allowedRoles.join(', ')}`, 403);
    }

    next();
  };
};

module.exports = roleMiddleware;
