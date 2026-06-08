const { HermesAgent } = require('../src/services/hermes/hermesAgent');
const logger = require('../utils/logger');

// Mock logger to prevent test output pollution
jest.spyOn(logger, 'info').mockImplementation(() => {});
jest.spyOn(logger, 'warn').mockImplementation(() => {});
jest.spyOn(logger, 'error').mockImplementation(() => {});
jest.spyOn(logger, 'debug').mockImplementation(() => {});

describe('Hermes Agent System', () => {
  let hermesAgent;

  beforeEach(() => {
    hermesAgent = new HermesAgent({
      config: {
        analysisInterval: 1000,
        optimizationInterval: 1000,
        complianceInterval: 1000,
        intelligenceInterval: 1000
      }
    });
  });

  afterEach(async () => {
    await hermesAgent.shutdown();
  });

  test('should initialize all specialized agents', async () => {
    await hermesAgent.initialize();

    expect(hermesAgent.agents).toHaveProperty('research');
    expect(hermesAgent.agents).toHaveProperty('analysis');
    expect(hermesAgent.agents).toHaveProperty('optimization');
    expect(hermesAgent.agents).toHaveProperty('compliance');
    expect(hermesAgent.agents).toHaveProperty('marketIntelligence');

    // Check that agents were initialized
    for (const [name, agent] of Object.entries(hermesAgent.agents)) {
      expect(agent).toBeDefined();
      expect(typeof agent._runAgentTask).toBe('function');
    }
  });

  test('should run a cycle and return results', async () => {
    await hermesAgent.initialize();

    const result = await hermesAgent.runCycle();

    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('agentResults');
    expect(Array.isArray(result.agentResults)).toBe(true);
    expect(result.agentResults.length).toBe(5); // 5 agents

    // Check each agent result
    for (const agentResult of result.agentResults) {
      expect(agentResult).toHaveProperty('name');
      expect(agentResult).toHaveProperty('success');
      if (agentResult.success) {
        expect(agentResult).toHaveProperty('result');
      } else {
        expect(agentResult).toHaveProperty('error');
      }
    }
  });

  test('should start and stop scheduled runs', () => {
    expect(hermesAgent.scheduleInterval).toBeNull();

    hermesAgent.startScheduledRuns();
    expect(hermesAgent.scheduleInterval).not.toBeNull();

    hermesAgent.stopScheduledRuns();
    expect(hermesAgent.scheduleInterval).toBeNull();
  });

  test('should return status information', async () => {
    await hermesAgent.initialize();

    const status = await hermesAgent.getStatus();

    expect(status).toHaveProperty('isRunning');
    expect(status).toHaveProperty('scheduled');
    expect(status).toHaveProperty('runInterval');
    expect(status).toHaveProperty('agents');
    expect(status.agents).toHaveProperty('research');
    expect(status.agents).toHaveProperty('analysis');
    expect(status.agents).toHaveProperty('optimization');
    expect(status.agents).toHaveProperty('compliance');
    expect(status.agents).toHaveProperty('marketIntelligence');
    expect(status).toHaveProperty('hermesId');
  });

  test('should handle initialization failures gracefully', async () => {
    // Create a Hermes agent with invalid config to trigger failure
    const failingAgent = new HermesAgent({
      config: null // This should cause issues during initialization
    });

    await expect(failingAgent.initialize()).rejects.toThrow();

    await failingAgent.shutdown();
  });

  test('should handle cycle execution when not initialized', async () => {
    const uninitializedAgent = new HermesAgent();

    // Should not throw but may have individual agent failures
    const result = await uninitializedAgent.runCycle();

    // Even if initialization failed, the structure should be returned
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('agentResults');
  });
});