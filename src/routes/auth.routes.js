const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', authenticateToken, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/google-signin', AuthController.googleSignIn);

module.exports = router;