const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

class JwtService {
  generateToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: '12h'
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return jwt.sign(payload, JWT_SECRET, mergedOptions);
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Refresh token generation (optional)
  generateRefreshToken(payload) {
    return this.generateToken(payload, { expiresIn: '7d' });
  }
}

module.exports = new JwtService();
