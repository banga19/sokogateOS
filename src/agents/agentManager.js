// Agent Management System for sokogateOS Autonomous AI Agent Engine
// Handles agent lifecycle, spawning, task assignment, and monitoring

const BaseAgent = require('./baseAgent');
const AgentCommunication = require('./communication');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Simple priority queue for task prioritization
 */
class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(task, priority = 0) {
    this.queue.push({ task, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  dequeue() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  size() {
    return this.queue.length;
  }
}

class AgentManager {
  constructor() {
    this.agents = new Map(); // agentId => agent instance
    this.agentTypes = new Map(); // type => constructor function
    this.taskQueue = new PriorityQueue();
    this.workloadStats = {};
    this.healthCheckIntervals = new Map(); // agentId => intervalId
  }

  /**
   * Register an agent type with the manager
   * @param {string} type - Agent type identifier
   * @param {Function} constructor - Constructor function for the agent type
   */
  registerAgentType(type, constructor) {
    if (typeof constructor !== 'function') {
      throw new Error(`Agent type constructor must be a function`);
    }
    this.agentTypes.set(type, constructor);
    logger.info(`Registered agent type: ${type}`);
  }

  /**
   * Spawn a new agent of the specified type
   * @param {string} type - Type of agent to spawn
   * @param {Object} options - Agent configuration options
   * @returns {Promise<BaseAgent>} - The spawned agent instance
   */
  async spawnAgent(type, options = {}) {
    const Constructor = this.agentTypes.get(type);
    if (!Constructor) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    try {
      logger.info(`Spawning agent of type: ${type}`);

      const agent = new Constructor(options);
      await agent.initialize();

      this.agents.set(agent.id, agent);

      // Start health monitoring for this agent
      this.startAgentHealthMonitor(agent);

      logger.info(`Agent spawned successfully: ${agent.id} (${type})`);
      return agent;
    } catch (error) {
      logger.error(`Failed to spawn agent of type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Assign a task to the most suitable agent
   * @param {Object} task - Task to assign
   * @returns {Promise<Object>} - Result of task execution
   */
  async assignTaskToAgent(task) {
    // Determine best agent for task based on:
    // - Agent capabilities matching task requirements
    // - Current workload and availability
    // - Historical performance on similar tasks
    // - Agent health status

    const bestAgent = this.selectOptimalAgent(task);
    if (!bestAgent) {
      // Queue task or spawn new agent if needed
      logger.warn(`No suitable agent available for task, queuing: ${task.type || task.description}`);
      this.taskQueue.enqueue(task, task.priority || 0);
      return null;
    }

    logger.info(`Assigning task to agent: ${bestAgent.id} (${bestAgent.type})`);
    return bestAgent.executeTask(task);
  }

  /**
   * Select the optimal agent for a given task
   * @param {Object} task - Task to assign
   * @returns {BaseAgent|null} - The selected agent or null if none suitable
   */
  selectOptimalAgent(task) {
    let bestAgent = null;
    let bestScore = -Infinity;

    for (const [agentId, agent] of this.agents.entries()) {
      // Skip agents that are not ready or are overloaded
      if (agent.state.status !== 'ready' && agent.state.status !== 'idle') {
        continue;
      }

      // Calculate suitability score
      const score = this.calculateAgentSuitability(agent, task);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  /**
   * Calculate how suitable an agent is for a given task
   * @param {BaseAgent} agent - Agent to evaluate
   * @param {Object} task - Task to evaluate against
   * @returns {number} - Suitability score (higher is better)
   */
  calculateAgentSuitability(agent, task) {
    let score = 0;

    // Check if agent has required capabilities
    if (task.requiredCapabilities && Array.isArray(task.requiredCapabilities)) {
      const hasAllCapabilities = task.requiredCapabilities.every(cap =>
        agent.capabilities.includes(cap)
      );
      if (!hasAllCapabilities) {
        return -Infinity; // Agent doesn't have required capabilities
      }
      score += hasAllCapabilities ? 10 : 0;
    }

    // Prefer agents with matching type
    if (task.agentType && agent.type === task.agentType) {
      score += 5;
    }

    // Factor in agent workload (lower workload is better)
    const workloadFactor = this.getAgentWorkloadFactor(agent.id);
    score += workloadFactor * 3; // Max 3 points for workload

    // Factor in agent health
    const healthFactor = this.getAgentHealthFactor(agent.id);
    score += healthFactor * 2; // Max 2 points for health

    // Prefer agents that have been idle longer (better load distribution)
    const idleTime = Date.now() - agent.state.lastActivity;
    score += Math.min(idleTime / 10000, 5); // Max 5 points for idle time

    return score;
  }

  /**
   * Get workload factor for an agent (0-1, where 1 is idle, 0 is overloaded)
   * @param {string} agentId - Agent ID
   * @returns {number} - Workload factor
   */
  getAgentWorkloadFactor(agentId) {
    // In a full implementation, this would track actual task counts
    // For now, return a randomized factor based on time since last activity
    const agent = this.agents.get(agentId);
    if (!agent) return 0;

    const timeSinceLastActivity = Date.now() - agent.state.lastActivity;
    // Normalize to 0-1 range (assuming 5 minutes max idle time for full score)
    return Math.min(timeSinceLastActivity / (5 * 60 * 1000), 1);
  }

  /**
   * Get health factor for an agent (0-1, where 1 is healthy, 0 is unhealthy)
   * @param {string} agentId - Agent ID
   * @returns {number} - Health factor
   */
  getAgentHealthFactor(agentId) {
    // In a full implementation, this would check actual health metrics
    // For now, assume healthy if agent exists and is initialized
    const agent = this.agents.get(agentId);
    return agent && agent.isInitialized ? 1 : 0;
  }

  /**
   * Start health monitoring for an agent
   * @param {BaseAgent} agent - Agent to monitor
   */
  startAgentHealthMonitor(agent) {
    // Clear any existing interval
    if (this.healthCheckIntervals.has(agent.id)) {
      clearInterval(this.healthCheckIntervals.get(agent.id));
    }

    // Set up health check interval (every 30 seconds)
    const intervalId = setInterval(() => {
      this.performHealthCheck(agent);
    }, 30 * 1000); // 30 seconds

    this.healthCheckIntervals.set(agent.id, intervalId);
    logger.debug(`Started health monitoring for agent ${agent.id}`);
  }

  /**
   * Perform health check on an agent
   * @param {BaseAgent} agent - Agent to check
   */
  async performHealthCheck(agent) {
    try {
      // Check if agent is still responsive
      if (!agent.isInitialized) {
        logger.warn(`Agent ${agent.id} is not initialized, attempting recovery`);
        await this.recoverAgent(agent);
        return;
      }

      // Update last activity timestamp if agent is still responsive
      agent.updateState({ lastActivity: Date.now() });

      logger.debug(`Health check passed for agent ${agent.id}`);
    } catch (error) {
      logger.error(`Health check failed for agent ${agent.id}:`, error);
      await this.handleAgentFailure(agent);
    }
  }

  /**
   * Attempt to recover a failed agent
   * @param {BaseAgent} agent - Agent to recover
   */
  async recoverAgent(agent) {
    logger.info(`Attempting to recover agent ${agent.id}`);
    try {
      await agent.initialize();
      logger.info(`Agent ${agent.id} recovered successfully`);
	    } catch (error) {
	      logger.error(`Failed to recover agent ${agent.id}:`, error);
	    }
	  }

	  /**
	   * Handle agent failure - log, alert, and attempt cleanup
	   * @param {BaseAgent} agent - The failed agent
	   * @returns {Promise<void>}
	   */
	  async handleAgentFailure(agent) {
	    logger.error(`Handling failure for agent ${agent.id} (${agent.type})`);
	    try {
	      if (typeof agent.shutdown === 'function') {
	        await agent.shutdown();
	      }
	      this.agents.delete(agent.id);
	      logger.info(`Agent ${agent.id} removed after failure`);
	    } catch (error) {
	      logger.error(`Error during agent ${agent.id} failure handling:`, error);
	      this.agents.delete(agent.id);
	    }
	  }

	  /**
	   * Get agent manager statistics
	   * @returns {Object} - Manager statistics
	   */
	  getStats() {
	    return {
	      totalAgents: this.agents.size,
	      registeredTypes: Array.from(this.agentTypes.keys()),
	      agentsByStatus: this.getAgentStatusBreakdown(),
	      queueSize: this.taskQueue.size(),
	      uptime: Date.now() - (this.startedAt || Date.now())
	    };
	  }

	  /**
	   * Get breakdown of agents by status
	   * @returns {Object} - Status breakdown
	   */
	  getAgentStatusBreakdown() {
	    const breakdown = {};
	    for (const [, agent] of this.agents.entries()) {
	      const status = agent.state?.status || 'unknown';
	      breakdown[status] = (breakdown[status] || 0) + 1;
	    }
	    return breakdown;
	  }

	  /**
	   * Shutdown all managed agents and clean up resources
	   * @returns {Promise<void>}
	   */
	  async shutdownAll() {
	    logger.info('Shutting down all managed agents...');
	    for (const intervalId of this.healthCheckIntervals.values()) {
	      clearInterval(intervalId);
	    }
	    this.healthCheckIntervals.clear();
	    for (const [agentId, agent] of this.agents.entries()) {
	      try {
	        if (typeof agent.shutdown === 'function') {
	          await agent.shutdown();
	        }
	      } catch (error) {
	        logger.error(`Error shutting down agent ${agentId}:`, error);
	      }
	    }
	    this.agents.clear();
	    logger.info('All agents shut down');
	  }
	}

	module.exports = AgentManager;
