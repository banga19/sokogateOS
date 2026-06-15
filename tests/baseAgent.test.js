// Base Agent Test for SokogateOS
// Tests the BaseAgent functionality including Hermes-mediated message handling

// Mock uuid to avoid ES6 export issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

const BaseAgent = require('../src/agents/baseAgent');
const logger = require('../src/utils/logger');

// Mock logger to prevent test output pollution
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Create a concrete subclass of BaseAgent for testing
class TestAgent extends BaseAgent {
  constructor(agentId) {
    super({ id: agentId }); // Pass options object with id property
  }

  async processTask(task) {
    // Track that processTask was called
    this.lastProcessedTask = task;
    return { result: `Processed task: ${task.type}`, success: true };
  }

  async handleCommand(command) {
    // Default implementation for testing
    return { handled: true, command };
  }
}

describe('BaseAgent', () => {
  let agent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new TestAgent('test-agent-id');
  });

  describe('constructor', () => {
    test('should set agent id correctly', () => {
      expect(agent.id).toBe('test-agent-id');
    });

    test('should initialize communication with messageHandlers Map', () => {
      expect(agent.communication).toBeDefined();
      expect(agent.communication.messageHandlers).toBeInstanceOf(Map);
      expect(agent.communication.messageHandlers.size).toBe(0);
    });
  });

  describe('handleIncomingMessage', () => {
    test('should handle hermes_mediated_forward message type by processing the payload', async () => {
      // The original message is a task message
      const originalMessage = {
        type: 'task',
        payload: {
          type: 'test-task',
          data: 'test-data'
        }
      };

      // The hermes_mediated_forward message wraps the original message
      const hermesMessage = {
        type: 'hermes_mediated_forward',
        originalTarget: 'target-agent',
        payload: originalMessage,
        senderId: 'hermes-agent',
        timestamp: new Date().toISOString()
      };

      // Spy on processTask to verify it gets called
      const processTaskSpy = jest.spyOn(agent, 'processTask');

      await agent.handleIncomingMessage(hermesMessage);

      // Should have processed the payload task
      expect(processTaskSpy).toHaveBeenCalledWith({
        type: 'test-task',
        data: 'test-data'
      });

      // Restore the spy
      processTaskSpy.mockRestore();
    });

    test('should handle hermes_mediated_forward with replyTo preservation (for response handling)', async () => {
      // The original message is a task message that expects a response
      const originalMessage = {
        type: 'task',
        payload: {
          type: 'test-task',
          data: 'test-data'
        },
        requiresResponse: true,
        replyTo: 'original-sender'
      };

      // The hermes_mediated_forward message wraps the original message
      const hermesMessage = {
        type: 'hermes_mediated_forward',
        originalTarget: 'target-agent',
        payload: originalMessage,
        senderId: 'hermes-agent',
        timestamp: new Date().toISOString()
      };

      // Spy on processTask to verify it gets called
      const processTaskSpy = jest.spyOn(agent, 'processTask');

      await agent.handleIncomingMessage(hermesMessage);

      // Should have processed the payload task (task metadata like requiresResponse/replyTo
      // are handled at the messaging layer, not passed to processTask)
      expect(processTaskSpy).toHaveBeenCalledWith({
        type: 'test-task',
        data: 'test-data'
      });

      // Restore the spy
      processTaskSpy.mockRestore();
    });

    test('should delegate unknown message types to warning log', async () => {
      const message = {
        type: 'unknown-type',
        payload: {}
      };

      await agent.handleIncomingMessage(message);

      // Should have logged a warning for unknown message type
      expect(logger.warn).toHaveBeenCalledWith(
        'Unknown message type received by agent test-agent-id: unknown-type'
      );
    });
  });

  describe('_runAgentTaskForHermes', () => {
    test('should delegate to processTask method', async () => {
      const task = { type: 'test-task', data: 'test-data' };

      // Mock the processTask method to track calls
      const originalProcessTask = agent.processTask;
      agent.processTask = jest.fn().mockResolvedValue({ result: 'task-processed', success: true });

      const result = await agent._runAgentTaskForHermes(task);

      // Should have called processTask with the task
      expect(agent.processTask).toHaveBeenCalledWith(task);
      expect(result).toEqual({ result: 'task-processed', success: true });

      // Restore original method
      agent.processTask = originalProcessTask;
    });
  });
});