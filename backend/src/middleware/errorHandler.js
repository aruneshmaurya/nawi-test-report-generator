/**
 * Centralized error-handling middleware
 * Returns JSON errors in the shape { success: false, message, details }
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  const response = {
    success: false,
    message,
    details: err.details || (process.env.NODE_ENV === 'development' ? err.stack : undefined)
  };

  // Log server errors for debugging
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
