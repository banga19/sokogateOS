// KRW Payment Adapter for sokogateOS
// Simulates processing Korean Won (KRW) payments and publishing to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;
let kafkaConnected = false;

// Mock KRW payment data generation
function generateMockKRWPayment() {
  return {
    paymentId: `KRW-PAY-${Math.floor(Math.random() * 1000000)}`,
    transactionId: `TXN-${Math.floor(Math.random() * 1000000)}`,
    amount: Math.floor(Math.random() * 10000000), // 0-10,000,000 KRW (~$0-$7,500 USD)
    currency: 'KRW',
    payerId: `PAYER-${Math.floor(Math.random() * 10000)}`,
    payeeId: `PAYEE-${Math.floor(Math.random() * 10000)}`,
    payerName: `Payer ${Math.floor(Math.random() * 1000)}`,
    payeeName: `Payee ${Math.floor(Math.random() * 1000)}`,
    paymentMethod: ['bank_transfer', 'card', 'mobile_wallet', 'escrow'][Math.floor(Math.random() * 4)],
    paymentStatus: ['pending', 'processing', 'completed', 'failed', 'refunded'][Math.floor(Math.random() * 5)],
    purpose: ['product_purchase', 'service_fee', 'customs_duty', 'logistics_fee', 'escrow_deposit'][Math.floor(Math.random() * 5)],
    processedAt: new Date().toISOString(),
    source: 'KRW Payment Gateway',
    exchangeRate: {
      krwToUsd: parseFloat((0.00075 + Math.random() * 0.0001).toFixed(6)), // ~0.00075 KRW/USD
      timestamp: new Date().toISOString()
    },
    // Additional fields for trade finance
    tradeFinance: {
      letterOfCredit: Math.random() > 0.7, // 30% chance of LC
      escrowService: Math.random() > 0.6,  // 40% chance of escrow
      financingTerm: ['none', '30_days', '60_days', '90_days'][Math.floor(Math.random() * 4)]
    }
  };
}

// Initialize and start the adapter
async function startKRWPaymentAdapter() {
  try {
    logger.info('Initializing KRW Payment Adapter...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    kafkaConnected = true;
    logger.info('KRW Payment Adapter: Kafka producer connected');

    // Send KRW payment events every 15 seconds
    setInterval(async () => {
      try {
        // Only try to send if Kafka is connected
        if (kafkaConnected && producer) {
          const paymentEvent = generateMockKRWPayment();
          const payload = JSON.stringify(paymentEvent);

          producer.send([
            { topic: 'payment.krw.processed', messages: payload, partition: 0 }
          ], (err, data) => {
            if (err) {
              logger.error('KRW Payment Adapter: Failed to send payment event:', err);
              // Optionally, we could mark kafka as disconnected here
              // kafkaConnected = false;
            } else {
              logger.debug(`KRW Payment Adapter: Sent KRW payment event:`, paymentEvent.paymentId);
            }
          });
        } else {
          // Log to console or file instead of sending to Kafka
          const paymentEvent = generateMockKRWPayment();
          logger.debug(`KRW Payment Adapter: Would send KRW payment event (Kafka unavailable):`, paymentEvent.paymentId);
        }
      } catch (sendError) {
        logger.error('KRW Payment Adapter: Error in send interval:', sendError);
      }
    }, 15000); // 15 seconds

    logger.info('KRW Payment Adapter started successfully');
  } catch (error) {
    logger.error('KRW Payment Adapter: Failed to start Kakfa:', error);
    logger.info('KRW Payment Adapter: Running in degraded mode (without Kafka)');
    // Start the interval anyway to simulate working
    setInterval(async () => {
      try {
        const paymentEvent = generateMockKRWPayment();
        logger.debug(`KRW Payment Adapter: Generated KRW payment event (Kafka unavailable):`, paymentEvent.paymentId);
      } catch (sendError) {
        logger.error('KRW Payment Adapter: Error in generate interval:', sendError);
      }
    }, 15000); // 15 seconds
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('KRW Payment Adapter: Kafka producer closed');
      // Do not exit the process, just cleanup
    });
  }
  // Do not exit the process
}

// Remove the process exit on SIGINT/SIGTERM to avoid exiting the whole application
// process.on('SIGINT', shutdown);
// process.on('SIGTERM', shutdown);

module.exports = { startKRWPaymentAdapter };