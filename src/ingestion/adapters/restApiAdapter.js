// REST API Adapter for sokogateOS
// Simulates fetching data from REST APIs and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;
let kafkaConnected = false;

// Mock REST API data generation
function generateMockProductCatalog() {
  return {
    catalogId: `CAT-${Math.floor(Math.random() * 1000)}`,
    productId: `PROD-${Math.floor(Math.random() * 10000)}`,
    sku: `SKU-${Math.floor(Math.random() * 10000)}`,
    name: `Product ${Math.floor(Math.random() * 100)}`,
    category: ['Electronics', 'Apparel', 'Food & Beverages', 'Home Goods', 'Industrial'][Math.floor(Math.random() * 5)],
    brand: `Brand_${Math.floor(Math.random() * 50)}`,
    basePrice: parseFloat((Math.random() * 500).toFixed(2)),
    currency: ['USD', 'EUR', 'GBP', 'KES', 'UGX'][Math.floor(Math.random() * 5)],
    availability: ['in_stock', 'limited', 'out_of_stock', 'preorder'][Math.floor(Math.random() * 4)],
    lastUpdated: new Date().toISOString(),
    source: 'REST_API',
    attributes: {
      weight: `${Math.floor(Math.random() * 50)} kg`,
      dimensions: `${Math.floor(Math.random() * 100)}x${Math.floor(Math.random() * 50)}x${Math.floor(Math.random() * 30)} cm`,
      warranty: `${Math.floor(Math.random() * 3) + 1} year`
    }
  };
}

function generateMockCustomerProfile() {
  return {
    customerId: `CUST-${Math.floor(Math.random() * 10000)}`,
    companyName: `Company_${Math.floor(Math.random() * 1000)}`,
    contactPerson: [`John Doe`, `Jane Smith`, `Robert Johnson`, `Maria Garcia`][Math.floor(Math.random() * 4)],
    email: `contact${Math.floor(Math.random() * 1000)}@company${Math.floor(Math.random() * 1000)}.com`,
    phone: `+${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000000)}`,
    address: {
      street: `${Math.floor(Math.random() * 1000)} Business Ave`,
      city: [`Nairobi`, `Lagos`, `Johannesburg`, `Cairo`, `Accra`][Math.floor(Math.random() * 5)],
      country: [`Kenya`, `Nigeria`, `South Africa`, `Egypt`, `Ghana`][Math.floor(Math.random() * 5)],
      postalCode: `${Math.floor(Math.random() * 90000) + 10000}`
    },
    tier: ['platinum', 'gold', 'silver', 'bronze'][Math.floor(Math.random() * 4)],
    creditLimit: parseFloat((Math.random() * 100000).toFixed(2)),
    currency: ['USD', 'EUR', 'GBP', 'KES', 'UGX'][Math.floor(Math.random() * 5)],
    lastUpdated: new Date().toISOString(),
    source: 'REST_API'
  };
}

// Initialize and start the adapter
async function startRestApiAdapter() {
  try {
    logger.info('Initializing REST API Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    kafkaConnected = true;
    logger.info('REST API Adapter: Kafka producer connected');

    // Fetch product catalog data every 30 seconds
    setInterval(async () => {
      try {
        // Only try to send if Kafka is connected
        if (kafkaConnected && producer) {
          const productCatalog = generateMockProductCatalog();
          const payload = JSON.stringify(productCatalog);

          producer.send([
            { topic: 'product.catalog.updated', messages: payload, partition: 0 }
          ], (err, data) => {
            if (err) {
              logger.error('REST API Adapter: Failed to send product catalog:', err);
              // Optionally, we could mark kafka as disconnected here
              // kafkaConnected = false;
            } else {
              logger.debug(`REST API Adapter: Sent product catalog:`, productCatalog.productId);
            }
          }
        } else {
          // Log to console or file instead of sending to Kafka
          const productCatalog = generateMockProductCatalog();
          logger.debug(`REST API Adapter: Would send product catalog (Kafka unavailable):`, productCatalog.productId);
        }
      } catch (sendError) {
        logger.error('REST API Adapter: Error in send interval (product catalog):', sendError);
      }
    }, 30000); // 30 seconds

    // Fetch customer profile data every 45 seconds
    setInterval(async () => {
      try {
        // Only try to send if Kafka is connected
        if (kafkaConnected && producer) {
          const customerProfile = generateMockCustomerProfile();
          const payload = JSON.stringify(customerProfile);

          producer.send([
            { topic: 'customer.profile.updated', messages: payload, partition: 0 }
          ], (err, data) => {
            if (err) {
              logger.error('REST API Adapter: Failed to send customer profile:', err);
              // Optionally, we could mark kafka as disconnected here
              // kafkaConnected = false;
            } else {
              logger.debug(`REST API Adapter: Sent customer profile:`, customerProfile.customerId);
            }
          });
        } else {
          // Log to console or file instead of sending to Kafka
          const customerProfile = generateMockCustomerProfile();
          logger.debug(`REST API Adapter: Would send customer profile (Kafka unavailable):`, customerProfile.customerId);
        }
      } catch (sendError) {
        logger.error('REST API Adapter: Error in send interval (customer profile):', sendError);
      }
    }, 45000); // 45 seconds

    logger.info('REST API Adapter started successfully');
  } catch (error) {
    logger.error('REST API Adapter: Failed to start Kakfa:', error);
    logger.info('REST API Adapter: Running in degraded mode (without Kafka)');
    // Start the intervals anyway to simulate working
    setInterval(async () => {
      try {
        const productCatalog = generateMockProductCatalog();
        logger.debug(`REST API Adapter: Generated product catalog (Kafka unavailable):`, productCatalog.productId);
      } catch (sendError) {
        logger.error('REST API Adapter: Error in generate interval (product catalog):', sendError);
      }
    }, 30000); // 30 seconds

    setInterval(async () => {
      try {
        const customerProfile = generateMockCustomerProfile();
        logger.debug(`REST API Adapter: Generated customer profile (Kafka unavailable):`, customerProfile.customerId);
      } catch (sendError) {
        logger.error('REST API Adapter: Error in generate interval (customer profile):', sendError);
      }
    }, 45000); // 45 seconds
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('REST API Adapter: Kafka producer closed');
      // Do not exit the process, just cleanup
    });
  }
  // Do not exit the process
}

// Remove the process exit on SIGINT/SIGTERM to avoid exiting the whole application
// process.on('SIGINT', shutdown);
// process.on('SIGTERM', shutdown);

module.exports = { startRestApiAdapter };