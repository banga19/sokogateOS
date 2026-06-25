// Flexport Logistics Adapter for sokogateOS
// Simulates fetching inventory changes and order updates from Flexport and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');
const serviceRunner = require('../../utils/serviceRunner');

let producer = null;
let kafkaConnected = false;

// Mock inventory change data
function generateMockInventoryChange() {
  return {
    inventoryId: `INV-${Math.floor(Math.random() * 10000)}`,
    productId: `PROD-${Math.floor(Math.random() * 10000)}`,
    locationId: `LOC-${Math.floor(Math.random() * 1000)}`,
    quantityChange: Math.floor(Math.random() * 100) - 50, // -50 to 49
    quantityAfter: Math.floor(Math.random() * 1000),
    changedAt: new Date().toISOString(),
    source: 'Flexport',
    changeReason: ['receipt', 'shipment', 'adjustment', 'damage'][Math.floor(Math.random() * 4)]
  };
}

// Mock order created data
function generateMockOrderCreated() {
  return {
    orderId: `ORD-${Math.floor(Math.random() * 10000)}`,
    customerId: `CUST-${Math.floor(Math.random() * 5000)}`,
    productId: `PROD-${Math.floor(Math.random() * 10000)}`,
    quantity: Math.floor(Math.random() * 10) + 1,
    totalAmount: parseFloat((Math.random() * 500).toFixed(2)),
    currency: ['USD', 'EUR', 'GBP', 'KES', 'UGX'][Math.floor(Math.random() * 5)],
    orderedAt: new Date().toISOString(),
    source: 'Flexport',
    status: ['pending', 'confirmed', 'shipped', 'delivered'][Math.floor(Math.random() * 4)]
  };
}

// Initialize and start the adapter
async function startFlexportLogisticsAdapter() {
  try {
    logger.info('Initializing Flexport Logistics Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    kafkaConnected = true;
    logger.info('Flexport Logistics Adapter: Kafka producer connected');

    // Send inventory changes every 20 seconds
    serviceRunner.start('flexport-inventory-changes', async () => {
      try {
        if (kafkaConnected && producer) {
          const inventoryChange = generateMockInventoryChange();
          const payload = JSON.stringify(inventoryChange);

          producer.send([
            { topic: 'inventory.changed', messages: payload, partition: 0 }
          ], (err, data) => {
            if (err) {
              logger.error('Flexport Logistics Adapter: Failed to send inventory change:', err);
            } else {
              logger.debug(`Flexport Logistics Adapter: Sent inventory change:`, inventoryChange.inventoryId);
            }
          });
        } else {
          const inventoryChange = generateMockInventoryChange();
          logger.debug(`Flexport Logistics Adapter: Would send inventory change (Kafka unavailable):`, inventoryChange.inventoryId);
        }
      } catch (sendError) {
        logger.error('Flexport Logistics Adapter: Error in send interval (inventory):', sendError);
      }
    }, 20000);

    // Send order created events every 25 seconds
    serviceRunner.start('flexport-order-created', async () => {
      try {
        if (kafkaConnected && producer) {
          const orderCreated = generateMockOrderCreated();
          const payload = JSON.stringify(orderCreated);

          producer.send([
            { topic: 'order.created', messages: payload, partition: 0 }
          ], (err, data) => {
            if (err) {
              logger.error('Flexport Logistics Adapter: Failed to send order created:', err);
            } else {
              logger.debug(`Flexport Logistics Adapter: Sent order created:`, orderCreated.orderId);
            }
          });
        } else {
          const orderCreated = generateMockOrderCreated();
          logger.debug(`Flexport Logistics Adapter: Would send order created (Kafka unavailable):`, orderCreated.orderId);
        }
      } catch (sendError) {
        logger.error('Flexport Logistics Adapter: Error in send interval (order):', sendError);
      }
    }, 25000);

    logger.info('Flexport Logistics Adapter started successfully');
  } catch (error) {
    logger.error('Flexport Logistics Adapter: Failed to start Kakfa:', error);
    logger.info('Flexport Logistics Adapter: Running in degraded mode (without Kafka)');
    // Start the intervals anyway to simulate working
    serviceRunner.start('flexport-inventory-generate', async () => {
      try {
        const inventoryChange = generateMockInventoryChange();
        logger.debug(`Flexport Logistics Adapter: Generated inventory change (Kafka unavailable):`, inventoryChange.inventoryId);
      } catch (sendError) {
        logger.error('Flexport Logistics Adapter: Error in generate interval (inventory):', sendError);
      }
    }, 20000);

    serviceRunner.start('flexport-order-generate', async () => {
      try {
        const orderCreated = generateMockOrderCreated();
        logger.debug(`Flexport Logistics Adapter: Generated order created (Kafka unavailable):`, orderCreated.orderId);
      } catch (sendError) {
        logger.error('Flexport Logistics Adapter: Error in generate interval (order):', sendError);
      }
    }, 25000);
  }
}

// Graceful shutdown
function shutdown() {
  serviceRunner.dispose();
  if (producer) {
    producer.close(() => {
      logger.info('Flexport Logistics Adapter: Kafka producer closed');
    });
  }
}

// Remove the process exit on SIGINT/SIGTERM to avoid exiting the whole application
// process.on('SIGINT', shutdown);
// process.on('SIGTERM', shutdown);

module.exports = { startFlexportLogisticsAdapter };