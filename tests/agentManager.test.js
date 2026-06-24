// Agent Manager Test for SokogateOS
// Tests the AgentManager functionality including agent lifecycle, task assignment, and health monitoring

const AgentManager = require('../src/agents/agentManager');
const BaseAgent = require('../src/agents/baseAgent');
const logger = require('../src/utils/logger');

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock uuid for consistent agent IDs
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

// Create a concrete TestAgent for testing
class TestAgent extends BaseAgent {
  constructor(options = {}) {
    super({ id: options.id, type: 'test', capabilities: ['test_capability'], ...options });
    this.tasksExecuted = [];
  }

  async processTask(task) {
    this.tasksExecuted.push(task);
    return { processed: true, taskType: task.type };
  }

  async initialize() {
    this.isInitialized = true;
    this.state.status = 'ready';
  }
}

class SourceAgent extends BaseAgent {
  constructor(options = {}) {
    super({ id: options.id, type: 'sourcing', capabilities: ['sourcing', 'supplier_verification'], ...options });
  }

  async processTask(task) {
    return { agentType: 'sourcing', result: 'sourced' };
  }

  async initialize() {
    this.isInitialized = true;
    this.state.status = 'ready';
  }
}

class LogisticsAgent extends BaseAgent {
  constructor(options = {}) {
    super({ id: options.id, type: 'logistics', capabilities: ['logistics', 'tracking'], ...options });
  }

  async processTask(task) {
    return { agentType: 'logistics', result: 'shipped' };
  }

  async initialize() {
    this.isInitialized = true;
    this.state.status = 'ready';
  }
}

describe('AgentManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    manager = new AgentManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    test('should initialize empty maps and queue', () => {
      expect(manager.agents).toBeInstanceOf(Map);
      expect(manager.agentTypes).toBeInstanceOf(Map);
      expect(manager.healthCheckIntervals).toBeInstanceOf(Map);
      expect(manager.agents.size).toBe(0);
      expect(manager.agentTypes.size).toBe(0);
    });
  });

  describe('registerAgentType', () => {
    test('should register an agent type successfully', () => {
      manager.registerAgentType('test', TestAgent);
      expect(manager.agentTypes.get('test')).toBe(TestAgent);
      expect(logger.info).toHaveBeenCalledWith('Registered agent type: test');
    });

    test('should throw error when constructor is not a function', () => {
      expect(() => manager.registerAgentType('test', 'not-a-function')).toThrow(
        'Agent type constructor must be a function'
      );
    });

    test('should register multiple agent types', () => {
      manager.registerAgentType('test', TestAgent);
      manager.registerAgentType('sourcing', SourceAgent);
      expect(manager.agentTypes.size).toBe(2);
    });
  });

  describe('spawnAgent', () => {
    test('should spawn an agent successfully', async () => {
      manager.registerAgentType('test', TestAgent);
      const agent = await manager.spawnAgent('test', { id: 'agent-1' });

      expect(manager.agents.get('agent-1')).toBe(agent);
      expect(agent.id).toBe('agent-1');
      expect(agent.isInitialized).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Agent spawned'));
    });

    test('should throw error for unknown agent type', async () => {
      await expect(manager.spawnAgent('unknown')).rejects.toThrow('Unknown agent type: unknown');
      expect(manager.agents.size).toBe(0);
    });

    test('should start health monitoring after spawn', async () => {
      const spy = jest.spyOn(manager, 'startAgentHealthMonitor');
      manager.registerAgentType('test', TestAgent);
      await manager.spawnAgent('test', { id: 'agent-2' });

      expect(spy).toHaveBeenCalled();
      expect(manager.healthCheckIntervals.has('agent-2')).toBe(true);
      spy.mockRestore();
    });
  });

  describe('assignTaskToAgent', () => {
    beforeEach(async () => {
      manager.registerAgentType('sourcing', SourceAgent);
      manager.registerAgentType('logistics', LogisticsAgent);
      await manager.spawnAgent('sourcing', { id: 'source-1' });
      await manager.spawnAgent('logistics', { id: 'logistics-1' });
    });

    test('should assign task to best matching agent', async () => {
      const result = await manager.assignTaskToAgent({
        type: 'find-supplier',
        requiredCapabilities: ['sourcing'],
      });

      expect(result).toEqual({
        success: true,
        result: { agentType: 'sourcing', result: 'sourced' },
      });
    });

    test('should queue task when no suitable agent available', async () => {
      const result = await manager.assignTaskToAgent({
        type: 'unknown-task',
        requiredCapabilities: ['nonexistent_capability'],
      });

      expect(result).toBeNull();
      expect(manager.taskQueue.size()).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('queuing'));
    });

    test('should prefer agents with matching type', async () => {
      const selectSpy = jest.spyOn(manager, 'selectOptimalAgent');

      await manager.assignTaskToAgent({
        type: 'track-shipment',
        agentType: 'logistics',
      });

      expect(selectSpy).toHaveBeenCalled();
      selectSpy.mockRestore();
    });
  });

  describe('selectOptimalAgent', () => {
    test('should skip agents that are not ready', async () => {
      manager.registerAgentType('test', TestAgent);
      const agent = await manager.spawnAgent('test', { id: 'busy-agent' });
      agent.state.status = 'busy';

      const result = manager.selectOptimalAgent({ type: 'test' });
      expect(result).toBeNull();
    });

    test('should select agent with matching capabilities', async () => {
      manager.registerAgentType('sourcing', SourceAgent);
      manager.registerAgentType('logistics', LogisticsAgent);
      await manager.spawnAgent('sourcing', { id: 'source-1' });
      await manager.spawnAgent('logistics', { id: 'logistics-1' });

      const result = manager.selectOptimalAgent({
        type: 'task',
        requiredCapabilities: ['logistics'],
      });

      expect(result.type).toBe('logistics');
    });
  });

  describe('calculateAgentSuitability', () => {
    test('should return -Infinity when agent lacks required capabilities', () => {
      const agent = new TestAgent({ id: 'test', capabilities: ['basic'] });
      const score = manager.calculateAgentSuitability(agent, {
        requiredCapabilities: ['advanced'],
      });
      expect(score).toBe(-Infinity);
    });

    test('should return higher score for agents with matching capabilities', () => {
      const agent = new TestAgent({ id: 'test', capabilities: ['test_capability'] });
      const score = manager.calculateAgentSuitability(agent, {
        requiredCapabilities: ['test_capability'],
      });
      expect(score).toBeGreaterThan(0);
    });

    test('should prefer agents with matching type', () => {
      const agent = new TestAgent({ id: 'test', type: 'sourcing' });
      const score = manager.calculateAgentSuitability(agent, {
        agentType: 'sourcing',
      });
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('getAgentWorkloadFactor', () => {
    test('should return 0 for unknown agent', () => {
      expect(manager.getAgentWorkloadFactor('unknown')).toBe(0);
    });

    test('should return higher factor for agents that have been idle longer', async () => {
      manager.registerAgentType('test', TestAgent);
      const agent = await manager.spawnAgent('test', { id: 'workload-test' });
      agent.state.lastActivity = Date.now() - 10 * 60 * 1000; // 10 minutes ago

      const factor = manager.getAgentWorkloadFactor('workload-test');
      expect(factor).toBeGreaterThan(0.5);
    });
  });

  describe('getAgentHealthFactor', () => {
    test('should return 1 for initialized agent', async () => {
      manager.registerAgentType('test', TestAgent);
      const agent = await manager.spawnAgent('test', { id: 'healthy' });
      expect(manager.getAgentHealthFactor('healthy')).toBe(1);
    });

    test('should return 0 for not initialized agent', () => {
      const agent = new TestAgent({ id: 'unhealthy' });
      agent.isInitialized = false;
      manager.agents.set('unhealthy', agent);
      expect(manager.getAgentHealthFactor('unhealthy')).toBe(0);
    });
  });

  describe('startAgentHealthMonitor', () => {
    test('should set up health check interval', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      manager.registerAgentType('test', TestAgent);
      const agent = await manager.spawnAgent('test', { id: 'monitored' });

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      expect(manager.healthCheckIntervals.has('monitored')).toBe(true);

      setIntervalSpy.mockRestore();
    });

    test('should clear existing interval before starting new one', async () => {
      const clearSpy = jest.spyOn(global, 'clearInterval');

      manager.registerAgentType('test', TestAgent);
      const agent = await manager.spawnAgent('test', { id: 'monitored' });

      // Add a pre-existing interval
      const oldInterval = setInterval(() => {}, 1000);
      manager.healthCheckIntervals.set('monitored', oldInterval);

      // Restart monitoring
      manager.startAgentHealthMonitor(agent);

      expect(clearSpy).toHaveBeenCalledWith(oldInterval);
      clearSpy.mockRestore();
    });
  });

  describe('performHealthCheck', () => {
    test('should attempt recovery when agent is not initialized', async () => {
      const recoverSpy = jest.spyOn(manager, 'recoverAgent');
      const agent = new TestAgent({ id: 'failing' });
      agent.isInitialized = false;
      manager.agents.set('failing', agent);

      await manager.performHealthCheck(agent);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not initialized'));
      expect(recoverSpy).toHaveBeenCalledWith(agent);
      recoverSpy.mockRestore();
    });

    test('should update lastActivity when agent is healthy', async () => {
      const agent = new TestAgent({ id: 'healthy' });
      agent.isInitialized = true;
      agent.state.lastActivity = Date.now() - 5000;
      manager.agents.set('healthy', agent);

      await manager.performHealthCheck(agent);

      expect(agent.state.lastActivity).toBeGreaterThanOrEqual(Date.now() - 100);
    });
  });

  describe('recoverAgent', () => {
    test('should call agent.initialize() for recovery', async () => {
      const agent = new TestAgent({ id: 'recoverable' });
      agent.isInitialized = false;
      const initSpy = jest.spyOn(agent, 'initialize');

      await manager.recoverAgent(agent);

      expect(initSpy).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('recovered'));
      initSpy.mockRestore();
    });

    test('should handle recovery failure gracefully', async () => {
      const agent = new TestAgent({ id: 'failing' });
      agent.initialize = jest.fn().mockRejectedValue(new Error('Init error'));

      await manager.recoverAgent(agent);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to recover'),
        expect.any(Error)
      );
    });
  });

  describe('handleAgentFailure', () => {
    test('should shutdown and remove failed agent', async () => {
      const agent = new TestAgent({ id: 'failed' });
      agent.shutdown = jest.fn().mockResolvedValue();
      manager.agents.set('failed', agent);

      await manager.handleAgentFailure(agent);

      expect(agent.shutdown).toHaveBeenCalled();
      expect(manager.agents.has('failed')).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('removed after failure')
      );
    });

    test('should still remove agent even if shutdown fails', async () => {
      const agent = new TestAgent({ id: 'failing-hard' });
      agent.shutdown = jest.fn().mockRejectedValue(new Error('Shutdown error'));
      manager.agents.set('failing-hard', agent);

      await manager.handleAgentFailure(agent);

      expect(manager.agents.has('failing-hard')).toBe(false);
    });
  });

  describe('getStats', () => {
    test('should return manager statistics', async () => {
      manager.registerAgentType('test', TestAgent);
      await manager.spawnAgent('test', { id: 'stat-agent' });

      const stats = manager.getStats();
      expect(stats.totalAgents).toBe(1);
      expect(stats.registeredTypes).toContain('test');
      expect(stats.agentsByStatus).toBeDefined();
      expect(stats.queueSize).toBe(0);
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should return agent status breakdown', async () => {
      manager.registerAgentType('test', TestAgent);
      const agent = await manager.spawnAgent('test', { id: 'busy-agent' });
      agent.state.status = 'busy';

      const breakdown = manager.getAgentStatusBreakdown();
      expect(breakdown.busy).toBe(1);
    });
  });

  describe('shutdownAll', () => {
    test('should clear all intervals and agents', async () => {
      manager.registerAgentType('test', TestAgent);
      await manager.spawnAgent('test', { id: 'shutdown-1' });
      await manager.spawnAgent('test', { id: 'shutdown-2' });

      await manager.shutdownAll();

      expect(manager.healthCheckIntervals.size).toBe(0);
      expect(manager.agents.size).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('All agents shut down');
    });

    test('should handle individual agent shutdown failure gracefully', async () => {
      manager.registerAgentType('test', TestAgent);
      await manager.spawnAgent('test', { id: 'failing-shutdown' });

      const agent = manager.agents.get('failing-shutdown');
      agent.shutdown = jest.fn().mockRejectedValue(new Error('Shutdown error'));

      await manager.shutdownAll();

      expect(manager.agents.size).toBe(0);
    });
  });
});
