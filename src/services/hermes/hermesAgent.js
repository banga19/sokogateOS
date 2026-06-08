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
    this.config = options.config || {};
    this.runInterval = this.config.runInterval || 300000; // 5 minutes
    this.isRunning = false;
    this.hermesId = `hermes_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  async initialize() {
    try {
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

  shutdown() {
    this.stopScheduledRuns();
    logger.info(`Hermes Agent ${this.hermesId}: Shutdown complete`);
  }
}

module.exports = { HermesAgent };