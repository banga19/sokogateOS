// HubSpot CRM Adapter for sokogateOS
// Simulates fetching customer/feedback updates from HubSpot and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;

// Mock feedback data generation for HubSpot CRM
function generateMockHubSpotFeedback() {
  return {
    feedbackId: `HFB-${Math.floor(Math.random() * 10000)}`,
    customerId: `HCUST-${Math.floor(Math.random() * 5000)}`,
    productId: `HPROD-${Math.floor(Math.random() * 10000)}`,
    rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
    comment: `HubSpot feedback comment ${Math.floor(Math.random() * 100)}`,
    sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
    receivedAt: new Date().toISOString(),
    source: 'HubSpot CRM',
    lifecycleStage: ['lead', 'customer', 'evangelist', 'other'][Math.floor(Math.random() * 4)]
  };
}

// Initialize and start the adapter
async function startHubspotCrmAdapter() {
  try {
    logger.info('Initializing HubSpot CRM Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    logger.info('HubSpot CRM Adapter: Kafka producer connected');

    // Send customer feedback every 18 seconds (different interval to stagger)
    setInterval(async () => {
      try {
        const feedback = generateMockHubSpotFeedback();
        const payload = JSON.stringify(feedback);

        producer.send([
          { topic: 'customer.feedback.received', messages: payload, partition: 0 }
        ], (err, data) => {
          if (err) {
            logger.error('HubSpot CRM Adapter: Failed to send message:', err);
          } else {
            logger.debug(`HubSpot CRM Adapter: Sent feedback:`, feedback.feedbackId);
          }
        });
      } catch (sendError) {
        logger.error('HubSpot CRM Adapter: Error in send interval:', sendError);
      }
    }, 18000); // 18 seconds

    logger.info('HubSpot CRM Adapter started successfully');
  } catch (error) {
    logger.error('HubSpot CRM Adapter: Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('HubSpot CRM Adapter: Kafka producer closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startHubspotCrmAdapter };