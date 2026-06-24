/**
 * Response envelope used by every API controller: { success, message, data? }.
 * Keeping this shape stable lets frontend services safely unwrap `data.data`.
 *
 * Sends a standardized success API response
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Response payload data
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Sends a standardized error API response
 * @param {object} res - Express response object
 * @param {string} message - Error message descriptor
 * @param {number} statusCode - HTTP status code
 * @param {any} errors - Detailed errors array/object
 */
const errorResponse = (res, message, statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse
};
