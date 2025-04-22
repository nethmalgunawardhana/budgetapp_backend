const express = require('express');
const { 
    getCurrentSavingsPlan, 
    createSavingsPlan, 
    updateSavingsPlan, 
    deleteSavingsPlan, 
    getSavingsPlanHistory, 
    recordExpense 
} = require('../controllers/savingsplan.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// Get current savings plan
router.get('/current', getCurrentSavingsPlan);

// Get savings plan history
router.get('/history', getSavingsPlanHistory);

// Create a new savings plan
router.post('/', createSavingsPlan);

// Update a savings plan
router.put('/:id', updateSavingsPlan);

// Delete a savings plan
router.delete('/:id', deleteSavingsPlan);

// Record an expense
router.post('/expense', recordExpense);

module.exports = router;