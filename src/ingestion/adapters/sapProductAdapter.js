// SAP Product Adapter for sokogateOS
// Simulates fetching product updates from SAP and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');
const serviceRunner = require('../../utils/serviceRunner');

let producer = null;
let kafkaConnected = false;

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
    kafkaConnected = true;
    logger.info('SAP Product Adapter: Kafka producer connected');

    // Send product updates every 10 seconds
    serviceRunner.start('sap-product-updates', async () => {
      try {
        // Only try to send if Kafka is connected
        if (kafkaConnected && producer) {
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
        } else {
          const productUpdate = generateMockProductUpdate();
          logger.debug(`SAP Product Adapter: Would send product update (Kafka unavailable):`, productUpdate.productId);
        }
      } catch (sendError) {
        logger.error('SAP Product Adapter: Error in send interval:', sendError);
      }
    }, 10000);

    logger.info('SAP Product Adapter started successfully');
  } catch (error) {
    logger.error('SAP Product Adapter: Failed to start Kakfa:', error);
    logger.info('SAP Product Adapter: Running in degraded mode (without Kafka)');
    // Start the interval anyway to simulate working
    serviceRunner.start('sap-product-generate', async () => {
      try {
        const productUpdate = generateMockProductUpdate();
        logger.debug(`SAP Product Adapter: Generated product update (Kafka unavailable):`, productUpdate.productId);
      } catch (sendError) {
        logger.error('SAP Product Adapter: Error in generate interval:', sendError);
      }
    }, 10000);
  }
}

// Graceful shutdown
function shutdown() {
  serviceRunner.dispose();
  if (producer) {
    producer.close(() => {
      logger.info('SAP Product Adapter: Kafka producer closed');
    });
  }
}

// Remove the process exit on SIGINT/SIGTERM to avoid exiting the whole application
// process.on('SIGINT', shutdown);
// process.on('SIGTERM', shutdown);

module.exports = { startSapProductAdapter };