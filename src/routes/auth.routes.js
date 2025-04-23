const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/google-signin', AuthController.googleSignIn);


// Service provider routes
router.post('/service-provider/register', AuthController.serviceProviderRegister);
router.post('/service-provider/login',AuthController.serviceProviderLogin);
router.post('/service-provider/refresh-token', AuthController.serviceProviderRefreshToken);


module.exports = router;