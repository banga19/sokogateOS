const express = require('express');
const connectDB = require('./config/database');
const { initKafkaProducer, initKafkaConsumer } = require('./config/kafka');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize services
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Initialize Kafka
    await initKafkaProducer();
    await initKafkaConsumer([
      'product.updated',
      'order.created',
      'inventory.changed',
      'supplier.risk.updated',
      'customer.feedback.received'
    ]);

    // Start ingestion adapters
    const { startSapProductAdapter } = require('./ingestion/adapters/sapProductAdapter');
    const { startSalesforceCrmAdapter } = require('./ingestion/adapters/salesforceCrmAdapter');

    // Start adapters in background
    startSapProductAdapter().catch(err => {
      logger.error('SAP Product Adapter failed to start:', err);
      process.exit(1);
    });

    startSalesforceCrmAdapter().catch(err => {
      logger.error('Salesforce CRM Adapter failed to start:', err);
      process.exit(1);
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;