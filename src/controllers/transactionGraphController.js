// transactionGraphController.js
const { firestore } = require('../config/firebase');

/**
 * Get transaction graph data
 * @route GET /api/transactions/graph
 */
async function getTransactionGraph(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        const { period = 'daily', startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        // Validate period
        if (!['daily', 'monthly', 'yearly'].includes(period)) {
            return res.status(400).json({
                success: false,
                message: 'Period must be daily, monthly, or yearly'
            });
        }
        
        // Convert string dates to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Fetch all transactions within date range
        const snapshot = await firestore.collection('transactions')
            .where('userId', '==', userId)
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .get();
            
        // Process data based on selected period
        const { dates, incomeData, expenseData, totalIncome, totalExpenses } = processTransactionData(
            snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })),
            period,
            start,
            end
        );
        
        res.json({
            success: true,
            period,
            dates,
            incomeData,
            expenseData,
            totalIncome,
            totalExpenses
        });
    } catch (error) {
        console.error('Error fetching transaction graph data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching transaction graph data',
            errorDetails: error.message
        });
    }
}

/**
 * Process transaction data based on period
 */
function processTransactionData(transactions, period, startDate, endDate) {
    let dateMap = new Map();
    let totalIncome = 0;
    let totalExpenses = 0;
    
    // Generate date labels based on period
    const dates = generateDateLabels(period, startDate, endDate);
    
    // Initialize data structure
    dates.forEach(date => {
        dateMap.set(date, { income: 0, expense: 0 });
    });
    
    // Process each transaction
    transactions.forEach(transaction => {
        const transactionDate = transaction.createdAt.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        const dateKey = formatDateByPeriod(transactionDate, period);
        
        // Make sure the date key exists in our map
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { income: 0, expense: 0 });
        }
        
        const currentData = dateMap.get(dateKey);
        
        if (transaction.type === 'INCOME') {
            currentData.income += parseFloat(transaction.amount);
            totalIncome += parseFloat(transaction.amount);
        } else if (transaction.type === 'EXPENSE') {
            currentData.expense += parseFloat(transaction.amount);
            totalExpenses += parseFloat(transaction.amount);
        }
        
        dateMap.set(dateKey, currentData);
    });
    
    // Prepare data arrays for the chart
    const incomeData = dates.map(date => dateMap.get(date)?.income || 0);
    const expenseData = dates.map(date => dateMap.get(date)?.expense || 0);
    
    return {
        dates,
        incomeData,
        expenseData,
        totalIncome,
        totalExpenses
    };
}

/**
 * Generate date labels based on period
 */
function generateDateLabels(period, startDate, endDate) {
    const labels = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        labels.push(formatDateByPeriod(new Date(currentDate), period));
        
        // Increment based on period
        if (period === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (period === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (period === 'yearly') {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
    }
    
    return [...new Set(labels)]; // Remove any potential duplicates
}

/**
 * Format date based on period
 */
function formatDateByPeriod(date, period) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (period === 'daily') {
        return `${day}/${month}/${year}`;
    } else if (period === 'monthly') {
        return `${month}/${year}`;
    } else if (period === 'yearly') {
        return `${year}`;
    }
    
    return `${day}/${month}/${year}`;
}

module.exports = {
    getTransactionGraph
};