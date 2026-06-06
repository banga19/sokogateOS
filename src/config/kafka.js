let kafka;
try {
  kafka = require('kafka-node');
} catch {
  kafka = null;
}
const logger = require('../utils/logger');

console.log('In kafka.js module, KAFKA_BROKERS:', process.env.KAFKA_BROKERS); // DEBUG

let producer;
let consumer;

// Initialize Kafka producer
const initKafkaProducer = () => {
  return new Promise((resolve, reject) => {
    // Get and validate KAFKA_BROKERS
    let kafkaHost = process.env.KAFKA_BROKERS;
    if (!kafkaHost || kafkaHost.trim() === '') {
      logger.warn('KAFKA_BROKERS is not set or is empty, defaulting to localhost:9092 for development');
      kafkaHost = 'localhost:9092';
    } else {
      kafkaHost = kafkaHost.trim();
    }
    logger.info('KAFKA_BROKERS (using): ' + kafkaHost);
    if (!kafka) {
      logger.warn('kafka-node not installed — running without Kafka');
      resolve({
        send: (payloads, cb) => { if (cb) cb(null, {}); },
        close: (cb) => { if (cb) cb(); }
      });
      return;
    }
    try {
      // Try to create the Kafka client
      const client = new kafka.Client(kafkaHost);
      producer = new kafka.Producer(client);

      producer.on('ready', () => {
        logger.info('Kafka Producer connected');
        resolve(producer);
      });

      producer.on('error', (err) => {
        logger.error('Kafka Producer error:', err);
        // Don't reject, allow degraded mode
        logger.warn('Kafka Producer error but continuing in degraded mode:', err);
        // Create a mock producer
        producer = {
          send: (payloads, cb) => {
            logger.debug('Mock Kafka Producer: Would send payloads:', payloads);
            if (cb) cb(null, {});
          },
          close: (cb) => {
            if (cb) cb();
          }
        };
        resolve(producer); // Resolve with the mock producer
      });
    } catch (err) {
      logger.error('Failed to create Kafka Producer client:', err);
      // Don't reject, allow degraded mode
      logger.warn('Failed to create Kafka Producer but continuing in degraded mode:', err);
      // Create a mock producer that logs but doesn't actually send
      producer = {
        send: (payloads, cb) => {
          logger.debug('Mock Kafka Producer: Would send payloads:', payloads);
          if (cb) cb(null, {});
        },
        close: (cb) => {
          if (cb) cb();
        }
      };
      resolve(producer);
    }
  });
};

// Initialize Kafka consumer
const initKafkaConsumer = (topics) => {
  return new Promise((resolve, reject) => {
    // Get and validate KAFKA_BROKERS
    let kafkaHost = process.env.KAFKA_BROKERS;
    if (!kafkaHost || kafkaHost.trim() === '') {
      logger.warn('KAFKA_BROKERS is not set or is empty, defaulting to localhost:9092 for development');
      kafkaHost = 'localhost:9092';
    } else {
      kafkaHost = kafkaHost.trim();
    }
    logger.info('KAFKA_BROKERS for consumer (using): ' + kafkaHost);
    try {
      // Try to create the Kafka client
      const client = new kafka.Client(kafkaHost);
      consumer = new kafka.Consumer(client, topics.map(topic => ({ topic, partition: 0 })), {
        autoCommit: false
      });

      consumer.on('message', (message) => {
        logger.info(`Received message from ${message.topic}: ${message.value}`);
        // Message handling will be implemented in service layers
      });

      consumer.on('error', (err) => {
        logger.error('Kafka Consumer error:', err);
        // Don't reject, allow degraded mode
        logger.warn('Kafka Consumer error but continuing in degraded mode:', err);
        // Create a mock consumer
        consumer = {
          on: (event, cb) => {
            // Mock event handler
            if (event === 'message' || event === 'error') {
              // Don't actually register the callback for mock
            }
            return consumer;
          },
          close: (cb) => {
            if (cb) cb();
          }
        };
        resolve(consumer); // Resolve with the mock consumer
      });

      resolve(consumer);
    } catch (err) {
      logger.error('Failed to create Kafka Consumer client:', err);
      // Don't reject, allow degraded mode
      logger.warn('Failed to create Kafka Consumer but continuing in degraded mode:', err);
      // Create a mock consumer that logs but doesn't actually receive
      consumer = {
        on: (event, cb) => {
          // Mock event handler
          if (event === 'message' || event === 'error') {
            // Don't actually register the callback for mock
          }
          return consumer;
        },
        close: (cb) => {
          if (cb) cb();
        }
      };
      resolve(consumer);
    }
  });
};

module.exports = { initKafkaProducer, initKafkaConsumer };