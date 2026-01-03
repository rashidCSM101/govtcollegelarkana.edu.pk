// Error handling utility functions

const handleError = (res, error, statusCode = 500) => {
  console.error('Error:', error);
  
  // Default error message
  let message = error.message || 'Internal server error';
  let code = statusCode;

  // Handle specific error types
  if (error.code === '23505') {
    // Unique constraint violation
    message = 'Record already exists';
    code = 409;
  } else if (error.code === '23503') {
    // Foreign key constraint violation
    message = 'Related record not found';
    code = 400;
  } else if (error.code === '22P02') {
    // Invalid input syntax
    message = 'Invalid data format';
    code = 400;
  }

  res.status(code).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

const handleSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

module.exports = {
  handleError,
  handleSuccess
};
