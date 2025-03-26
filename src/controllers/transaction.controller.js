const { firestore } = require('../config/firebase');

// Add a new transaction
async function addTransaction(req, res) {
    try {
        console.log('Transaction Request Body:', req.body);
        console.log('User:', req.user);

        const { type, category, amount, description, paymentMethod } = req.body;

        // Validate user authentication
        if (!req.user || (!req.user.id && !req.user.uid)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: User ID not found'
            });
        }

        const userId = req.user.id || req.user.uid;

        // Validate required fields
        if (!type || !category || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Type, category, and amount are required fields'
            });
        }

        // Validate transaction type
        if (type !== 'INCOME' && type !== 'EXPENSE') {
            return res.status(400).json({
                success: false,
                message: 'Type must be either INCOME or EXPENSE'
            });
        }

        // Parse and validate amount
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a valid number'
            });
        }

        // Create transaction object
        const transaction = {
            userId,
            type,
            category,
            amount: numericAmount,
            description: description || '',
            paymentMethod: paymentMethod || 'Physical Cash',
            createdAt: new Date(),
        };

        // Add transaction to Firestore
        const docRef = await firestore.collection('transactions').add(transaction);

        res.status(201).json({
            success: true,
            data: {
                id: docRef.id,
                ...transaction
            }
        });
    } catch (error) {
        console.error('Detailed Transaction Error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        res.status(500).json({
            success: false,
            message: 'Server error while adding transaction',
            errorDetails: error.message
        });
    }
}

// List transactions with simple query filtering
async function getTransactions(req, res) {
    try {
        const userId = req.user.id || req.user.uid;
        const { type, category, startDate, endDate } = req.query;

        // Simple query to fetch all user transactions based on userId
        let query = firestore.collection('transactions')
            .where('userId', '==', userId);

        const snapshot = await query.get();
        let transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Apply filters in memory (no composite index needed for these filters)
        transactions = transactions.filter(transaction => {
            if (type && transaction.type !== type) return false;
            if (category && transaction.category !== category) return false;
            if (startDate && endDate) {
                const transactionDate = transaction.createdAt.toDate();
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (transactionDate < start || transactionDate > end) return false;
            }
            return true;
        });

        // Sort by date (descending)
        transactions.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

        res.json({
            success: true,
            transactions,
            count: transactions.length
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

// Get transaction summary
async function getTransactionSummary(req, res) {
    try {
        const userId = req.user.id || req.user.uid;

        // Fetch all user transactions
        const snapshot = await firestore.collection('transactions')
            .where('userId', '==', userId)
            .get();

        let totalIncome = 0;
        let totalExpenses = 0;
        const categorySummary = {};

        // Process transactions
        snapshot.docs.forEach(doc => {
            const transaction = doc.data();

            if (transaction.type === 'INCOME') {
                totalIncome += transaction.amount;
            } else if (transaction.type === 'EXPENSE') {
                totalExpenses += transaction.amount;

                // Aggregate category expenses
                if (!categorySummary[transaction.category]) {
                    categorySummary[transaction.category] = {
                        amount: 0,
                        count: 0,
                        icon: transaction.icon,
                        color: transaction.color
                    };
                }

                categorySummary[transaction.category].amount += transaction.amount;
                categorySummary[transaction.category].count += 1;
            }
        });

        // Convert category summary to sorted array
        const categorySummaryArray = Object.entries(categorySummary)
            .map(([category, details]) => ({
                category,
                amount: details.amount,
                percentage: totalExpenses > 0
                    ? ((details.amount / totalExpenses) * 100).toFixed(1)
                    : '0',
                count: details.count,
                icon: details.icon,
                color: details.color
            }))
            .sort((a, b) => b.amount - a.amount);

        // Calculate available balance
        const availableBalance = totalIncome - totalExpenses;

        res.json({
            availableBalance,
            totalIncome,
            totalExpenses,
            transactionCount: snapshot.size,
            categoryCount: Object.keys(categorySummary).length,
            categorySummary: categorySummaryArray
        });
    } catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating summary',
            errorDetails: error.message
        });
    }
}

// Add a new category
async function addCategory(req, res) {
    try {
        const { name, icon, color } = req.body;
        const userId = req.user.id || req.user.uid;

        // Validate input
        if (!name || !icon || !color) {
            return res.status(400).json({
                success: false,
                message: 'Name, icon, and color are required fields'
            });
        }

        // Sanitize and validate category name
        const sanitizedName = name.trim();
        if (sanitizedName.length < 2 || sanitizedName.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Category name must be between 2 and 50 characters'
            });
        }

        // Check if category already exists
        const existingCategories = await firestore.collection('categories')
            .where('name', '==', sanitizedName)
            .where('userId', '==', userId)
            .get();

        if (!existingCategories.empty) {
            return res.status(400).json({
                success: false,
                message: 'Category already exists'
            });
        }

        // Create category
        const category = {
            userId,
            name: sanitizedName,
            icon,
            color,
            createdAt: new Date(),
        };

        const docRef = await firestore.collection('categories').add(category);

        res.status(201).json({
            success: true,
            data: {
                id: docRef.id,
                ...category
            }
        });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding category',
            errorDetails: error.message
        });
    }
}

// Get categories
async function getCategories(req, res) {
    try {
        const userId = req.user.id || req.user.uid;

        // Validate Firestore connection
        if (!firestore) {
            console.error("Firebase db object is not initialized!");
            return res.status(500).json({
                success: false,
                message: 'Firebase db object is not initialized.'
            });
        }

        // Fetch default and user-specific categories
        const defaultCategoriesPromise = firestore.collection('categories')
            .where('userId', '==', 'default')
            .get();

        const userCategoriesPromise = firestore.collection('categories')
            .where('userId', '==', userId)
            .get();

        // Wait for both queries
        const [defaultCategoriesSnapshot, userCategoriesSnapshot] = await Promise.all([
            defaultCategoriesPromise,
            userCategoriesPromise
        ]);

        // Combine categories
        const categories = [
            ...defaultCategoriesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })),
            ...userCategoriesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        ];

        res.json({
            success: true,
            categories,
            count: categories.length
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching categories',
            errorDetails: error.message
        });
    }
}

module.exports = {
    addTransaction,
    getTransactions,
    getTransactionSummary,
    addCategory,
    getCategories
};