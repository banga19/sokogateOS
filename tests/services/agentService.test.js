// Agent Service Test for SokogateOS
// Tests the AgentService singleton that initializes and manages the agent system
// Note: agentService exports a singleton instance, not a class

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/engine/selfImprovingLoop', () => ({
  submitFeedback: jest.fn(),
}));

jest.mock('../../src/services/langchainOrchestrator', () => ({
  runTaskWithRAG: jest.fn(),
}));

const logger = require('../../src/utils/logger');

describe('AgentService', () => {
  let agentService;

  beforeAll(() => {
    // Load the singleton once
    agentService = require('../../src/services/agentService');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    test('should have AgentManager instance', () => {
      expect(agentService.agentManager).toBeDefined();
      expect(typeof agentService.agentManager.registerAgentType).toBe('function');
    });

    test('should not be initialized initially', () => {
      expect(agentService.isInitialized).toBe(false);
    });
  });

  describe('initialize', () => {
    test('should register all agent types', async () => {
      const registerSpy = jest.spyOn(agentService, 'registerAgentTypes');
      await agentService.initialize();

      expect(registerSpy).toHaveBeenCalled();
      expect(agentService.isInitialized).toBe(true);
      registerSpy.mockRestore();

      // Reset for other tests
      agentService.isInitialized = false;
    });

    test('should register 6 agent types (chat + 5 specialized)', async () => {
      await agentService.initialize();
      expect(agentService.agentManager.agentTypes.size).toBe(6);
      expect(agentService.agentManager.agentTypes.has('chat')).toBe(true);
      expect(agentService.agentManager.agentTypes.has('sourcing')).toBe(true);
      expect(agentService.agentManager.agentTypes.has('customization')).toBe(true);
      expect(agentService.agentManager.agentTypes.has('logistics')).toBe(true);
      expect(agentService.agentManager.agentTypes.has('compliance')).toBe(true);
      expect(agentService.agentManager.agentTypes.has('negotiation')).toBe(true);

      // Reset for other tests
      agentService.isInitialized = false;
    });

    test('should skip re-initialization if already initialized', async () => {
      await agentService.initialize();
      await agentService.initialize();
      expect(logger.warn).toHaveBeenCalledWith('Agent service is already initialized');

      // Reset for other tests
      agentService.isInitialized = false;
    });

    test('should handle initialization failure gracefully', async () => {
      const originalRegister = agentService.registerAgentTypes;
      agentService.registerAgentTypes = jest.fn().mockImplementation(() => {
        throw new Error('Registration failed');
      });

      await expect(agentService.initialize()).rejects.toThrow('Registration failed');
      expect(agentService.isInitialized).toBe(false);

      agentService.registerAgentTypes = originalRegister;
    });
  });

  describe('registerAgentTypes', () => {
    test('should register all agent types with manager', () => {
      const spy = jest.spyOn(agentService.agentManager, 'registerAgentType');

      agentService.registerAgentTypes();

      expect(spy).toHaveBeenCalledWith('chat', expect.any(Function));
      expect(spy).toHaveBeenCalledWith('sourcing', expect.any(Function));
      expect(spy).toHaveBeenCalledWith('customization', expect.any(Function));
      expect(spy).toHaveBeenCalledWith('logistics', expect.any(Function));
      expect(spy).toHaveBeenCalledWith('compliance', expect.any(Function));
      expect(spy).toHaveBeenCalledWith('negotiation', expect.any(Function));
    });
  });

  describe('getAgentManager', () => {
    test('should return agent manager instance', () => {
      expect(agentService.getAgentManager()).toBe(agentService.agentManager);
    });
  });

  describe('spawnAgent', () => {
    test('should throw error when not initialized', async () => {
      await expect(agentService.spawnAgent('chat')).rejects.toThrow('Agent service not initialized');
    });

    test('should spawn agent through agent manager when initialized', async () => {
      await agentService.initialize();
      const spawnSpy = jest.spyOn(agentService.agentManager, 'spawnAgent').mockResolvedValue({ id: 'test-agent' });

      const result = await agentService.spawnAgent('chat', { id: 'test-agent' });

      expect(spawnSpy).toHaveBeenCalledWith('chat', { id: 'test-agent' });
      expect(result).toEqual({ id: 'test-agent' });
      spawnSpy.mockRestore();

      agentService.isInitialized = false;
    });
  });

  describe('assignTaskToAgent', () => {
    test('should throw error when not initialized', async () => {
      await expect(agentService.assignTaskToAgent({ type: 'test' })).rejects.toThrow('Agent service not initialized');
    });

    test('should assign task through agent manager when initialized', async () => {
      await agentService.initialize();
      const assignSpy = jest.spyOn(agentService.agentManager, 'assignTaskToAgent').mockResolvedValue({ success: true });

      const result = await agentService.assignTaskToAgent({ type: 'chat_message' });

      expect(assignSpy).toHaveBeenCalledWith({ type: 'chat_message' });
      expect(result).toEqual({ success: true });
      assignSpy.mockRestore();

      agentService.isInitialized = false;
    });
  });

  describe('getStats', () => {
    test('should return error when not initialized', () => {
      const stats = agentService.getStats();
      expect(stats).toEqual({ error: 'Agent service not initialized' });
    });

    test('should return stats from agent manager when initialized', async () => {
      await agentService.initialize();
      const statsSpy = jest.spyOn(agentService.agentManager, 'getStats').mockReturnValue({
        totalAgents: 3,
        registeredTypes: ['chat', 'sourcing'],
        queueSize: 0,
      });

      const stats = agentService.getStats();
      // Verify core agent manager stats are present
      expect(stats.totalAgents).toBe(3);
      expect(stats.registeredTypes).toEqual(['chat', 'sourcing']);
      expect(stats.queueSize).toBe(0);
      // Verify tool registry and composio stats are included
      expect(stats.toolRegistry).toBeDefined();
      expect(stats.toolRegistry.totalTools).toBeGreaterThan(0);
      expect(stats.composio).toBeDefined();
      expect(typeof stats.composio.configured).toBe('boolean');

      statsSpy.mockRestore();

      agentService.isInitialized = false;
    });
  });

  describe('shutdown', () => {
    test('should do nothing when not initialized', async () => {
      const shutdownSpy = jest.spyOn(agentService.agentManager, 'shutdownAll');
      await agentService.shutdown();
      expect(shutdownSpy).not.toHaveBeenCalled();
      shutdownSpy.mockRestore();
    });

    test('should shutdown agent manager when initialized', async () => {
      await agentService.initialize();
      const shutdownSpy = jest.spyOn(agentService.agentManager, 'shutdownAll').mockResolvedValue();

      await agentService.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
      expect(agentService.isInitialized).toBe(false);
      shutdownSpy.mockRestore();
    });
  });
});
