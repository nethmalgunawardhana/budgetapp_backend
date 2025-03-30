const express = require('express');
const { authenticateUser } = require('../middleware/auth.middleware');
const UserController = require('../controllers/user.controller');
const router = express.Router();
router.use(authenticateUser);

router.get('/profile', authenticateUser, UserController.getUserProfile);

module.exports = router;

