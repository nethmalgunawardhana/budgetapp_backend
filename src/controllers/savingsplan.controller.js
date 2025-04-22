const { firestore } = require('../config/firebase');

// Get the current active savings plan
async function getCurrentSavingsPlan(req, res) {
    try {
        const userId = req.user.id || req.user.uid;

        // Get the current month and year
        const today = new Date();
        const currentMonth = today.toLocaleString('default', { month: 'long' });
        const currentYear = today.getFullYear().toString();

        // Query for the current month's plan
        const snapshot = await firestore.collection('savingsPlans')
            .where('userId', '==', userId)
            .where('month', '==', currentMonth)
            .where('year', '==', currentYear)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No active savings plan found for the current month'
            });
        }

        const planDoc = snapshot.docs[0];
        const plan = {
            id: planDoc.id,
            ...planDoc.data()
        };

        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        console.error('Error fetching current savings plan:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching current savings plan',
            errorDetails: error.message
        });
    }
}

// Create a new savings plan
async function createSavingsPlan(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        const { month, year, fixedIncome, fixedCosts, savingsPercentage } = req.body;

        // Validate required fields
        if (!month || !year || fixedIncome === undefined || fixedCosts === undefined || savingsPercentage === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Month, year, fixedIncome, fixedCosts, and savingsPercentage are required'
            });
        }

        // Validate numeric fields
        if (isNaN(fixedIncome) || isNaN(fixedCosts) || isNaN(savingsPercentage)) {
            return res.status(400).json({
                success: false,
                message: 'fixedIncome, fixedCosts, and savingsPercentage must be numbers'
            });
        }

        // Validate percentage range
        if (savingsPercentage < 0 || savingsPercentage > 100) {
            return res.status(400).json({
                success: false,
                message: 'savingsPercentage must be between 0 and 100'
            });
        }

        // Check if a plan already exists for this month and year
        const existingPlan = await firestore.collection('savingsPlans')
            .where('userId', '==', userId)
            .where('month', '==', month)
            .where('year', '==', year)
            .get();

        if (!existingPlan.empty) {
            return res.status(409).json({
                success: false,
                message: 'A savings plan already exists for this month and year'
            });
        }

        // Calculate initial values
        const discretionaryIncome = fixedIncome - fixedCosts;
        const plannedSavings = discretionaryIncome * (savingsPercentage / 100);
        const currentSpending = 0;
        
        // Calculate days in the month
        const daysInMonth = new Date(parseInt(year), month === 'December' ? 0 : new Date().getMonthValueForLocaleMonth(month) + 1, 0).getDate();
        
        // Calculate daily spending limit
        const dailySpendingLimit = (discretionaryIncome - plannedSavings) / daysInMonth;

        // Create the savings plan
        const savingsPlan = {
            userId,
            month,
            year,
            fixedIncome: parseFloat(fixedIncome),
            fixedCosts: parseFloat(fixedCosts),
            savingsPercentage: parseFloat(savingsPercentage),
            currentSpending,
            dailySpendingLimit,
            progress: 0,
            spendingHistory: [],
            createdAt: new Date()
        };

        const docRef = await firestore.collection('savingsPlans').add(savingsPlan);

        res.status(201).json({
            success: true,
            data: {
                id: docRef.id,
                ...savingsPlan
            }
        });
    } catch (error) {
        console.error('Error creating savings plan:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating savings plan',
            errorDetails: error.message
        });
    }
}

// Update an existing savings plan
async function updateSavingsPlan(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        const { id } = req.params;
        const { fixedIncome, fixedCosts, savingsPercentage } = req.body;

        // Verify at least one field to update
        if (fixedIncome === undefined && fixedCosts === undefined && savingsPercentage === undefined) {
            return res.status(400).json({
                success: false,
                message: 'At least one field (fixedIncome, fixedCosts, or savingsPercentage) must be provided'
            });
        }

        // Get the existing plan
        const planRef = firestore.collection('savingsPlans').doc(id);
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Savings plan not found'
            });
        }

        const planData = planDoc.data();

        // Verify ownership
        if (planData.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this savings plan'
            });
        }

        // Prepare update data
        const updateData = {};
        
        if (fixedIncome !== undefined) {
            updateData.fixedIncome = parseFloat(fixedIncome);
        }
        
        if (fixedCosts !== undefined) {
            updateData.fixedCosts = parseFloat(fixedCosts);
        }
        
        if (savingsPercentage !== undefined) {
            // Validate percentage range
            if (savingsPercentage < 0 || savingsPercentage > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'savingsPercentage must be between 0 and 100'
                });
            }
            updateData.savingsPercentage = parseFloat(savingsPercentage);
        }

        // Recalculate derived values if needed
        if (Object.keys(updateData).length > 0) {
            const newFixedIncome = updateData.fixedIncome !== undefined ? updateData.fixedIncome : planData.fixedIncome;
            const newFixedCosts = updateData.fixedCosts !== undefined ? updateData.fixedCosts : planData.fixedCosts;
            const newSavingsPercentage = updateData.savingsPercentage !== undefined ? updateData.savingsPercentage : planData.savingsPercentage;
            
            // Calculate days in the month
            const daysInMonth = new Date(parseInt(planData.year), planData.month === 'December' ? 0 : new Date().getMonthValueForLocaleMonth(planData.month) + 1, 0).getDate();
            
            // Recalculate dailySpendingLimit
            const discretionaryIncome = newFixedIncome - newFixedCosts;
            const plannedSavings = discretionaryIncome * (newSavingsPercentage / 100);
            updateData.dailySpendingLimit = (discretionaryIncome - plannedSavings) / daysInMonth;

            // Update progress calculation
            const budget = discretionaryIncome - plannedSavings;
            updateData.progress = budget > 0 ? (planData.currentSpending / budget) * 100 : 0;
        }

        // Update the document
        await planRef.update({
            ...updateData,
            updatedAt: new Date()
        });

        // Get the updated plan
        const updatedPlanDoc = await planRef.get();
        const updatedPlan = {
            id: updatedPlanDoc.id,
            ...updatedPlanDoc.data()
        };

        res.json({
            success: true,
            data: updatedPlan
        });
    } catch (error) {
        console.error('Error updating savings plan:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating savings plan',
            errorDetails: error.message
        });
    }
}

// Delete a savings plan
async function deleteSavingsPlan(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        const { id } = req.params;

        // Get the plan
        const planRef = firestore.collection('savingsPlans').doc(id);
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Savings plan not found'
            });
        }

        // Verify ownership
        if (planDoc.data().userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this savings plan'
            });
        }

        // Delete the plan
        await planRef.delete();

        res.json({
            success: true,
            message: 'Savings plan deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting savings plan:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting savings plan',
            errorDetails: error.message
        });
    }
}

// Get savings plan history
async function getSavingsPlanHistory(req, res) {
    try {
        const userId = req.user.id || req.user.uid;

        // Query all savings plans for the user
        const snapshot = await firestore.collection('savingsPlans')
            .where('userId', '==', userId)
            .orderBy('year', 'desc')
            .orderBy('createdAt', 'desc')
            .get();

        const plans = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Error fetching savings plan history:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching savings plan history',
            errorDetails: error.message
        });
    }
}

// Record a new expense in the current savings plan
async function recordExpense(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        const { amount, category, date } = req.body;

        // Validate required fields
        if (amount === undefined || !category || !date) {
            return res.status(400).json({
                success: false,
                message: 'Amount, category, and date are required fields'
            });
        }

        // Validate amount
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        // Validate date format and extract month/year
        const expenseDate = new Date(date);
        if (isNaN(expenseDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use a valid date string.'
            });
        }

        const expenseMonth = expenseDate.toLocaleString('default', { month: 'long' });
        const expenseYear = expenseDate.getFullYear().toString();

        // Get the corresponding savings plan
        const snapshot = await firestore.collection('savingsPlans')
            .where('userId', '==', userId)
            .where('month', '==', expenseMonth)
            .where('year', '==', expenseYear)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No savings plan found for the expense date'
            });
        }

        const planDoc = snapshot.docs[0];
        const planRef = planDoc.ref;
        const planData = planDoc.data();

        // Create expense record
        const expenseRecord = {
            date: date,
            amount: numericAmount,
            category: category
        };

        // Update the plan with the new expense
        const updatedSpendingHistory = [...(planData.spendingHistory || []), expenseRecord];
        const updatedCurrentSpending = (planData.currentSpending || 0) + numericAmount;

        // Recalculate progress
        const discretionaryIncome = planData.fixedIncome - planData.fixedCosts;
        const plannedSavings = discretionaryIncome * (planData.savingsPercentage / 100);
        const budget = discretionaryIncome - plannedSavings;
        const updatedProgress = budget > 0 ? (updatedCurrentSpending / budget) * 100 : 0;

        // Update the document
        await planRef.update({
            spendingHistory: updatedSpendingHistory,
            currentSpending: updatedCurrentSpending,
            progress: updatedProgress,
            updatedAt: new Date()
        });

        // Get the updated plan
        const updatedPlanDoc = await planRef.get();
        const updatedPlan = {
            id: updatedPlanDoc.id,
            ...updatedPlanDoc.data()
        };

        res.json({
            success: true,
            data: updatedPlan
        });
    } catch (error) {
        console.error('Error recording expense:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while recording expense',
            errorDetails: error.message
        });
    }
}

// Helper extension for Date prototype to get month number from locale month name
Date.prototype.getMonthValueForLocaleMonth = function(monthName) {
    const months = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(2000, i, 1);
        months.push(date.toLocaleString('default', { month: 'long' }));
    }
    return months.indexOf(monthName);
};


// Get transactions and show daily spending
async function getDailyTransactions(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        console.log('Fetching transactions for user:', userId);

        // Get today's date in the user's timezone
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        console.log('Filtering for date range:', { startOfToday, endOfToday });

        // Query all transactions (don't filter by date in the query)
        const snapshot = await firestore.collection('transactions')
            .where('userId', '==', userId)
            .where('type', '==', 'EXPENSE')
            .get();
            
        console.log('Found transactions:', snapshot.size);

        // Process and filter transactions client-side
        const transactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Handle different date formats
            let transactionDate;
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                // Firestore timestamp
                transactionDate = data.createdAt.toDate();
            } else if (data.createdAt && typeof data.createdAt === 'string') {
                // String date format
                transactionDate = new Date(data.createdAt);
            } else {
                // Fallback
                transactionDate = new Date(0);
            }
            
            const transaction = {
                id: doc.id,
                ...data,
                createdAt: transactionDate
            };
            
            transactions.push(transaction);
        });

        // Filter for today's transactions client-side
        const todaysTransactions = transactions.filter(transaction => {
            const date = transaction.createdAt;
            return date >= startOfToday && date <= endOfToday;
        });

        console.log('Today\'s transactions:', todaysTransactions.length);

        // Organize transactions by day
        const dailySpending = {};
        todaysTransactions.forEach(transaction => {
            const dateKey = transaction.createdAt.toISOString().split('T')[0];
            
            if (!dailySpending[dateKey]) {
                dailySpending[dateKey] = {
                    date: dateKey,
                    totalAmount: 0,
                    transactions: []
                };
            }
            
            dailySpending[dateKey].totalAmount += parseFloat(transaction.amount || 0);
            dailySpending[dateKey].transactions.push({
                ...transaction,
                createdAt: transaction.createdAt.toISOString()
            });
        });

        // Convert to array and sort by date
        const dailySpendingArray = Object.values(dailySpending)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Add overall statistics
        const totalSpending = todaysTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        res.json({
            success: true,
            data: {
                dailySpending: dailySpendingArray,
                statistics: {
                    totalTransactions: todaysTransactions.length,
                    totalSpending,
                    dateRange: {
                        from: startOfToday.toISOString(),
                        to: endOfToday.toISOString()
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching transactions',
            errorDetails: error.message
        });
    }
}
// Get transactions grouped by category
async function getCategoryTransactions(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        console.log('Fetching category transactions for user:', userId);

        // Optional date range filtering
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        
        // Build query
        let query = firestore.collection('transactions')
            .where('userId', '==', userId)
            .where('type', '==', 'EXPENSE');
            
        // Add date filters if specified
        if (startDate) {
            query = query.where('createdAt', '>=', startDate);
        }
        if (endDate) {
            // Add one day to include the end date fully
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            query = query.where('createdAt', '<', nextDay);
        }
            
        // Execute query
        const snapshot = await query.get();
        console.log('Found transactions:', snapshot.size);

        // Process transaction data
        const transactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const transaction = {
                id: doc.id,
                ...data
            };
            
            // Convert timestamps to dates
            if (transaction.createdAt && typeof transaction.createdAt.toDate === 'function') {
                transaction.createdAt = transaction.createdAt.toDate().toISOString();
            }
            
            transactions.push(transaction);
        });

        // Organize transactions by category
        const categorySpending = {};
        transactions.forEach(transaction => {
            const category = transaction.category || 'Uncategorized';
            
            if (!categorySpending[category]) {
                categorySpending[category] = {
                    category,
                    totalAmount: 0,
                    transactionCount: 0,
                    transactions: []
                };
            }
            
            categorySpending[category].totalAmount += parseFloat(transaction.amount || 0);
            categorySpending[category].transactionCount += 1;
            categorySpending[category].transactions.push(transaction);
        });

        // Convert to array and sort by total amount (highest first)
        const categorySpendingArray = Object.values(categorySpending)
            .sort((a, b) => b.totalAmount - a.totalAmount);

        res.json({
            success: true,
            data: {
                categorySpending: categorySpendingArray,
                totalCategories: categorySpendingArray.length,
                totalTransactions: transactions.length,
                totalSpending: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
            }
        });
    } catch (error) {
        console.error('Error fetching category transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching category transactions',
            errorDetails: error.message
        });
    }
}

// Create a new transaction
async function createTransaction(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        const { amount, category, description, type, paymentMethod } = req.body;

        console.log('Creating transaction:', { userId, amount, category, type });

        // Validate required fields
        if (amount === undefined || !category || !type) {
            return res.status(400).json({
                success: false,
                message: 'Amount, category, and type are required fields'
            });
        }

        // Validate amount
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number'
            });
        }

        // Validate type
        if (!['EXPENSE', 'INCOME'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either EXPENSE or INCOME'
            });
        }

        // Create transaction record
        const transaction = {
            userId,
            amount: numericAmount,
            category,
            description: description || '',
            type,
            paymentMethod: paymentMethod || 'Other',
            createdAt: new Date()
        };

        // Add to Firestore
        const docRef = await firestore.collection('transactions').add(transaction);
        console.log('Created transaction with ID:', docRef.id);

        // Convert date objects for consistent API response
        const responseData = {
            id: docRef.id,
            ...transaction,
            createdAt: transaction.createdAt.toISOString()
        };

        res.status(201).json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating transaction',
            errorDetails: error.message
        });
    }
}

// Export all functions
module.exports = {
    getDailyTransactions,
    getCategoryTransactions,
    createTransaction,
    // Include the existing functions from the savings plans controller
    getCurrentSavingsPlan,
    createSavingsPlan,
    updateSavingsPlan,
    deleteSavingsPlan,
    getSavingsPlanHistory,
    recordExpense
};