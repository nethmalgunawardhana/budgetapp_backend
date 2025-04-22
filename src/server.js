const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { PORT, NODE_ENV } = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const servicePostRoutes = require('./routes/servicePost.routes');
const transactionRoutes = require('./routes/transaction.routes');
const userRoutes = require('./routes/user.routes');
const savingsRoutes = require('./routes/savings.routes');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/service-posts', servicePostRoutes);
app.use('/api/user', userRoutes);
app.use('/api/savings', savingsRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });