// Supplier Risk Adapter for sokogateOS
// Simulates fetching supplier risk score updates and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;

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
    logger.info('Supplier Risk Adapter: Kafka producer connected');

    // Send supplier risk updates every 30 seconds
    setInterval(async () => {
      try {
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
      } catch (sendError) {
        logger.error('Supplier Risk Adapter: Error in send interval:', sendError);
      }
    }, 30000); // 30 seconds

    logger.info('Supplier Risk Adapter started successfully');
  } catch (error) {
    logger.error('Supplier Risk Adapter: Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('Supplier Risk Adapter: Kafka producer closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startSupplierRiskAdapter };