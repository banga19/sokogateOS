// Chat Agent Interface for sokogateOS Autonomous AI Agent Engine
// Conversational AI layer for natural language user interaction

const BaseAgent = require('./baseAgent');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ChatAgent extends BaseAgent {
  constructor(options = {}) {
    super(options);
    this.type = 'chat';
    this.capabilities = [
      'natural_language_understanding',
      'intent_recognition',
      'entity_extraction',
      'context_aware_responses',
      'conversation_management',
      'agent_handoff'
    ];
    this.config = options.config || {};
    this.conversations = new Map();
  }

  async initialize() {
    await super.initialize();
    logger.info(`ChatAgent ${this.id} initialized`);
  }

  async processTask(task) {
    switch (task.type) {
      case 'chat_message':
        return await this.handleChatMessage(task.payload);
      case 'start_conversation':
        return await this.startConversation(task.payload);
      case 'end_conversation':
        return await this.endConversation(task.payload);
      case 'get_conversation_history':
        return await this.getConversationHistory(task.payload);
      default:
        throw new Error(`Unsupported task type for ChatAgent: ${task.type}`);
    }
  }

  async handleQuery(query) {
    switch (query.type) {
      case 'agent_status':
        return this.getAgentStatus();
      case 'system_capabilities':
        return this.getSystemCapabilities();
      case 'help':
        return this.getHelpInfo();
      default:
        return {
          agentId: this.id,
          agentType: this.type,
          timestamp: new Date().toISOString(),
          suggestedActions: ['agent_status', 'system_capabilities', 'help']
        };
    }
  }

  async handleChatMessage(payload) {
    const { message, conversationId, userId, companyId } = payload;

    let conversation = this.conversations.get(conversationId);
    if (!conversation) {
      conversation = this.createNewConversation(conversationId, userId, companyId);
      this.conversations.set(conversationId, conversation);
    }

    conversation.history.push({
      role: 'user', content: message, timestamp: new Date().toISOString()
    });

    try {
      const nlpResult = await this.processNaturalLanguage(message, conversation);

      if (nlpResult.needsHandoff) {
        return await this.handoffToSpecializedAgent(nlpResult, conversation, payload);
      }

      const response = await this.generateResponse(nlpResult, conversation);
      conversation.history.push({
        role: 'agent', content: response.content, timestamp: new Date().toISOString(), metadata: response.metadata
      });
      this.conversations.set(conversationId, conversation);

      return {
        success: true,
        data: {
          response: response.content,
          conversationId,
          intent: nlpResult.intent,
          entities: nlpResult.entities,
          confidence: nlpResult.confidence,
          suggestedActions: response.suggestedActions || [],
          requiresFollowup: response.requiresFollowup || false
        }
      };
    } catch (error) {
      logger.error(`ChatAgent message processing error:`, error);
      conversation.history.push({
        role: 'agent', content: "I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(), metadata: { error: error.message }
      });
      this.conversations.set(conversationId, conversation);
      return { success: false, error: error.message, data: { conversationId } };
    }
  }

  async startConversation(payload) {
    const { userId, companyId, initialMessage } = payload;
    const conversationId = uuidv4();

    const conversation = this.createNewConversation(conversationId, userId, companyId);
    this.conversations.set(conversationId, conversation);

    if (initialMessage) {
      const initialResponse = await this.handleChatMessage({
        message: initialMessage, conversationId, userId, companyId
      });
      return { success: true, data: { conversationId, initialResponse: initialResponse.data } };
    }

    return {
      success: true,
      data: {
        conversationId, userId, companyId,
        startedAt: new Date().toISOString(),
        welcomeMessage: "Hello! I'm your SokogateOS AI assistant. How can I help with your trade operations today?"
      }
    };
  }

  async endConversation(payload) {
    const { conversationId } = payload;
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    const summary = await this.generateConversationSummary(conversation);
    await this.memory.store(`conversation:${conversationId}`, { summary, history: conversation.history }, { persist: true });
    this.conversations.delete(conversationId);

    return {
      success: true,
      data: { conversationId, summary, endedAt: new Date().toISOString() }
    };
  }

  async getConversationHistory(payload) {
    const { conversationId } = payload;
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }
    return { success: true, data: { conversationId, history: conversation.history } };
  }

  createNewConversation(conversationId, userId, companyId) {
    return {
      id: conversationId,
      userId,
      companyId,
      startedAt: new Date().toISOString(),
      history: [],
      context: {
        currentIntent: null,
        extractedEntities: {},
        previousAgentHandoffs: []
      }
    };
  }

  async processNaturalLanguage(message, conversation) {
    const lower = message.toLowerCase();
    const intent = this.detectIntent(lower);
    const entities = this.extractEntities(lower);

    conversation.context.currentIntent = intent;
    conversation.context.extractedEntities = { ...conversation.context.extractedEntities, ...entities };

    const needsHandoff = ['sourcing', 'customization', 'logistics', 'compliance', 'negotiation'].includes(intent);

    return {
      intent,
      entities,
      confidence: entities.length > 0 ? 0.85 : 0.6,
      needsHandoff,
      originalMessage: message
    };
  }

  detectIntent(message) {
    const patterns = {
      sourcing: /\b(source|find|discover|procure|buy|purchase|supplier|vendor)\b/i,
      customization: /\b(customiz\w*|customise|brand|label|design|modify|spec)\b/i,
      logistics: /\b(ship|logistics|freight|deliver|cargo|container|route|track)\b/i,
      compliance: /\b(compliance|regulat\w*|certif\w*|permit|license|customs|duty|tax)\b/i,
      negotiation: /\b(negotiat\w*|price|discount|deal|offer|contract|term)\b/i,
      greeting: /\b(hi|hello|hey|good\s*(morning|afternoon|evening))\b/i,
      help: /\b(help|support|guide|how\s*(to|do|can))\b/i,
      status: /\b(status|progress|update|what'?s\s*(up|new)|dashboard)\b/i
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) return intent;
    }
    return 'general';
  }

  extractEntities(message) {
    const entities = {};

    const productMatch = message.match(/\b(?:product|item|goods)\s*(?:\#|num(?:ber)?\s*)?(\w+)/i);
    if (productMatch) entities.productId = productMatch[1];

    const quantityMatch = message.match(/(\d+)\s*(?:units|pieces|qty|quantity|items)/i);
    if (quantityMatch) entities.quantity = parseInt(quantityMatch[1]);

    const priceMatch = message.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?|(?:USD|KSh|NGN|CNY|KRW)\s*\d+)/i);
    if (priceMatch) entities.price = priceMatch[1];

    const locationMatch = message.match(/\b(from|to|in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
	    if (locationMatch) entities.location = locationMatch[2];

	    return entities;
	  }

	  /**
	   * Generate a response based on NLP result and conversation context
	   * @param {Object} nlpResult - The NLP processing result
	   * @param {Object} conversation - The conversation context
	   * @returns {Promise<Object>} - Generated response
	   */
	  async generateResponse(nlpResult, conversation) {
	    const responseTemplates = {
	      greeting: "Hello! How can I assist with your trade operations today? I can help with sourcing, customization, logistics, and more.",
	      sourcing: "I can help you find products and suppliers. Would you like to search for specific products or verify a supplier?",
	      customization: "I can help customize your products. Tell me what specifications or branding you need.",
	      logistics: "I can assist with shipping and logistics. What are your shipping requirements?",
	      compliance: "I can help with compliance and regulatory requirements. What regulations are you concerned about?",
	      negotiation: "I can help with price negotiations and contract terms. What would you like to negotiate?",
	      help: "I'm your SokogateOS AI assistant. I can help with:\n- Product sourcing and supplier verification\n- Product customization and branding\n- Shipping and logistics coordination\n- Compliance and regulatory checks\n- Price negotiations\nWhat would you like help with?",
	      status: "Let me check on that for you. One moment please.",
	      general: "I understand. Could you provide more details so I can better assist you with your trade operations?"
	    };

	    const response = responseTemplates[nlpResult.intent] || responseTemplates.general;
	    const suggestedActions = this.getSuggestedActions(nlpResult.intent);

	    return {
	      content: response,
	      metadata: { intent: nlpResult.intent, confidence: nlpResult.confidence },
	      suggestedActions,
	      requiresFollowup: nlpResult.intent !== 'greeting' && nlpResult.intent !== 'help'
	    };
	  }

	  /**
	   * Get suggested actions based on detected intent
	   * @param {string} intent - The detected intent
	   * @returns {string[]} - Suggested actions
	   */
	  getSuggestedActions(intent) {
	    const actionMap = {
	      sourcing: ['Search products', 'Verify supplier', 'Get pricing'],
	      customization: ['Start customization', 'View options', 'Get quote'],
	      logistics: ['Create shipment', 'Track shipment', 'Estimate cost'],
	      compliance: ['Check compliance', 'View requirements', 'Validate documents'],
	      negotiation: ['Start negotiation', 'View terms', 'Compare prices'],
	      greeting: ['Start sourcing', 'Customize product', 'Track shipment'],
	      help: ['View all features', 'Start tutorial', 'Contact support'],
	      general: ['Search products', 'Get help', 'Track order']
	    };
	    return actionMap[intent] || ['Get help'];
	  }

	  /**
	   * Handoff to a specialized agent when the task requires domain expertise
	   * @param {Object} nlpResult - The NLP processing result
	   * @param {Object} conversation - The conversation context
	   * @param {Object} payload - The original message payload
	   * @returns {Promise<Object>} - Handoff result
	   */
	  async handoffToSpecializedAgent(nlpResult, conversation, payload) {
	    const agentMap = {
	      sourcing: 'sourcing',
	      customization: 'customization',
	      logistics: 'logistics',
	      compliance: 'compliance',
	      negotiation: 'negotiation'
	    };

	    const targetAgentType = agentMap[nlpResult.intent];
	    if (!targetAgentType) {
	      return { success: false, error: `No specialized agent for intent: ${nlpResult.intent}` };
	    }

	    conversation.context.previousAgentHandoffs.push({
	      agentType: targetAgentType,
	      timestamp: new Date().toISOString(),
	      context: { intent: nlpResult.intent, entities: nlpResult.entities }
	    });

	    return {
	      success: true,
	      data: {
	        handoff: true,
	        targetAgent: targetAgentType,
	        context: {
	          intent: nlpResult.intent,
	          entities: nlpResult.entities,
	          originalMessage: payload.message,
	          conversationId: payload.conversationId
	        },
	        message: `Let me connect you with our ${targetAgentType} specialist to handle this request.`
	      }
	    };
	  }

	  /**
	   * Get agent status information
	   * @returns {Object} - Agent status
	   */
	  getAgentStatus() {
	    return {
	      agentId: this.id,
	      agentType: this.type,
	      status: this.state.status,
	      activeConversations: this.conversations.size,
	      capabilities: this.capabilities,
	      uptime: Date.now() - this.state.createdAt
	    };
	  }

	  /**
	   * Get system capabilities
	   * @returns {Object} - System capabilities
	   */
	  getSystemCapabilities() {
	    return {
	      agents: ['chat', 'sourcing', 'customization', 'logistics', 'compliance', 'negotiation'],
	      features: [
	        'Product sourcing and discovery',
	        'Supplier verification',
	        'Product customization and branding',
	        'Logistics and shipping coordination',
	        'Compliance and regulatory checks',
	        'Price negotiation',
	        'Market analysis',
	        'Real-time tracking'
	      ],
	      integrations: ['Kafka', 'Self-Improving Loop', 'QMe Task Runner', 'LangChain Orchestrator']
	    };
	  }

	  /**
	   * Get help information
	   * @returns {Object} - Help information
	   */
	  getHelpInfo() {
	    return {
	      description: 'SokogateOS AI Assistant - Your trade operations co-pilot',
	      commands: [
	        { command: 'source [product]', description: 'Find suppliers for a product' },
	        { command: 'customize [product]', description: 'Customize a product' },
	        { command: 'ship [product] to [destination]', description: 'Arrange shipping' },
	        { command: 'check compliance for [product]', description: 'Check compliance requirements' },
	        { command: 'negotiate price for [product]', description: 'Negotiate pricing' },
	        { command: 'track [shipment]', description: 'Track a shipment' },
	        { command: 'help', description: 'Show this help message' }
	      ]
	    };
	  }

	  /**
	   * Generate a summary of the conversation
	   * @param {Object} conversation - The conversation to summarize
	   * @returns {Promise<string>} - Conversation summary
	   */
	  async generateConversationSummary(conversation) {
	    const messageCount = conversation.history.length;
	    const intents = conversation.history
	      .filter(h => h.metadata?.intent)
	      .map(h => h.metadata.intent);
	    const uniqueIntents = [...new Set(intents)];

	    return `Conversation summary: ${messageCount} messages exchanged, covering: ${uniqueIntents.join(', ') || 'general assistance'}. Started: ${conversation.startedAt}`;
	  }
	}

	module.exports = ChatAgent;
