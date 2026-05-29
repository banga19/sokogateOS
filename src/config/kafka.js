const kafka = require('kafka-node');
const logger = require('../utils/logger');

let producer;
let consumer;

// Initialize Kafka producer
const initKafkaProducer = () => {
  return new Promise((resolve, reject) => {
    producer = new kafka.Producer(new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BROKERS }));

    producer.on('ready', () => {
      logger.info('Kafka Producer connected');
      resolve(producer);
    });

    producer.on('error', (err) => {
      logger.error('Kafka Producer error:', err);
      reject(err);
    });
  });
};

// Initialize Kafka consumer
const initKafkaConsumer = (topics) => {
  return new Promise((resolve, reject) => {
    const client = new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BROKERS });
    consumer = new kafka.Consumer(client, topics.map(topic => ({ topic, partition: 0 })), {
      autoCommit: false
    });

    consumer.on('message', (message) => {
      logger.info(`Received message from ${message.topic}: ${message.value}`);
      // Message handling will be implemented in service layers
    });

    consumer.on('error', (err) => {
      logger.error('Kafka Consumer error:', err);
      reject(err);
    });

    resolve(consumer);
  });
};

module.exports = { initKafkaProducer, initKafkaConsumer };