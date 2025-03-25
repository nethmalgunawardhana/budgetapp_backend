const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ 
  path: path.resolve(process.cwd(), '.env') 
});

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_key',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Firebase config
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  // Add other Firebase config as needed
};