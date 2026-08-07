// utils/responseFormatter.js
/**
 * Sends a standardized success response.
 * @param {object} res Express response object
 * @param {string} message Description message
 * @param {any} data Response payload
 * @param {number} statusCode HTTP Status Code (default 200)
 */
export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null ? { data } : {}),
  });
};

/**
 * Sends a standardized error response.
 * @param {object} res Express response object
 * @param {string} message Error message description
 * @param {number} statusCode HTTP Status Code (default 500)
 * @param {any} details Array/Object of error details (e.g. validator errors)
 */
export const sendError = (res, message, statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details !== null ? { details } : {}),
  });
};
