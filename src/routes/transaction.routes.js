const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transaction.controller');
const {authenticateToken} = require('../middleware/auth.middleware');

// Add transaction route
router.post('/add', authenticateToken, TransactionController.addTransaction);

// Get transactions route
router.get('/list', authenticateToken, TransactionController.getTransactions);

// Get transaction summary route
router.get('/summary', authenticateToken, TransactionController.getTransactionSummary);

module.exports = router;