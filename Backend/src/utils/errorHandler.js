/**
 * Error Handler Utility
 * Centralized error handling for API responses
 */

/**
 * Handle error and send appropriate response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {number} defaultStatus - Default HTTP status code
 */
const handleError = (res, error, defaultStatus = 500) => {
  console.error('Error:', error.message);

  // Determine status code based on error type
  let statusCode = defaultStatus;
  let message = error.message || 'Internal server error';

  // Custom error types
  if (error.message.includes('not found') || error.message.includes('Not found')) {
    statusCode = 404;
  } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
    statusCode = 409;
  } else if (error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('validation')) {
    statusCode = 400;
  } else if (error.message.includes('Unauthorized') || error.message.includes('unauthorized')) {
    statusCode = 401;
  } else if (error.message.includes('forbidden') || error.message.includes('permission')) {
    statusCode = 403;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

/**
 * Create a custom error with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Custom error object
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Async handler wrapper to catch errors in async functions
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(res, error);
    });
  };
};

/**
 * Not found error handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

/**
 * Global error handler middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const globalErrorHandler = (error, req, res, next) => {
  console.error('Global Error:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

module.exports = {
  handleError,
  createError,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler
};
