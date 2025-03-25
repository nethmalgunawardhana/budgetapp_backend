// src/middleware/error.middleware.js
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Determine error status code
    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
      status: 'error',
      statusCode: statusCode,
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };
  
  // Catch 404 routes
  const notFoundHandler = (req, res, next) => {
    res.status(404).json({
      status: 'error',
      message: 'Route Not Found'
    });
  };
  
  module.exports = {
    errorHandler,
    notFoundHandler
  };