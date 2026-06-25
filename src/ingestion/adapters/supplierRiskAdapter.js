// Supplier Risk Adapter for sokogateOS
// Simulates fetching supplier risk score updates and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');
const serviceRunner = require('../../utils/serviceRunner');

let producer = null;
let kafkaConnected = false;

// Mock supplier risk data generation
function generateMockSupplierRiskUpdate() {
  return {
    supplierId: `SUP-${Math.floor(Math.random() * 5000)}`,
    riskScore: Math.floor(Math.random() * 100), // 0-100 scale
    riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
    riskFactors: [
      'financial_stability',
      'delivery_performance',
      'quality_issues',
      'compliance',
      'geopolitical'
    ].filter(() => Math.random() > 0.5), // Random selection of risk factors
    assessedAt: new Date().toISOString(),
    source: 'Supplier Risk System',
    assessmentMethod: ['automated', 'manual', 'hybrid'][Math.floor(Math.random() * 3)]
  };
}

// Initialize and start the adapter
async function startSupplierRiskAdapter() {
  try {
    logger.info('Initializing Supplier Risk Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    kafkaConnected = true;
    logger.info('Supplier Risk Adapter: Kafka producer connected');

    // Send supplier risk updates every 30 seconds
    serviceRunner.start('supplier-risk-updates', async () => {
      try {
        if (kafkaConnected && producer) {
          const riskUpdate = generateMockSupplierRiskUpdate();
          const payload = JSON.stringify(riskUpdate);

          producer.send([
            { topic: 'supplier.risk.updated', messages: payload, partition: 0 }
          ], (err, data) => {
            if (err) {
              logger.error('Supplier Risk Adapter: Failed to send message:', err);
            } else {
              logger.debug(`Supplier Risk Adapter: Sent risk update:`, riskUpdate.supplierId);
            }
          });
        } else {
          const riskUpdate = generateMockSupplierRiskUpdate();
          logger.debug(`Supplier Risk Adapter: Would send risk update (Kafka unavailable):`, riskUpdate.supplierId);
        }
      } catch (sendError) {
        logger.error('Supplier Risk Adapter: Error in send interval:', sendError);
      }
    }, 30000);

    logger.info('Supplier Risk Adapter started successfully');
  } catch (error) {
    logger.error('Supplier Risk Adapter: Failed to start Kakfa:', error);
    logger.info('Supplier Risk Adapter: Running in degraded mode (without Kafka)');
    // Start the interval anyway to simulate working
    serviceRunner.start('supplier-risk-generate', async () => {
      try {
        const riskUpdate = generateMockSupplierRiskUpdate();
        logger.debug(`Supplier Risk Adapter: Generated risk update (Kafka unavailable):`, riskUpdate.supplierId);
      } catch (sendError) {
        logger.error('Supplier Risk Adapter: Error in generate interval:', sendError);
      }
    }, 30000);
  }
}

// Graceful shutdown
function shutdown() {
  serviceRunner.dispose();
  if (producer) {
    producer.close(() => {
      logger.info('Supplier Risk Adapter: Kafka producer closed');
    });
  }
}

// Remove the process exit on SIGINT/SIGTERM to avoid exiting the whole application
// process.on('SIGINT', shutdown);
// process.on('SIGTERM', shutdown);

module.exports = { startSupplierRiskAdapter };