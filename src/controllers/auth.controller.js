const UserModel = require('../models/user.model');
const ServiceProviderModel = require('../models/serviceprovider.model');
const JwtService = require('../utils/jwt');
const ValidationService = require('../utils/validation');
const axios = require('axios');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Validate input
      ValidationService.validateRegistration({ name, email, password });

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: 'User already exists' 
        });
      }

      // Create user
      const newUser = await UserModel.create({ 
        name, 
        email, 
        password 
      });

      // Generate tokens
      const accessToken = JwtService.generateToken({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,  
        role: newUser.role
      });

      const refreshToken = JwtService.generateRefreshToken({
        userId: newUser.id
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      ValidationService.validateEmail(email);
      ValidationService.validatePassword(password);

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Verify password
      const isPasswordValid = await UserModel.comparePassword(
        password, 
        user.hashedPassword
      );

      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Generate tokens
      const accessToken = JwtService.generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,  // Added name to the token payload
        role: user.role
      });

      const refreshToken = JwtService.generateRefreshToken({
        userId: user.id
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = JwtService.verifyToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ 
          message: 'Invalid refresh token' 
        });
      }

      // Find user
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ 
          message: 'User not found' 
        });
      }

      // Generate new access token
      const newAccessToken = JwtService.generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,  // Added name to the token payload
        role: user.role
      });

      res.json({
        accessToken: newAccessToken
      });
    } catch (error) {
      next(error);
    }
  }

  async googleSignIn(req, res, next) {
    try {
      const { token } = req.body;

      // Verify Google token
      const googleResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
      );
      const { email, name, sub: googleId } = googleResponse.data;

      // Check if user exists
      let user = await UserModel.findByEmail(email);
      if (!user) {
        // Create new user if not exists
        user = await UserModel.create({
          name: name,
          email: email,
          googleId: googleId,
          password: null // No password for Google Sign-In
        });
      }

      // Generate JWT tokens
      const accessToken = JwtService.generateToken({
        userId: user.id,
        email: user.email,
        name: user.name,  // Added name to the token payload
        role: user.role
      });

      const refreshToken = JwtService.generateRefreshToken({
        userId: user.id
      });

      res.json({
        message: 'Google Sign-In successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      next(error);
    }
  }
  async serviceProviderRegister(req, res, next) {
    try {
      const { businessName, ownerName, email, phone, password, serviceType } = req.body;
  
      // Validate input
      ValidationService.validateServiceProviderRegistration({ 
        businessName, ownerName, email, phone, password, serviceType 
      });
  
      // Check if service provider already exists
      const existingProvider = await ServiceProviderModel.findByEmail(email);
      if (existingProvider) {
        return res.status(400).json({ 
          message: 'Service provider already exists' 
        });
      }
  
      // Create service provider
      const newProvider = await ServiceProviderModel.create({ 
        businessName,
        ownerName,
        email,
        phone,
        password,
        serviceType,
        status: 'approved' // Requires approval
      });
      const accessToken = JwtService.generateToken({
        name: newProvider.ownerName,
        providerId: newProvider.id,
        email: newProvider.email,
        businessName: newProvider.businessName,
        serviceType: newProvider.serviceType,
        role: 'serviceprovider'
      });
      
      const refreshToken = JwtService.generateRefreshToken({
        providerId: newProvider.id
      });
  
      res.status(201).json({
        message: 'Service provider registered successfully and pending approval',
        serviceProvider: {
          name: newProvider.ownerName,
          id: newProvider.id,
          businessName: newProvider.businessName,
          email: newProvider.email,
          status: newProvider.status
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async serviceProviderLogin(req, res, next) {
    try {
      const { email, password } = req.body;
  
      // Validate input
      ValidationService.validateEmail(email);
      ValidationService.validatePassword(password);
  
      // Find service provider
      const provider = await ServiceProviderModel.findByEmail(email);
      if (!provider) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }
  
      // Check if approved
      if (provider.status !== 'approved') {
        return res.status(403).json({ 
          message: 'Your account is pending approval' 
        });
      }
  
      // Verify password
      const isPasswordValid = await ServiceProviderModel.comparePassword(
        password, 
        provider.hashedPassword
      );
  
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }
  
      // Generate tokens
      const accessToken = JwtService.generateToken({
        name: provider.ownerName,
        providerId: provider.id,
        email: provider.email,
        businessName: provider.businessName,
        serviceType: provider.serviceType,
        role: 'serviceprovider'
      });
  
      const refreshToken = JwtService.generateRefreshToken({
        providerId: provider.id
      });
  
      res.json({
        message: 'Login successful',
        serviceProvider: {
          name: provider.ownerName,
          id: provider.id,
          businessName: provider.businessName,
          email: provider.email,
          serviceType: provider.serviceType
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async serviceProviderRefreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
  
      // Verify refresh token
      const decoded = JwtService.verifyToken(refreshToken);
      if (!decoded || !decoded.providerId) {
        return res.status(401).json({ 
          message: 'Invalid refresh token' 
        });
      }
  
      // Find service provider
      const provider = await ServiceProviderModel.findById(decoded.providerId);
      if (!provider) {
        return res.status(401).json({ 
          message: 'Service provider not found' 
        });
      }
  
      // Generate new access token
      const newAccessToken = JwtService.generateToken({
        name: provider.ownerName,
        providerId: provider.id,
        email: provider.email,
        businessName: provider.businessName,
        serviceType: provider.serviceType,
        role: 'service_provider'
      });
  
      res.json({
        accessToken: newAccessToken
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();