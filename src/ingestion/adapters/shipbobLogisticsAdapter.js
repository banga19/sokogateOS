// ShipBob Logistics Adapter for sokogateOS
// Simulates fetching inventory changes and order updates from ShipBob and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;

// Mock inventory change data
function generateMockInventoryChange() {
  return {
    inventoryId: `INV-${Math.floor(Math.random() * 10000)}`,
    productId: `PROD-${Math.floor(Math.random() * 10000)}`,
    locationId: `LOC-${Math.floor(Math.random() * 1000)}`,
    quantityChange: Math.floor(Math.random() * 100) - 50, // -50 to 49
    quantityAfter: Math.floor(Math.random() * 1000),
    changedAt: new Date().toISOString(),
    source: 'ShipBob',
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
    source: 'ShipBob',
    status: ['pending', 'confirmed', 'shipped', 'delivered'][Math.floor(Math.random() * 4)]
  };
}

// Initialize and start the adapter
async function startShipBobLogisticsAdapter() {
  try {
    logger.info('Initializing ShipBob Logistics Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    logger.info('ShipBob Logistics Adapter: Kafka producer connected');

    // Send inventory changes every 20 seconds
    setInterval(async () => {
      try {
        const inventoryChange = generateMockInventoryChange();
        const payload = JSON.stringify(inventoryChange);

        producer.send([
          { topic: 'inventory.changed', messages: payload, partition: 0 }
        ], (err, data) => {
          if (err) {
            logger.error('ShipBob Logistics Adapter: Failed to send inventory change:', err);
          } else {
            logger.debug(`ShipBob Logistics Adapter: Sent inventory change:`, inventoryChange.inventoryId);
          }
        });
      } catch (sendError) {
        logger.error('ShipBob Logistics Adapter: Error in send interval (inventory):', sendError);
      }
    }, 20000); // 20 seconds

    // Send order created events every 25 seconds
    setInterval(async () => {
      try {
        const orderCreated = generateMockOrderCreated();
        const payload = JSON.stringify(orderCreated);

        producer.send([
          { topic: 'order.created', messages: payload, partition: 0 }
        ], (err, data) => {
          if (err) {
            logger.error('ShipBob Logistics Adapter: Failed to send order created:', err);
          } else {
            logger.debug(`ShipBob Logistics Adapter: Sent order created:`, orderCreated.orderId);
          }
        });
      } catch (sendError) {
        logger.error('ShipBob Logistics Adapter: Error in send interval (order):', sendError);
      }
    }, 25000); // 25 seconds

    logger.info('ShipBob Logistics Adapter started successfully');
  } catch (error) {
    logger.error('ShipBob Logistics Adapter: Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('ShipBob Logistics Adapter: Kafka producer closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startShipBobLogisticsAdapter };