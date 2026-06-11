// Base Agent for Hermes Agent System
// Provides common functionality for all specialized agents
const logger = require('../../../utils/logger');
const sentryService = require('../../../services/error/sentryService').SentryService;

class BaseAgent {
  constructor(options = {}) {
    this.config = options.config || {};
    this.name = options.name || 'base';
    this.hermes = options.hermes || null;
    this.qme = options.qme || null;
    this.state = {
      lastActivity: null,
      status: 'initialized',
      errorCount: 0,
      successCount: 0
    };

    // Bind methods for proper context
    this._initializeAgent = this._initializeAgent.bind(this);
    this._runAgentTask = this._runAgentTask.bind(this);
    this.getStatus = this.getStatus.bind(this);
  }

  /**
   * Agent-specific initialization
   * @protected
   */
  async _initializeAgent() {
    // Override in specialized agents
    logger.info(`BaseAgent: Agent ${this.name} initialized`);
  }

  /**
   * Agent-specific task logic
   * @protected
   * @abstract
   * @returns {Promise<Object>} Agent results
   */
  async _runAgentTask() {
    // Override in specialized agents
    throw new Error('_runAgentTask must be implemented by specialized agent');
  }

  /**
   * Track event for analytics/monitoring
   * @protected
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Event properties
   * @returns {Promise<void>}
   */
  async trackEvent(eventName, properties = {}) {
    try {
      logger.debug(`BaseAgent: Tracking event ${eventName}`, properties);

      // In production, this would send to analytics services
      // For now, just log
      if (this.config.enableAnalytics !== false) {
        logger.info(`BaseAgent: Event tracked - ${eventName}`, {
          agent: this.name,
          timestamp: new Date().toISOString(),
          ...properties
        });
      }
    } catch (error) {
      logger.warn(`BaseAgent: Failed to track event ${eventName}:`, error);
    }
  }

  /**
   * Update agent state
   * @protected
   * @param {Object} updates - State updates
   * @returns {void}
   */
  _updateState(updates) {
    this.state = {
      ...this.state,
      ...updates,
      lastActivity: new Date().toISOString()
    };
  }

  /**
   * Increment success counter
   * @protected
   * @returns {void}
   */
  _incrementSuccess() {
    this.state.successCount += 1;
    this._updateState({});
  }

  /**
   * Increment error counter
   * @protected
   * @returns {void}
   */
  _incrementError() {
    this.state.errorCount += 1;
    this._updateState({});
  }

  /**
   * Get agent status
   * @returns {Object} Agent status
   */
  getStatus() {
    return {
      name: this.name,
      status: this.state.status,
      lastActivity: this.state.lastActivity,
      successCount: this.state.successCount,
      errorCount: this.state.errorCount,
      uptime: this.state.lastActivity ?
        Date.now() - new Date(this.state.lastActivity).getTime() : 0
    };
  }

  /**
   * Handle agent error
   * @protected
   * @param {Error} error - Error to handle
   * @returns {void}
   */
  async _handleError(error) {
    this._incrementError();
    logger.error(`BaseAgent: Agent ${this.name} error:`, error);

    // Report to Sentry if configured
    if (this.config.enableSentry !== false && sentryService) {
      try {
        await sentryService.captureException(error, {
          tags: { agent: this.name },
          extra: { state: this.state }
        });
      } catch (sentryError) {
        logger.warn('BaseAgent: Failed to send error to Sentry:', sentryError);
      }
    }
  }
}

module.exports = { BaseAgent };