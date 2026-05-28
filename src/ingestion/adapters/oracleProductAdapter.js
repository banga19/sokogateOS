// Oracle Product Adapter for sokogateOS
// Simulates fetching product updates from Oracle ERP and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;

// Mock product data generation for Oracle ERP
function generateMockOracleProductUpdate() {
  return {
    productId: `ORAPROD-${Math.floor(Math.random() * 10000)}`,
    sku: `ORASKU-${Math.floor(Math.random() * 10000)}`,
    name: `Oracle Product ${Math.floor(Math.random() * 100)}`,
    description: `Oracle ERP product description ${Math.floor(Math.random() * 100)}`,
    price: parseFloat((Math.random() * 500).toFixed(2)), // Higher price range for Oracle
    currency: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'][Math.floor(Math.random() * 5)],
    stockQuantity: Math.floor(Math.random() * 5000),
    updatedAt: new Date().toISOString(),
    source: 'Oracle ERP'
  };
}

// Initialize and start the adapter
async function startOracleProductAdapter() {
  try {
    logger.info('Initializing Oracle Product Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    logger.info('Oracle Product Adapter: Kafka producer connected');

    // Send product updates every 12 seconds (different interval to stagger)
    setInterval(async () => {
      try {
        const productUpdate = generateMockOracleProductUpdate();
        const payload = JSON.stringify(productUpdate);

        producer.send([
          { topic: 'product.updated', messages: payload, partition: 0 }
        ], (err, data) => {
          if (err) {
            logger.error('Oracle Product Adapter: Failed to send message:', err);
          } else {
            logger.debug(`Oracle Product Adapter: Sent product update:`, productUpdate.productId);
          }
        });
      } catch (sendError) {
        logger.error('Oracle Product Adapter: Error in send interval:', sendError);
      }
    }, 12000); // 12 seconds

    logger.info('Oracle Product Adapter started successfully');
  } catch (error) {
    logger.error('Oracle Product Adapter: Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('Oracle Product Adapter: Kafka producer closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startOracleProductAdapter };