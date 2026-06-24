const { errorResponse } = require('../utils/response');

/**
 * Last-resort Express error handler. Stack traces are returned only in development.
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err);

  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  const message = statusCode >= 500 ? 'An internal server error occurred.' : (err.message || 'Request failed.');
  const details = process.env.NODE_ENV === 'development' ? err.stack : null;

  return errorResponse(res, message, statusCode, details);
};

module.exports = errorMiddleware;
