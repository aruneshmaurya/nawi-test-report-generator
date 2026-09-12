/**
 * Standardized API Response Helpers
 */

/**
 * Send a successful JSON response
 * @param {import('express').Response} res
 * @param {any} [data=null] - Response payload
 * @param {string} [message='Success'] - Optional status message
 * @param {number} [statusCode=200] - HTTP status code
 */
export const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send a failed JSON response
 * @param {import('express').Response} res
 * @param {string} message - Error description
 * @param {number} [statusCode=400] - HTTP status code
 * @param {any} [details=null] - Optional detailed validation or error info
 */
export const fail = (res, message = 'An error occurred', statusCode = 400, details = null) => {
  const response = {
    success: false,
    message
  };

  if (details !== null && details !== undefined) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

export default { success, fail };
