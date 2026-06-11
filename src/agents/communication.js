// Inter-Agent Communication System for sokogateOS Autonomous AI Agent Engine
// Uses Kafka for message passing between agents
// Can route messages through a central agent (Hermes) for coordinated intelligence

const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

class AgentCommunication {
  /**
   * @param {string} agentId - Unique identifier for this agent
   * @param {Object} [options] - Communication options
   * @param {string} [options.hermesAgentId] - ID of the Hermes agent for mediation
   * @param {boolean} [options.hermesMediation=false] - Whether to route messages through Hermes
   */
  constructor(agentId, options = {}) {
    this.agentId = agentId;
    this.hermesAgentId = options.hermesAgentId || null;
    this.hermesMediation = options.hermesMediation || false;
    this.kafkaProducer = null;
    this.kafkaConsumer = null;
    this.messageHandlers = new Map(); // messageType => handler function
    this.kafka = null;
  }

  /**
   * Initialize Kafka producer and consumer
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info(`Initializing communication system for agent ${this.agentId}`);

      // Initialize Kafka client
      this.kafka = new Kafka({
        clientId: `sokogate-agent-${this.agentId}`,
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
      });

      // Initialize producer
      this.kafkaProducer = this.kafka.producer();
      await this.kafkaProducer.connect();

      // Initialize consumer
      this.kafkaConsumer = this.kafka.consumer({ groupId: `agent-${this.agentId}` });
      await this.kafkaConsumer.connect();

      logger.info(`Communication system initialized for agent ${this.agentId}`);
    } catch (error) {
      logger.error(`Failed to initialize communication system for agent ${this.agentId}:`, error);
      // In a degraded mode, we can continue without Kafka for local development
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Running in degraded mode without Kafka');
        this.kafka = null;
        this.kafkaProducer = null;
        this.kafkaConsumer = null;
      } else {
        throw error;
      }
    }
  }

  /**
   * Subscribe to direct messages for this agent
   * @param {Function} handler - Handler function for incoming messages
   */
  subscribeToMessages(handler) {
    if (!this.kafkaConsumer) {
      logger.warn('Cannot subscribe to messages: Kafka consumer not available');
      return;
    }

    const topic = `agent.${this.agentId}.commands`;
    this.kafkaConsumer.subscribe({ topic });
    this.kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const msg = JSON.parse(message.value.toString());
          await handler(msg);
        } catch (error) {
          logger.error(`Error processing message for agent ${this.agentId}:`, error);
        }
      }
    });
    logger.debug(`Subscribed to direct messages topic: ${topic}`);
  }

  /**
   * Subscribe to broadcast messages (system-wide)
   * @param {Function} handler - Handler function for broadcast messages
   */
  subscribeToBroadcast(handler) {
    if (!this.kafkaConsumer) {
      logger.warn('Cannot subscribe to broadcast: Kafka consumer not available');
      return;
    }

    const topic = 'agent.broadcast';
    this.kafkaConsumer.subscribe({ topic });
    this.kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const msg = JSON.parse(message.value.toString());
          await handler(msg);
        } catch (error) {
          logger.error(`Error processing broadcast message for agent ${this.agentId}:`, error);
        }
      }
    });
    logger.debug(`Subscribed to broadcast topic: ${topic}`);
  }

  /**
   * Send a message to another agent
   * Routes through Hermes agent if hermesMediation is enabled
   * @param {string} targetAgentId - ID of the target agent
   * @param {Object} message - Message to send
   * @returns {Promise<void>}
   */
  async sendMessage(targetAgentId, message) {
    // If Hermes mediation is enabled and we have a Hermes agent ID, route through Hermes
    if (this.hermesMediation && this.hermesAgentId) {
      // Create a mediated message that instructs Hermes to forward the message
      const mediatedMessage = {
        type: 'hermes_mediated_forward',
        originalTarget: targetAgentId,
        payload: message,
        senderId: this.agentId,
        timestamp: new Date().toISOString()
      };

      // Send to Hermes agent instead of direct target
      if (!this.kafkaProducer) {
        logger.warn('Cannot send message: Kafka producer not available');
        // In development, we can log the message instead
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[DEV] Would send mediated message to Hermes ${this.hermesAgentId}:`, mediatedMessage);
          return;
        }
      }
      try {
        await this.kafkaProducer.send({
          topic: `agent.${this.hermesAgentId}.commands`,
          messages: [{ value: JSON.stringify(mediatedMessage) }]
        });
        logger.debug(`Message sent via Hermes ${this.hermesAgentId} to ${targetAgentId}`);
        return;
      } catch (error) {
        logger.warn('(non-critical) Failed to send mediated message:', error.message);
        // Fall back to direct sending if Hermes routing fails
        logger.info('Falling back to direct message sending');
        // Continue to direct sending logic below
      }
    }

    // Direct message sending (fallback or when mediation is disabled)
    if (!this.kafkaProducer) {
      logger.warn('Cannot send message: Kafka producer not available');
      // In development, we can log the message instead
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[DEV] Would send message to ${targetAgentId}:`, message);
        return;
      }
    }
    try {
      await this.kafkaProducer.send({
        topic: `agent.${targetAgentId}.commands`,
        messages: [{ value: JSON.stringify(message) }]
      });
      logger.debug(`Message sent directly to agent ${targetAgentId}`);
    } catch (error) {
      logger.warn('(non-critical) Failed to send message:', error.message);
      // In development, we can log the message instead of failing
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[DEV] Message content for ${targetAgentId}:`, message);
      }
    }
  }

	  /**
	   * Send a broadcast message to all agents
	   * @param {Object} message - Message to broadcast
	   * @returns {Promise<void>}
	   */
	  async broadcastMessage(message) {
	    if (!this.kafkaProducer) {
	      logger.warn('Cannot broadcast: Kafka producer not available');
	      return;
	    }
	    try {
	      await this.kafkaProducer.send({
	        topic: 'agent.broadcast',
	        messages: [{ value: JSON.stringify(message) }]
	      });
	      logger.debug(`Broadcast message sent by agent ${this.agentId}`);
	    } catch (error) {
	      logger.warn('Failed to broadcast message:', error.message);
	    }
	  }

	  /**
	   * Subscribe to a custom topic
	   * @param {string} topic - Topic to subscribe to
	   * @param {Function} handler - Handler for messages on this topic
	   */
	  subscribeToTopic(topic, handler) {
	    if (!this.kafkaConsumer) {
	      logger.warn('Cannot subscribe to topic: Kafka consumer not available');
	      return;
	    }
	    this.kafkaConsumer.subscribe({ topic });
	    this.kafkaConsumer.run({
	      eachMessage: async ({ topic: t, partition, message }) => {
	        try {
	          const msg = JSON.parse(message.value.toString());
	          await handler(msg);
	        } catch (error) {
	          logger.error(`Error processing message on topic ${topic}:`, error);
	        }
	      }
	    });
	    logger.debug(`Subscribed to custom topic: ${topic}`);
	  }

	  /**
	   * Disconnect from Kafka
	   * @returns {Promise<void>}
	   */
	  async disconnect() {
	    try {
	      if (this.kafkaProducer) await this.kafkaProducer.disconnect();
	      if (this.kafkaConsumer) await this.kafkaConsumer.disconnect();
	      logger.info(`Communication system disconnected for agent ${this.agentId}`);
	    } catch (error) {
	      logger.warn(`Error disconnecting communication for agent ${this.agentId}:`, error);
	    }
	  }
	}

	module.exports = AgentCommunication;
