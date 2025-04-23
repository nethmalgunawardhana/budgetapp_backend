const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { getTransactionGraph } = require('../controllers/transactionGraphController');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Transaction routes
router.post('/add', transactionController.addTransaction);
router.get('/list', transactionController.getTransactions);
router.get('/summary', transactionController.getTransactionSummary);

// Graph routes
router.get('/graph', getTransactionGraph);

// Category routes
router.post('/categories/add', transactionController.addCategory);
router.get('/categories', transactionController.getCategories);

module.exports = router;