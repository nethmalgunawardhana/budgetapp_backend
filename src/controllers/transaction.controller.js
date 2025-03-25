const { firestore } = require('../config/firebase');
const CATEGORIES = require('../utils/categoryConstants');

class TransactionController {
  // Add a new transaction
  static async addTransaction(req, res) {
    try {
      const { 
        category, 
        amount, 
        description, 
        paymentMethod 
      } = req.body;
      const userId = req.user.uid;

      // Validate category
      if (!CATEGORIES[category]) {
        return res.status(400).json({ 
          message: 'Invalid category' 
        });
      }

      const transactionData = {
        userId,
        category,
        amount: parseFloat(amount),
        description: description || '',
        paymentMethod: paymentMethod || 'Physical Cash',
        type: CATEGORIES[category].type,
        createdAt: new Date(),
        icon: CATEGORIES[category].icon,
        color: CATEGORIES[category].color
      };

      // Add to Firestore
      const docRef = await firestore
        .collection('transactions')
        .add(transactionData);

      res.status(201).json({
        message: 'Transaction added successfully',
        transaction: {
          id: docRef.id,
          ...transactionData
        }
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
      });
    }
  }

  // Get transactions for a user
  static async getTransactions(req, res) {
    try {
      const userId = req.user.uid;
      const { 
        limit = 10, 
        type, 
        startAfter 
      } = req.query;

      let query = firestore
        .collection('transactions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit));

      // Optional type filter
      if (type) {
        query = query.where('type', '==', type);
      }

      // Pagination support
      if (startAfter) {
        const startAfterDoc = await firestore
          .collection('transactions')
          .doc(startAfter)
          .get();
        
        query = query.startAfter(startAfterDoc);
      }

      const snapshot = await query.get();
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
      });
    }
  }

  // Get transaction summary
  static async getTransactionSummary(req, res) {
    try {
      const userId = req.user.uid;

      // Aggregate transactions
      const snapshot = await firestore
        .collection('transactions')
        .where('userId', '==', userId)
        .get();

      const transactions = snapshot.docs.map(doc => doc.data());

      // Calculate totals
      const totalIncome = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      // Category-wise expenses
      const categoryExpenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, transaction) => {
          acc[transaction.category] = 
            (acc[transaction.category] || 0) + transaction.amount;
          return acc;
        }, {});

      const categorySummary = Object.entries(categoryExpenses)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: ((amount / totalExpenses) * 100).toFixed(2),
          icon: CATEGORIES[category].icon,
          color: CATEGORIES[category].color
        }))
        .sort((a, b) => b.amount - a.amount);

      res.json({
        totalIncome,
        totalExpenses,
        availableBalance: totalIncome - totalExpenses,
        categorySummary
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
      });
    }
  }
}

module.exports = TransactionController;