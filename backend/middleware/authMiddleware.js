const { verifyToken, isJwtConfigured } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const { supabase } = require('../config/supabase');

/**
 * Authentication boundary for protected routes. It verifies the JWT and re-reads the user so
 * deactivated accounts or role changes take effect before the current request is authorized.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Access denied. No authentication token provided.', 401);
  }

  if (!isJwtConfigured()) {
    return errorResponse(res, 'Authentication is not configured on this server.', 503);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return errorResponse(res, 'Invalid or expired authentication token.', 401);
  }

  if (!supabase) {
    return errorResponse(res, 'Database is not configured.', 503);
  }

  try {
    // Fetch current authorization data so deactivated users and changed roles
    // cannot continue using an older signed token.
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !user || !user.is_active) {
      return errorResponse(res, 'This account is inactive or no longer available.', 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authMiddleware;
