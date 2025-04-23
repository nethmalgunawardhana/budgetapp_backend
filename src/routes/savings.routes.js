const express = require('express');
const savingsController = require('../controllers/savingsplan.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Savings plan routes
router.get('/current', savingsController.getCurrentSavingsPlan);
router.get('/history', savingsController.getSavingsPlanHistory);
router.post('/', savingsController.createSavingsPlan);
router.put('/:id', savingsController.updateSavingsPlan);
router.delete('/:id', savingsController.deleteSavingsPlan);
router.post('/expense', savingsController.recordExpense);

// Transaction routes
router.post('/transactions', savingsController.createTransaction);
router.get('/transactions/daily', savingsController.getDailyTransactions);
router.get('/transactions/category', savingsController.getCategoryTransactions);

module.exports = router;