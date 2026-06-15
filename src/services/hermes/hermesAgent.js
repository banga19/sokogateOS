const { ResearchAgent } = require('./agents/specialized/researchAgent');
const { AnalysisAgent } = require('./agents/specialized/analysisAgent');
const { OptimizationAgent } = require('./agents/specialized/optimizationAgent');
const { ComplianceAgent } = require('./agents/specialized/complianceAgent');
const { MarketIntelligenceAgent } = require('./agents/specialized/marketIntelligenceAgent');
const logger = require('../../utils/logger');
const { SentryService } = require('../../services/error/sentryService');

class HermesAgent {
  constructor(options = {}) {
    this.agents = {};
    this.config = options.config; // Keep null if passed
    this.runInterval = this.config && this.config.runInterval ? this.config.runInterval : 300000; // 5 minutes
    this.isRunning = false;
    this.hermesId = `hermes_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.scheduleInterval = null;
  }

  async initialize() {
    try {
      if (this.config === null) {
        throw new Error('Config cannot be null');
      }
      logger.info(`Hermes Agent ${this.hermesId}: Initializing specialized agents...`);

      // Initialize all specialized agents
      this.agents.research = new ResearchAgent({
        ...this.config,
        hermes: this
      });
      this.agents.analysis = new AnalysisAgent({
        ...this.config,
        hermes: this
      });
      this.agents.optimization = new OptimizationAgent({
        ...this.config,
        hermes: this
      });
      this.agents.compliance = new ComplianceAgent({
        ...this.config,
        hermes: this
      });
      this.agents.marketIntelligence = new MarketIntelligenceAgent({
        ...this.config,
        hermes: this
      });

      // Initialize each agent
      for (const [name, agent] of Object.entries(this.agents)) {
        await agent._initializeAgent();
        logger.info(`Hermes Agent ${this.hermesId}: ${name} agent initialized`);
      }

      logger.info(`Hermes Agent ${this.hermesId}: All specialized agents initialized`);
    } catch (error) {
      logger.error(`Hermes Agent ${this.hermesId}: Initialization failed:`, error);
      throw error;
    }
  }

  async runCycle() {
    if (this.isRunning) {
      logger.warn(`Hermes Agent ${this.hermesId}: Cycle already running, skipping`);
      return;
    }

    this.isRunning = true;
    const cycleStart = Date.now();

    try {
      logger.info(`Hermes Agent ${this.hermesId}: Starting agent cycle...`);

      // Run all agents in parallel for efficiency
      const agentPromises = Object.entries(this.agents).map(
        async ([name, agent]) => {
          try {
            logger.debug(`Hermes Agent ${this.hermesId}: Running ${name} agent`);
            const result = await agent._runAgentTask();
            logger.info(`Hermes Agent ${this.hermesId}: ${name} agent completed`, result);
            return { name, success: true, result };
          } catch (error) {
            logger.error(`Hermes Agent ${this.hermesId}: ${name} agent failed:`, error);
            return { name, success: false, error: error.message };
          }
        }
      );

      const results = await Promise.all(agentPromises);

      // Trigger self-improving loop with cycle results
      await this._triggerSelfImprovingLoop(results);

      logger.info(`Hermes Agent ${this.hermesId}: Cycle completed in ${Date.now() - cycleStart}ms`);

      return {
        success: true,
        cycleDurationMs: Date.now() - cycleStart,
        agentResults: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Hermes Agent ${this.hermesId}: Cycle failed:`, error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async _triggerSelfImprovingLoop(agentResults) {
    try {
      // Prepare feedback for self-improving loop
      const feedback = {
        type: 'hermes_cycle_completion',
        timestamp: new Date().toISOString(),
        agentPerformance: agentResults.map(r => ({
          agent: r.name,
          success: r.success,
          duration: r.result ? r.result.timestamp : null,
          error: r.error
        })),
        summary: {
          totalAgents: agentResults.length,
          successfulAgents: agentResults.filter(r => r.success).length,
          failedAgents: agentResults.filter(r => !r.success).length
        }
      };

      // Send to self-improving loop engine
      const selfImprovingLoop = require('../../engine/selfImprovingLoop');
      await selfImprovingLoop.submitFeedback(feedback);

      logger.info(`Hermes Agent ${this.hermesId}: Feedback sent to self-improving loop`);
    } catch (error) {
      logger.warn(`Hermes Agent ${this.hermesId}: Failed to trigger self-improving loop:`, error);
    }
  }

  startScheduledRuns() {
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
    }

    logger.info(`Hermes Agent ${this.hermesId}: Starting scheduled runs every ${this.runInterval}ms`);
    this.scheduleInterval = setInterval(() => this.runCycle(), this.runInterval);
  }

  stopScheduledRuns() {
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
      logger.info(`Hermes Agent ${this.hermesId}: Scheduled runs stopped`);
    }
  }

  async getStatus() {
    const agentStatuses = {};
    for (const [name, agent] of Object.entries(this.agents)) {
      agentStatuses[name] = agent.getStatus ? agent.getStatus() : { status: 'unknown' };
    }

    return {
      isRunning: this.isRunning,
      scheduled: !!this.scheduleInterval,
      runInterval: this.runInterval,
      agents: agentStatuses,
      hermesId: this.hermesId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process a task using Hermes' specialized agents
   * @param {Object} task - The task to process
   * @returns {Promise<Object>} - Task result
   */
  async processTask(task) {
    try {
      logger.info(`Hermes Agent ${this.hermesId}: Processing task ${task.type || 'unknown'}`);

      // Analyze the task and delegate to appropriate specialized agent
      const result = await this._delegateTaskToSpecializedAgent(task);

      // Learn from the task outcome via self-improving loop
      await this._learnFromTask(task, result, true);

      return { success: true, result };
    } catch (error) {
      logger.error(`Hermes Agent ${this.hermesId}: Task processing failed:`, error);
      // Learn from the task outcome via self-improving loop
      await this._learnFromTask(task, null, false, error.message);
      throw error;
    }
  }

  /**
   * Delegate task to appropriate specialized agent
   * @param {Object} task - The task to delegate
   * @returns {Promise<Object>} - Task result
   * @private
   */
  async _delegateTaskToSpecializedAgent(task) {
    const taskType = task.type || '';

    // Map task types to specialized agents
    const taskToAgentMap = {
      // Research tasks
      'market_research': 'research',
      'trend_analysis': 'research',
      'competitor_analysis': 'research',
      'opportunity_identification': 'research',
      'information_gathering': 'research',
      'supplier_research': 'research', // Research supplier intelligence and trade opportunities
      'buyer_research': 'research', // Research buyer intelligence and procurement needs
      'trade_opportunity_analysis': 'research', // Analyze trade opportunities and market trends
      'trade_risk_assessment': 'research', // Assess risks in trade transactions

      // Analysis tasks
      'data_analysis': 'analysis',
      'pattern_recognition': 'analysis',
      'performance_analysis': 'analysis',
      'risk_assessment': 'analysis',
      'forecasting': 'analysis',
      'onboarding_personalization': 'analysis', // Personalize user experience based on onboarding data

      // Optimization tasks
      'route_optimization': 'optimization',
      'resource_allocation': 'optimization',
      'process_optimization': 'optimization',
      'cost_reduction': 'optimization',
      'efficiency_improvement': 'optimization',

      // Compliance tasks
      'regulatory_check': 'compliance',
      'compliance_verification': 'compliance',
      'risk_compliance': 'compliance',
      'audit_preparation': 'compliance',
      'policy_review': 'compliance',

      // Market intelligence tasks
      'market_intelligence': 'marketIntelligence',
      'competitive_intelligence': 'marketIntelligence',
      'customer_insights': 'marketIntelligence',
      'pricing_analysis': 'marketIntelligence',
      'market_entry_strategy': 'marketIntelligence'
    };

    const agentName = taskToAgentMap[taskType] || 'research'; // Default to research for unknown tasks
    const agent = this.agents[agentName];

    if (!agent) {
      throw new Error(`Specialized agent '${agentName}' not found for task type '${taskType}'`);
    }

    // Initialize the agent if not already initialized
    if (!agent.isInitialized) {
      await agent._initializeAgent();
    }

    // Execute the task using the specialized agent
    return await agent._runAgentTaskForHermes(task);
  }

  /**
   * Learn from task execution and outcomes via self-improving loop
   * @param {Object} task - The task that was executed
   * @param {Object} result - The task result
   * @param {boolean} success - Whether the task succeeded
   * @param {string} [errorMessage] - Optional error message
   * @returns {Promise<void>}
   * @private
   */
  async _learnFromTask(task, result, success, errorMessage) {
    try {
      const feedback = {
        type: 'hermes_task_processing',
        timestamp: new Date().toISOString(),
        taskType: task.type || 'unknown',
        success,
        result: result ? JSON.stringify(result).substring(0, 500) : null,
        error: errorMessage || null,
        metadata: {
          duration: Date.now() - (task.startedAt || Date.now()),
          complexity: task.complexity || 'medium'
        }
      };

      // Send to self-improving loop engine
      const selfImprovingLoop = require('../../engine/selfImprovingLoop');
      await selfImprovingLoop.submitFeedback(feedback);

      logger.debug(`Hermes Agent ${this.hermesId}: Learned from task: ${task.type || 'unknown'}`);
    } catch (error) {
      logger.warn(`Hermes Agent ${this.hermesId}: Failed to record learning for task:`, error.message);
    }
  }

  shutdown() {
    this.stopScheduledRuns();
    logger.info(`Hermes Agent ${this.hermesId}: Shutdown complete`);
  }
}

module.exports = { HermesAgent };