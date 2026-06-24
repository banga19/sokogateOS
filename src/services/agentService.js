// Agent Service for sokogateOS Autonomous AI Agent Engine
// Initializes and manages the agent system, integrating with Self-Improving Loop,
// LangChain Orchestrator, and the unified Tool Registry (Apify + Composio).

const AgentManager = require('../agents/agentManager');
const { ChatAgent, SourcingAgent, CustomizationAgent, LogisticsAgent, ComplianceAgent, NegotiationAgent } = require('../agents');
const logger = require('../utils/logger');
const selfImprovingLoop = require('../engine/selfImprovingLoop');
const langchainOrchestrator = require('./langchainOrchestrator');
const toolRegistry = require('./toolRegistry');
const composioService = require('./composioService');

class AgentService {
  constructor() {
    this.agentManager = new AgentManager();
    this.isInitialized = false;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Initialize the agent service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Agent service is already initialized');
      return;
    }

    try {
      logger.info('Initializing agent service...');

      // Register all agent types
      this.registerAgentTypes();

      // Initialize self-improving loop integration
      await this.initializeSelfImprovingLoopIntegration();

      // Initialize LangChain orchestrator integration
      await this.initializeLangChainIntegration();

      this.isInitialized = true;
      logger.info('Agent service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize agent service:', error);
      throw error;
    }
  }

  /**
   * Register all agent types with the agent manager
   * @private
   */
  registerAgentTypes() {
    logger.info('Registering agent types...');

    // Register chat agent
    this.agentManager.registerAgentType('chat', ChatAgent);

    // Register specialized agents
    this.agentManager.registerAgentType('sourcing', SourcingAgent);
    this.agentManager.registerAgentType('customization', CustomizationAgent);
    this.agentManager.registerAgentType('logistics', LogisticsAgent);
    this.agentManager.registerAgentType('compliance', ComplianceAgent);
    this.agentManager.registerAgentType('negotiation', NegotiationAgent);

    logger.info('All agent types registered');
  }

  /**
   * Initialize integration with self-improving loop engine
   * @private
   */
  async initializeSelfImprovingLoopIntegration() {
    try {
      // Check if self-improving loop is available
      if (selfImprovingLoop && typeof selfImprovingLoop.submitFeedback === 'function') {
        logger.info('Self-improving loop integration enabled');
        // The integration happens at the agent level when they learn from tasks
        // This is handled in the baseAgent.js learnFromTask method
      } else {
        logger.warn('Self-improving loop not available for integration');
      }
    } catch (error) {
      logger.warn('Could not initialize self-improving loop integration:', error.message);
    }
  }

  /**
   * Initialize integration with LangChain orchestrator
   * @private
   */
  async initializeLangChainIntegration() {
    try {
      // Check if LangChain orchestrator is available
      if (langchainOrchestrator && typeof langchainOrchestrator.runTaskWithRAG === 'function') {
        logger.info('LangChain orchestrator integration enabled');
        // Integration happens at the agent level when processing tasks
        // Agents can optionally use LangChain for RAG-enhanced processing
      } else {
        logger.warn('LangChain orchestrator not available for integration');
      }
    } catch (error) {
      logger.warn('Could not initialize LangChain orchestrator integration:', error.message);
    }
  }

  /**
   * Get the agent manager instance
   * @returns {AgentManager} - The agent manager
   */
  getAgentManager() {
    return this.agentManager;
  }

  /**
   * Get tools available for a specific agent type from the unified registry.
   * Combines local, Apify, and Composio-provided tools.
   * @param {string} agentType - Agent type (sourcing, logistics, compliance, etc.)
   * @param {string} [userId='system'] - User/company ID for Composio tool access
   * @returns {Promise<Object>} { local, apify, composio, all } tool sets
   */
  async getToolsForAgent(agentType, userId = 'system') {
    return this.toolRegistry.getToolsForAgent(agentType, userId);
  }

  /**
   * Get the tool registry instance
   * @returns {Object} - The tool registry
   */
  getToolRegistry() {
    return this.toolRegistry;
  }

  /**
   * Get Composio service instance
   * @returns {Object} - The Composio service
   */
  getComposioService() {
    return composioService;
  }

  /**
   * Spawn an agent of the specified type
   * @param {string} type - Type of agent to spawn
   * @param {Object} options - Agent configuration options
   * @returns {Promise<BaseAgent>} - The spawned agent instance
   */
  async spawnAgent(type, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Agent service not initialized');
    }
    return this.agentManager.spawnAgent(type, options);
  }

  /**
   * Assign a task to the most suitable agent
   * @param {Object} task - Task to assign
   * @returns {Promise<Object>} - Result of task execution
   */
  async assignTaskToAgent(task) {
    if (!this.isInitialized) {
      throw new Error('Agent service not initialized');
    }
    return this.agentManager.assignTaskToAgent(task);
  }

  /**
   * Get agent service statistics
   * @returns {Object} - Service statistics
   */
  getStats() {
    if (!this.isInitialized) {
      return { error: 'Agent service not initialized' };
    }
    return {
      ...this.agentManager.getStats(),
      toolRegistry: this.toolRegistry.getServiceStatus(),
      composio: composioService.getServiceStatus(),
    };
  }

  /**
   * Shutdown all agents and clean up resources
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Shutting down agent service...');
    await this.agentManager.shutdownAll();
    this.isInitialized = false;
    logger.info('Agent service shut down');
  }
}

// Create and export a singleton instance
const agentService = new AgentService();
module.exports = agentService;