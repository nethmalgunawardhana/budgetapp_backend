const validator = require('validator');

class ValidationService {
  validateEmail(email) {
    if (!email) throw new Error('Email is required');
    if (!validator.isEmail(email)) throw new Error('Invalid email format');
  }

  validatePassword(password) {
    if (!password) throw new Error('Password is required');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    
    // Optional: Add more complex password validation
    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(password)) {
      throw new Error('Password must include uppercase, lowercase, and number');
    }
  }

  validateRegistration(data) {
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    if (!data.name) throw new Error('Name is required');
  }
}

module.exports = new ValidationService();