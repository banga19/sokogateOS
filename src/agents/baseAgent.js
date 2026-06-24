// Base Agent Class for sokogateOS Autonomous AI Agent Engine
// Provides common functionality for all specialized agents

const { v4: uuidv4 } = require('uuid');
const AgentMemory = require('./agentMemory');
const AgentCommunication = require('./communication');
const toolRegistry = require('../services/toolRegistry');
const logger = require('../utils/logger');

class BaseAgent {
  /**
   * @param {Object} options - Agent configuration options
   * @param {string} options.id - Unique agent ID (optional, will generate if not provided)
   * @param {string} options.type - Agent type (e.g., 'sourcing', 'customization', 'logistics')
   * @param {Array<string>} options.capabilities - List of agent capabilities
   * @param {Object} options.config - Agent-specific configuration
   */
  constructor(options = {}) {
    this.id = options.id || uuidv4();
    this.type = options.type || 'base';
    this.capabilities = options.capabilities || [];
    this.config = options.config || {};
    this.state = {
      status: 'idle',
      lastActivity: Date.now(),
      createdAt: Date.now(),
      currentTask: null
    };
    this.memory = new AgentMemory(this.id);
    this.communication = new AgentCommunication(this.id);
    this.toolRegistry = toolRegistry;
    this.availableTools = { local: [], apify: [], composio: [], all: [], totalCount: 0 };
    this.isInitialized = false;
  }

  /**
   * Initialize the agent - connect to communication system, load initial knowledge
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn(`Agent ${this.id} (${this.type}) is already initialized`);
      return;
    }

    try {
      logger.info(`Initializing agent ${this.id} (${this.type})...`);

      // Initialize communication system (Kafka, etc.)
      await this.communication.initialize();

      // Load initial knowledge from self-improving loop if available
      await this.loadInitialKnowledge();

      // Set up message handlers
      this.setupMessageHandlers();

      this.isInitialized = true;
      this.updateState({ status: 'ready' });

      logger.info(`Agent ${this.id} (${this.type}) initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize agent ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Load initial knowledge from self-improving loop and other sources
   * @returns {Promise<void>}
   */
  async loadInitialKnowledge() {
    try {
      // In a full implementation, this would load:
      // - Domain-specific knowledge from self-improving loop
      // - Company-specific context from knowledge graph
      // - Historical performance data
      // For now, we'll initialize with empty knowledge
      logger.debug(`Loading initial knowledge for agent ${this.id}`);
    } catch (error) {
      logger.warn(`Could not load initial knowledge for agent ${this.id}:`, error);
      // Continue without initial knowledge - not fatal
    }
  }

  /**
   * Discover available tools from the unified tool registry for this agent type.
   * Populates this.availableTools with local, Apify, and Composio tool definitions.
   * @param {string} [userId='system'] - User/company ID for tool access
   * @returns {Promise<void>}
   */
  async loadTools(userId = 'system') {
    try {
      const tools = await this.toolRegistry.getToolsForAgent(this.type, userId);
      this.availableTools = {
        local: tools.local || [],
        apify: tools.apify || [],
        composio: tools.composio || [],
        all: tools.all || [],
        totalCount: tools.totalCount || 0,
      };
      logger.info(
        `Agent ${this.id} (${this.type}): Loaded ${this.availableTools.totalCount} tools ` +
        `(${tools.local.length} local, ${tools.apify.length} apify, ${tools.composio.length} composio)`
      );
    } catch (error) {
      logger.warn(`Agent ${this.id} (${this.type}): Could not load tools:`, error.message);
      // Continue without tools — not fatal
    }
  }

  /**
   * Set up message handlers for inter-agent communication
   * @returns {void}
   */
  setupMessageHandlers() {
    // Handle direct messages to this agent
    this.communication.subscribeToMessages(async (message) => {
      try {
        await this.handleIncomingMessage(message);
      } catch (error) {
        logger.error(`Error handling message in agent ${this.id}:`, error);
        // Send error response if message expects a response
        if (message.requiresResponse && message.replyTo) {
          await this.communication.sendMessage(message.replyTo, {
            type: 'error',
            originalMessageId: message.id,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Handle broadcast messages
    this.communication.subscribeToBroadcast(async (message) => {
      try {
        await this.handleBroadcastMessage(message);
      } catch (error) {
        logger.error(`Error handling broadcast message in agent ${this.id}:`, error);
      }
    });
  }

  /**
   * Handle incoming direct message
   * @param {Object} message - The received message
   * @returns {Promise<void>}
   */
  async handleIncomingMessage(message) {
    this.updateState({ status: 'processing', lastActivity: Date.now() });

    try {
      switch (message.type) {
        case 'task':
          await this.executeTask(message.payload);
          break;
        case 'query':
          const result = await this.handleQuery(message.payload);
          if (message.requiresResponse && message.replyTo) {
            await this.communication.sendMessage(message.replyTo, {
              type: 'query_response',
              originalMessageId: message.id,
              payload: result,
              timestamp: new Date().toISOString()
            });
          }
          break;
        case 'knowledge_share':
          await this.receiveKnowledgeShare(message.payload);
          break;
        case 'command':
          await this.handleCommand(message.payload);
          break;
        case 'hermes_mediated_forward':
          // Handle messages forwarded by Hermes agent
          logger.debug(`Agent ${this.id} received Hermes-mediated message from ${message.senderId} for target ${message.originalTarget}`);
          // Extract the original message and process it as if it was sent directly
          const forwardedMessage = message.payload;
          // Preserve the original sender information for potential reply handling
          if (forwardedMessage.requiresResponse && forwardedMessage.replyTo) {
            // If the original message expected a reply, we need to route through Hermes
            forwardedMessage.replyTo = this.agentId; // Reply comes back to us
          }
          await this.handleIncomingMessage(forwardedMessage);
          break;
        default:
          logger.warn(`Unknown message type received by agent ${this.id}: ${message.type}`);
      }
    } finally {
      this.updateState({
        status: 'ready',
        lastActivity: Date.now(),
        currentTask: null
      });
    }
  }

  /**
   * Handle broadcast message
   * @param {Object} message - The broadcast message
   * @returns {Promise<void>}
   */
  async handleBroadcastMessage(message) {
    logger.debug(`Agent ${this.id} received broadcast message: ${message.type}`);
    // Broadcast messages are typically for system-wide updates
    // Agents can override this method to handle specific broadcast types
  }

  /**
   * Execute a task assigned to this agent
   * @param {Object} task - The task to execute
   * @returns {Promise<Object>} - Task result
   */
  async executeTask(task) {
    logger.info(`Agent ${this.id} executing task: ${task.type || task.description || 'unknown'}`);
    this.updateState({ status: 'executing', currentTask: task });

    try {
      // This method should be overridden by specialized agents
      const result = await this.processTask(task);

      // Learn from the task outcome via self-improving loop
      await this.learnFromTask(task, result, true);

      return { success: true, result };
    } catch (error) {
      logger.error(`Agent ${this.id} task execution failed:`, error);
      // Learn from the task outcome via self-improving loop
      await this.learnFromTask(task, null, false, error.message);
      throw error;
    }
  }

  /**
   * Process a task - to be implemented by specialized agents
   * @param {Object} task - The task to process
   * @returns {Promise<Object>} - Task result
   */
  async processTask(task) {
    throw new Error(`Agent ${this.id} (${this.type}) does not implement processTask method`);
  }

  /**
   * Handle a query request
   * @param {Object} query - The query to handle
   * @returns {Promise<Object>} - Query result
   */
  async handleQuery(query) {
    logger.debug(`Agent ${this.id} handling query: ${JSON.stringify(query)}`);
    // This method should be overridden by specialized agents
    return {
      agentId: this.id,
      agentType: this.type,
      timestamp: new Date().toISOString(),
      message: 'Query handling not implemented for this agent type'
    };
  }

  /**
   * Handle a task delegated from Hermes agent
   * @param {Object} task - The task to process
   * @returns {Promise<Object>} - Task result
   * @protected
   */
  async _runAgentTaskForHermes(task) {
    // By default, delegate to the regular processTask method
    // Specialized agents can override this for Hermes-specific handling
    return await this.processTask(task);
  }

  // ============================================================
  //  Tool Execution
  //  These methods allow agents to execute tools from the unified
  //  tool registry, routing to the appropriate service (local,
  //  Apify, or Composio) based on the tool's provider field.
  // ============================================================

  /**
   * Execute a registered tool by name with the given parameters.
   * Looks up the tool in this.availableTools, routes to the correct
   * service (local service, Apify, or Composio), and returns the result.
   *
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} params   - Parameters to pass to the tool
   * @returns {Promise<Object>} Execution result
   * @throws {Error} If the tool is not found or execution fails
   */
  async executeTool(toolName, params = {}) {
    logger.info(`Agent ${this.id} (${this.type}): Executing tool "${toolName}"`);

    // 1. Find the tool in the agent's available tools
    const tool = this.availableTools.all.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(
        `Agent ${this.id} (${this.type}): Tool "${toolName}" not found in registry. ` +
        `Available: [${this.availableTools.all.map((t) => t.name).join(', ')}]`
      );
    }

    // 2. Route to the appropriate provider
    return this._routeToolExecution(tool, params);
  }

  /**
   * Route a tool execution to the correct provider handler.
   * @param {Object} tool   - Tool definition from the registry
   * @param {Object} params - Execution parameters
   * @returns {Promise<Object>}
   * @private
   */
  async _routeToolExecution(tool, params) {
    const { provider } = tool;

    switch (provider) {
      case 'local':
        return this._executeLocalTool(tool, params);
      case 'apify':
        return this._executeApifyTool(tool, params);
      case 'composio':
        return this._executeComposioTool(tool, params);
      default:
        throw new Error(
          `Agent ${this.id}: Unknown tool provider "${provider}" for tool "${tool.name}"`
        );
    }
  }

  // ── Tool name → service method map ──
  // Maps each registered tool name to a [serviceModule, methodName] pair.
  // Services are required lazily so we only load what's needed at runtime.
  static get TOOL_EXECUTORS() {
    return {
      // ── Customs Engine (local) ──
      hs_classify:        ['customsEngineService',    'classifyProduct'],
      duty_calculate:     ['customsEngineService',    'calculateDuties'],
      compliance_check:   ['customsEngineService',    'checkCompliance'],
      route_optimize:     ['customsEngineService',    'findOptimalRoute'],

      // ── Supplier Trust (local) ──
      supplier_search:    ['supplierTrustService',    'searchSuppliers'],

      // ── Korean Compliance (local) ──
      korean_compliance_check: ['koreanComplianceService', 'checkCompliance'],

      // ── Korean Market Analysis (local) ──
      korean_market_fit:  ['koreanMarketAnalysisService', 'analyzeMarketFit'],

      // ── Apify tools ──
      supplier_enrich:    ['apifyService',            'enrichCompanyData'],
      supplier_discover:  ['apifyService',            'searchSuppliers'],
      pricing_scrape:     ['apifyService',            'scrapePricingData'],
      market_news:        ['apifyService',            'scrapeMarketNews'],
      website_crawl:      ['apifyService',            'crawlWebsite'],
      tariff_lookup:      ['apifyService',            'lookupTariffData'],
      korean_brn_validate: ['apifyService',           'validateKoreanBRN'],
      korean_pricing_scrape: ['apifyService',         'scrapePricingData'],

      // ── Composio tools (routed via composioService) ──
      send_email:         ['composioService',         '_executeComposioAction'],
      send_slack_message: ['composioService',         '_executeComposioAction'],
    };
  }

  /**
   * Execute a local-service tool (provider === 'local').
   * Requires the service module and calls the mapped method.
   * @param {Object} tool   - Tool definition
   * @param {Object} params - Execution params
   * @returns {Promise<Object>}
   * @private
   */
  async _executeLocalTool(tool, params) {
    const executor = this.constructor.TOOL_EXECUTORS[tool.name];
    if (!executor) {
      // Fallback: try the tool's service name directly
      try {
        const service = require(`../services/${tool.service}`);
        if (typeof service.processTask === 'function') {
          return await service.processTask({ type: tool.name, payload: params });
        }
        throw new Error(`Service ${tool.service} has no processTask method`);
      } catch (e) {
        throw new Error(
          `Agent ${this.id}: No executor mapping for local tool "${tool.name}". ` +
          `Service "${tool.service}" error: ${e.message}`
        );
      }
    }

    const [serviceName, methodName] = executor;
    const service = require(`../services/${serviceName}`);

    if (typeof service[methodName] !== 'function') {
      throw new Error(
        `Agent ${this.id}: Method "${methodName}" not found on service "${serviceName}" ` +
        `for tool "${tool.name}"`
      );
    }

    logger.debug(`Agent ${this.id}: Calling ${serviceName}.${methodName}()`);
    return await service[methodName](params);
  }

  /**
   * Execute an Apify-powered tool (provider === 'apify').
   * Routes through the apifyService.
   * @param {Object} tool   - Tool definition
   * @param {Object} params - Execution params
   * @returns {Promise<Object>}
   * @private
   */
  async _executeApifyTool(tool, params) {
    const executor = this.constructor.TOOL_EXECUTORS[tool.name];
    if (!executor) {
      throw new Error(
        `Agent ${this.id}: No executor mapping for Apify tool "${tool.name}"`
      );
    }

    const [serviceName, methodName] = executor;
    const service = require(`../services/${serviceName}`);

    if (typeof service[methodName] !== 'function') {
      throw new Error(
        `Agent ${this.id}: Method "${methodName}" not found on service "${serviceName}" ` +
        `for Apify tool "${tool.name}"`
      );
    }

    logger.debug(`Agent ${this.id}: Calling Apify ${serviceName}.${methodName}()`);
    return await service[methodName](params);
  }

  /**
   * Execute a Composio-powered tool (provider === 'composio').
   * Routes through composioService.executeTool with mapped action name.
   * @param {Object} tool   - Tool definition
   * @param {Object} params - Execution params
   * @returns {Promise<Object>}
   * @private
   */
  async _executeComposioTool(tool, params) {
    const composio = require('../services/composioService');
    const actionMap = {
      send_email: 'GMAIL_SEND_EMAIL',
      send_slack_message: 'SLACK_POST_MESSAGE',
    };
    const action = actionMap[tool.name] || tool.name.toUpperCase().replace(/\s+/g, '_');

    logger.debug(`Agent ${this.id}: Calling composioService.executeTool(${action})`);
    return await composio.executeTool(action, {
      userId: params.userId || 'system',
      arguments: params,
      connectedAccountId: params.connectedAccountId,
    });
  }

  /**
   * Handle a command (system control, etc.)
   * @param {Object} command - The command to handle
   * @returns {Promise<void>}
   */
  async handleCommand(command) {
    logger.debug(`Agent ${this.id} handling command: ${command.action}`);
    switch (command.action) {
      case 'shutdown':
        await this.shutdown();
        break;
      case 'reset':
        await this.reset();
        break;
      case 'get_state':
        return this.getState();
      default:
        logger.warn(`Unknown command received by agent ${this.id}: ${command.action}`);
    }
  }

  /**
   * Receive knowledge share from another agent or system
   * @param {Object} knowledge - The knowledge to receive
   * @returns {Promise<void>}
   */
  async receiveKnowledgeShare(knowledge) {
    logger.debug(`Agent ${this.id} receiving knowledge share`);
    // Store knowledge in agent's memory
    await this.memory.store(knowledge.key || `knowledge_${Date.now()}`, knowledge.value);
  }

  /**
   * Learn from task execution and outcomes via self-improving loop
   * @param {Object} task - The task that was executed
   * @param {Object} result - The task result
   * @param {boolean} success - Whether the task succeeded
   * @param {string} [errorMessage] - Optional error message
   * @returns {Promise<void>}
   */
  async learnFromTask(task, result, success, errorMessage) {
    try {
      const feedback = {
        agentId: this.id,
        agentType: this.type,
        taskType: task.type || 'unknown',
        success,
        result: result ? JSON.stringify(result).substring(0, 500) : null,
        error: errorMessage || null,
        timestamp: new Date().toISOString(),
        metadata: {
          duration: Date.now() - (task.startedAt || Date.now()),
          complexity: task.complexity || 'medium'
        }
      };
      await this.memory.store(`task:${Date.now()}`, feedback, { persist: true });
      logger.debug(`Agent ${this.id} learned from task: ${task.type || 'unknown'}`);
    } catch (error) {
      logger.warn(`Failed to record learning for agent ${this.id}:`, error.message);
    }
  }

  /**
   * Get current agent state
   * @returns {Object} - Current agent state
   */
  getState() {
    return {
      id: this.id,
      type: this.type,
      capabilities: this.capabilities,
      state: { ...this.state },
      isInitialized: this.isInitialized,
      memoryStats: this.memory.getStats(),
      tools: {
        totalCount: this.availableTools.totalCount,
        local: this.availableTools.local.length,
        apify: this.availableTools.apify.length,
        composio: this.availableTools.composio.length,
        names: this.availableTools.all.map((t) => t.name),
      },
    };
  }

  /**
   * Update agent state
   * @param {Object} updates - State updates to apply
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Gracefully shutdown the agent
   * @returns {Promise<void>}
   */
  async shutdown() {
    logger.info(`Shutting down agent ${this.id} (${this.type})...`);
    this.updateState({ status: 'shutting_down' });
    try {
      if (this.communication) {
        // Communication cleanup handled by communication module
      }
      await this.memory.store('agent:shutdown', {
        timestamp: new Date().toISOString(),
        finalState: this.getState()
      }, { persist: true });
      this.updateState({ status: 'shutdown' });
      logger.info(`Agent ${this.id} shutdown complete`);
    } catch (error) {
      logger.error(`Error during agent ${this.id} shutdown:`, error);
    }
  }

  /**
   * Reset agent to initial state
   * @returns {Promise<void>}
   */
  async reset() {
    logger.info(`Resetting agent ${this.id} (${this.type})...`);
    this.state = {
      status: 'idle',
      lastActivity: Date.now(),
      createdAt: this.state.createdAt,
      currentTask: null
    };
    await this.memory.clear();
    logger.info(`Agent ${this.id} reset complete`);
  }
}

module.exports = BaseAgent;