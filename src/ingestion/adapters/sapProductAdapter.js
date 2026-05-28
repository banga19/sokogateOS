// SAP Product Adapter for sokogateOS
// Simulates fetching product updates from SAP and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;

// Mock product data generation
function generateMockProductUpdate() {
  return {
    productId: `PROD-${Math.floor(Math.random() * 10000)}`,
    sku: `SKU-${Math.floor(Math.random() * 10000)}`,
    name: `Product ${Math.floor(Math.random() * 100)}`,
    description: `Description for product ${Math.floor(Math.random() * 100)}`,
    price: parseFloat((Math.random() * 100).toFixed(2)),
    currency: ['USD', 'EUR', 'GBP', 'KES', 'UGX'][Math.floor(Math.random() * 5)],
    stockQuantity: Math.floor(Math.random() * 1000),
    updatedAt: new Date().toISOString(),
    source: 'SAP'
  };
}

// Initialize and start the adapter
async function startSapProductAdapter() {
  try {
    logger.info('Initializing SAP Product Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    logger.info('SAP Product Adapter: Kafka producer connected');

    // Send product updates every 10 seconds
    setInterval(async () => {
      try {
        const productUpdate = generateMockProductUpdate();
        const payload = JSON.stringify(productUpdate);

        producer.send([
          { topic: 'product.updated', messages: payload, partition: 0 }
        ], (err, data) => {
          if (err) {
            logger.error('SAP Product Adapter: Failed to send message:', err);
          } else {
            logger.debug(`SAP Product Adapter: Sent product update:`, productUpdate.productId);
          }
        });
      } catch (sendError) {
        logger.error('SAP Product Adapter: Error in send interval:', sendError);
      }
    }, 10000); // 10 seconds

    logger.info('SAP Product Adapter started successfully');
  } catch (error) {
    logger.error('SAP Product Adapter: Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('SAP Product Adapter: Kafka producer closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startSapProductAdapter };