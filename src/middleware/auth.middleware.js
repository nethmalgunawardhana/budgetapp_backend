const jwt = require('jsonwebtoken');

exports.authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied: No token provided' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token using your secret key
      const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';
      const decodedToken = jwt.verify(token, SECRET_KEY);
      
      // Log the decoded user ID
      console.log('Decoded User ID:', decodedToken.userId);
      
      // Attach user information to the request
      if (decoded.userId) {
      req.user = {
        id: decodedToken.userId,
        email: decodedToken.email,
        name: decodedToken.name,
        role: decodedToken.role || "user" 
      };
    }else if (decoded.providerId) {
      req.serviceProvider = {
        id: decoded.providerId,
        email: decoded.email,
        businessName: decoded.businessName,
        serviceType: decoded.serviceType,
        role: 'service_provider'
      };
    } else {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      
      // Handle different types of token errors
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format',
          error: tokenError.message
        });
      }
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired',
          error: tokenError.message
        });
      }
      
      res.status(401).json({ 
        success: false, 
        message: 'Authentication failed',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication' 
    });
  }
};