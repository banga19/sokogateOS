// Salesforce CRM Adapter for sokogateOS
// Simulates fetching customer/feedback updates from Salesforce and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;

// Mock feedback data generation
function generateMockCustomerFeedback() {
  return {
    feedbackId: `FB-${Math.floor(Math.random() * 10000)}`,
    customerId: `CUST-${Math.floor(Math.random() * 5000)}`,
    productId: `PROD-${Math.floor(Math.random() * 10000)}`,
    rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
    comment: `Feedback comment ${Math.floor(Math.random() * 100)}`,
    sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
    receivedAt: new Date().toISOString(),
    source: 'Salesforce'
  };
}

// Initialize and start the adapter
async function startSalesforceCrmAdapter() {
  try {
    logger.info('Initializing Salesforce CRM Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    logger.info('Salesforce CRM Adapter: Kafka producer connected');

    // Send customer feedback every 15 seconds
    setInterval(async () => {
      try {
        const feedback = generateMockCustomerFeedback();
        const payload = JSON.stringify(feedback);

        producer.send([
          { topic: 'customer.feedback.received', messages: payload, partition: 0 }
        ], (err, data) => {
          if (err) {
            logger.error('Salesforce CRM Adapter: Failed to send message:', err);
          } else {
            logger.debug(`Salesforce CRM Adapter: Sent feedback:`, feedback.feedbackId);
          }
        });
      } catch (sendError) {
        logger.error('Salesforce CRM Adapter: Error in send interval:', sendError);
      }
    }, 15000); // 15 seconds

    logger.info('Salesforce CRM Adapter started successfully');
  } catch (error) {
    logger.error('Salesforce CRM Adapter: Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('Salesforce CRM Adapter: Kafka producer closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startSalesforceCrmAdapter };