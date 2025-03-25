// Format API responses consistently
exports.success = (data, message = 'Success') => {
    return {
      success: true,
      message,
      data
    };
  };
  
  exports.error = (message = 'An error occurred', code = 500) => {
    return {
      success: false,
      message,
      code
    };
  };