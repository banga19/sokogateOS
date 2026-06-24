// Kafka client — kafkajs (unified with src/agents/communication.js)
// Provides backward-compatible wrappers around the kafkajs promise API
// so that existing consumers using callback/event patterns continue to work.

const { Kafka, logLevel } = require('kafkajs');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBrokers() {
  const raw = process.env.KAFKA_BROKERS;
  if (!raw || raw.trim() === '') {
    logger.warn('KAFKA_BROKERS is not set or empty, defaulting to localhost:9092 for development');
    return ['localhost:9092'];
  }
  return raw
    .trim()
    .split(',')
    .map((s) => s.trim());
}

// Lazily-created singleton so both producer & consumer share the same client.
let _client = null;

function getClient() {
  if (!_client) {
    _client = new Kafka({
      clientId: 'sokogateos',
      brokers: getBrokers(),
      logLevel: logLevel.ERROR,
      // Allow connection to succeed even if brokers aren't reachable yet
      retry: { retries: 1 },
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Mock objects (degraded mode)
// ---------------------------------------------------------------------------

function mockProducer() {
  return {
    send: (payloads, cb) => {
      logger.debug('Mock Kafka Producer: Would send payloads:', JSON.stringify(payloads));
      if (cb) cb(null, {});
    },
    close: (cb) => {
      if (cb) cb(null);
    },
  };
}

function mockConsumer() {
  const self = {
    on: (_event, _handler) => {
      logger.debug(`Mock Kafka Consumer: registered handler for event '${_event}'`);
      return self;
    },
    close: (cb) => {
      if (cb) cb(null);
    },
  };
  return self;
}

// ---------------------------------------------------------------------------
// initKafkaProducer — returns an object compatible with the old kafka-node API
// ---------------------------------------------------------------------------

const initKafkaProducer = async () => {
  try {
    const client = getClient();
    const raw = client.producer();
    await raw.connect();
    logger.info('Kafka Producer connected (kafkajs)');

    // Backward-compatible wrapper
    const wrapped = {
      /**
       * Legacy callback-based send.
       * payloads :: [{ topic: string, messages: string | string[], partition?: number }]
       */
      send: (payloads, cb) => {
        Promise.all(
          (payloads || []).map((p) => {
            const msgs = Array.isArray(p.messages)
              ? p.messages.map((m) => (typeof m === 'string' ? { value: m } : m))
              : typeof p.messages === 'string'
                ? [{ value: p.messages }]
                : p.messages || [];
            return raw.send({ topic: p.topic, messages: msgs });
          }),
        )
          .then((res) => {
            if (cb) cb(null, res);
          })
          .catch((err) => {
            logger.warn('Kafka producer send error:', err.message);
            if (cb) cb(err);
          });
      },

      /**
       * Legacy callback-based close.
       */
      close: (cb) => {
        raw
          .disconnect()
          .then(() => {
            if (cb) cb(null);
          })
          .catch((err) => {
            logger.warn('Kafka producer disconnect error:', err.message);
            if (cb) cb(err);
          });
      },

      // Expose the raw kafkajs producer for advanced / new code
      _raw: raw,
    };

    return wrapped;
  } catch (err) {
    logger.error('Failed to create Kafka Producer:', err.message);
    logger.warn('Continuing in degraded mode without Kafka producer');
    return mockProducer();
  }
};

// ---------------------------------------------------------------------------
// initKafkaConsumer — returns an object compatible with kafka-node Consumer API
// ---------------------------------------------------------------------------

const initKafkaConsumer = async (topics) => {
  try {
    const client = getClient();
    const groupId = process.env.KAFKA_CONSUMER_GROUP || 'sokogateos-group';
    const raw = client.consumer({ groupId });
    await raw.connect();

    // Subscribe to all requested topics
    for (const topic of topics) {
      await raw.subscribe({ topic, fromBeginning: false });
    }
    logger.info(`Kafka Consumer connected (kafkajs) — subscribed to: ${topics.join(', ')}`);

    // Wrapper state
    let messageHandler = null;
    let consumerStarted = false;

    const wrapped = {
      /**
       * Legacy event-based handler registration.
       * Supported events: 'message', 'error'
       */
      on: (event, handler) => {
        if (event === 'message') {
          messageHandler = handler;

          // Start the run loop only once, when the first handler is attached.
          if (!consumerStarted) {
            consumerStarted = true;
            raw
              .run({
                eachMessage: async ({ topic, partition, message }) => {
                  if (!messageHandler) return;
                  // Deliver a message shape close to kafka-node's format
                  // (value as a string for backward compat)
                  messageHandler({
                    topic,
                    partition,
                    value: message.value ? message.value.toString() : '',
                    offset: message.offset,
                    key: message.key ? message.key.toString() : null,
                  });
                },
              })
              .catch((runErr) => {
                logger.error('Kafka consumer run error:', runErr.message);
              });
          }
        } else if (event === 'error') {
          // kafkajs consumer errors surface via raw.on('consumer.crash', …).
          // We let the caller register their own handler on the raw consumer
          // if they need it.
          logger.debug('Consumer error handler registered (deferred to kafkajs)');
        }
        return wrapped; // allow chaining
      },

      /**
       * Legacy callback-based close.
       */
      close: (cb) => {
        raw
          .disconnect()
          .then(() => {
            if (cb) cb(null);
          })
          .catch((err) => {
            logger.warn('Kafka consumer disconnect error:', err.message);
            if (cb) cb(err);
          });
      },

      // Expose the raw kafkajs consumer for advanced / new code
      _raw: raw,
    };

    return wrapped;
  } catch (err) {
    logger.error('Failed to create Kafka Consumer:', err.message);
    logger.warn('Continuing in degraded mode without Kafka consumer');
    return mockConsumer();
  }
};

module.exports = { initKafkaProducer, initKafkaConsumer };
