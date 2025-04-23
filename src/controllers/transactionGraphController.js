// transactionGraphController.js
const { firestore } = require('../config/firebase');

/**
 * Get transaction graph data
 * @route GET /api/transactions/graph
 */
async function getTransactionGraph(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        console.log('User ID:', userId);
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
        
        // Convert string dates to Date objects and adjust the end date to include the entire day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Set to beginning of the start day
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of the end day
        
        console.log('Adjusted Date Range Query:', {
            startDate: start.toISOString(),
            endDate: end.toISOString()
        });
        
        // Fetch all transactions within date range
        const snapshot = await firestore.collection('transactions')
            .where('userId', '==', userId)
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .get();
            
        console.log('Transactions in date range:', snapshot.size);
        
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
        
        console.log('Transaction data processed successfully:', {
            period,
            dates,
            incomeData,
            expenseData,
            totalIncome,
            totalExpenses
        });
        
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
        // Handle different timestamp formats
        let transactionDate;
        if (transaction.createdAt && typeof transaction.createdAt.toDate === 'function') {
            // Handle Firestore Timestamp objects
            transactionDate = transaction.createdAt.toDate();
        } else if (transaction.createdAt && transaction.createdAt._seconds) {
            // Handle serialized Firestore Timestamp objects
            transactionDate = new Date(transaction.createdAt._seconds * 1000);
        } else if (transaction.createdAt instanceof Date) {
            // Handle Date objects
            transactionDate = transaction.createdAt;
        } else if (transaction.createdAt) {
            // Handle string or timestamp values
            transactionDate = new Date(transaction.createdAt);
        } else {
            console.warn('Transaction missing valid createdAt property:', transaction);
            return; // Skip this transaction
        }
        
        const dateKey = formatDateByPeriod(transactionDate, period);
        
        if (dateMap.has(dateKey)) {
            const currentData = dateMap.get(dateKey);
            
            if (transaction.type === 'INCOME') {
                currentData.income += parseFloat(transaction.amount) || 0;
                totalIncome += parseFloat(transaction.amount) || 0;
            } else if (transaction.type === 'EXPENSE') {
                currentData.expense += parseFloat(transaction.amount) || 0;
                totalExpenses += parseFloat(transaction.amount) || 0;
            }
            
            dateMap.set(dateKey, currentData);
        }
    });
    
    // Prepare data arrays for the chart
    const incomeData = dates.map(date => dateMap.get(date).income);
    const expenseData = dates.map(date => dateMap.get(date).expense);
    
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
        labels.push(formatDateByPeriod(currentDate, period));
        
        // Increment based on period
        if (period === 'daily') {
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (period === 'monthly') {
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (period === 'yearly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }
    
    return labels;
}

/**
 * Format date based on period
 */
function formatDateByPeriod(date, period) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (period === 'daily') {
        return `${day}/${month}`;
    } else if (period === 'monthly') {
        return `${day}/${month}`;
    } else if (period === 'yearly') {
        return `${month}/${year}`;
    }
    
    return `${day}/${month}`;
}

module.exports = {
    getTransactionGraph
};