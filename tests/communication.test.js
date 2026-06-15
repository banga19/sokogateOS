// Agent Communication Test for SokogateOS
// Tests the AgentCommunication functionality including Hermes mediation

const AgentCommunication = require('../src/agents/communication');
const logger = require('../src/utils/logger');

// Mock logger to prevent test output pollution
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('AgentCommunication', () => {
  let communication;
  let mockSend;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();

    jest.mock('kafkajs', () => ({
      Kafka: jest.fn(() => ({
        producer: () => ({
          connect: jest.fn().mockResolvedValue(),
          disconnect: jest.fn().mockResolvedValue(),
          send: mockSend
        }),
        consumer: () => ({
          connect: jest.fn().mockResolvedValue(),
          disconnect: jest.fn().mockResolvedValue(),
          subscribe: jest.fn(),
          run: jest.fn()
        })
      }))
    }));

    communication = new AgentCommunication('test-agent-id');
  });

  describe('constructor', () => {
    test('should set agentId correctly', () => {
      expect(communication.agentId).toBe('test-agent-id');
    });

    test('should initialize Hermes-related properties to default values', () => {
      expect(communication.hermesAgentId).toBeNull();
      expect(communication.hermesMediation).toBeFalsy();
    });

    test('should accept options parameter', () => {
      const options = {
        hermesAgentId: 'hermes-agent-1',
        hermesMediation: true
      };
      const commWithOptions = new AgentCommunication('test-agent-id', options);

      expect(commWithOptions.hermesAgentId).toBe('hermes-agent-1');
      expect(commWithOptions.hermesMediation).toBeTruthy();
    });
  });

  describe('sendMessage with Hermes mediation enabled', () => {
    beforeEach(() => {
      // Set up communication with Hermes mediation enabled
      communication = new AgentCommunication('test-agent-id', {
        hermesAgentId: 'hermes-agent-1',
        hermesMediation: true
      });

      // Mock the Kafka producer
      communication.kafkaProducer = {
        send: mockSend.mockResolvedValue()
      };
    });

    test('should send message through Hermes when mediation is enabled', async () => {
      const targetAgentId = 'target-agent';
      const message = { type: 'test-message', data: 'test-data' };

      await communication.sendMessage(targetAgentId, message);

      // Should have called send on the Kafka producer with mediated message
      expect(mockSend).toHaveBeenCalled();
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.topic).toBe('agent.hermes-agent-1.commands');

      const sentMessage = JSON.parse(callArgs.messages[0].value);
      expect(sentMessage.type).toBe('hermes_mediated_forward');
      expect(sentMessage.originalTarget).toBe('target-agent');
      expect(sentMessage.payload).toEqual(message);
      expect(sentMessage.senderId).toBe('test-agent-id');

      // Should have logged debug message
      expect(logger.debug).toHaveBeenCalledWith(
        'Message sent via Hermes hermes-agent-1 to target-agent'
      );
    });

    test('should fall back to direct sending when Hermes sending fails', async () => {
      // Make Hermes sending fail
      mockSend.mockRejectedValueOnce(new Error('Kafka error'));

      const targetAgentId = 'target-agent';
      const message = { type: 'test-message', data: 'test-data' };

      await communication.sendMessage(targetAgentId, message);

      // Should have attempted to send via Hermes first (first call)
      // Then fallen back to direct sending (second call)
      expect(mockSend).toHaveBeenCalledTimes(2);

      // First call: Hermes mediated message
      const firstCall = mockSend.mock.calls[0][0];
      expect(firstCall.topic).toBe('agent.hermes-agent-1.commands');

      // Second call: Direct message
      const secondCall = mockSend.mock.calls[1][0];
      expect(secondCall.topic).toBe('agent.target-agent.commands');

      const directMessage = JSON.parse(secondCall.messages[0].value);
      expect(directMessage).toEqual(message);

      // Should have logged warning about failed Hermes send
      expect(logger.warn).toHaveBeenCalledWith('(non-critical) Failed to send mediated message:', 'Kafka error');

      // Should have logged info about falling back
      expect(logger.info).toHaveBeenCalledWith('Falling back to direct message sending');

      // Should have logged debug for direct send
      expect(logger.debug).toHaveBeenCalledWith('Message sent directly to agent target-agent');
    });

    test('should fall back to direct sending when Kafka producer not available', async () => {
      // Remove Kafka producer to simulate not available
      communication.kafkaProducer = null;

      const targetAgentId = 'target-agent';
      const message = { type: 'test-message', data: 'test-data' };

      // Set NODE_ENV to development
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      await communication.sendMessage(targetAgentId, message);

      // Should not have attempted to send via Hermes (since no producer)
      // In development mode, should log debug message instead
      expect(logger.debug).toHaveBeenCalledWith(
        '[DEV] Would send mediated message to Hermes hermes-agent-1:',
        expect.objectContaining({
          type: 'hermes_mediated_forward',
          originalTarget: 'target-agent'
        })
      );

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('sendMessage with Hermes mediation disabled', () => {
    beforeEach(() => {
      // Set up communication with Hermes mediation disabled
      communication = new AgentCommunication('test-agent-id', {
        hermesAgentId: 'hermes-agent-1',
        hermesMediation: false // Explicitly disabled
      });

      // Mock the Kafka producer
      communication.kafkaProducer = {
        send: mockSend.mockResolvedValue()
      };
    });

    test('should send message directly when mediation is disabled', async () => {
      const targetAgentId = 'target-agent';
      const message = { type: 'test-message', data: 'test-data' };

      await communication.sendMessage(targetAgentId, message);

      // Should have called send on the Kafka producer directly
      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.topic).toBe('agent.target-agent.commands');

      const sentMessage = JSON.parse(callArgs.messages[0].value);
      expect(sentMessage).toEqual(message);

      // Should have logged debug message for direct send
      expect(logger.debug).toHaveBeenCalledWith('Message sent directly to agent target-agent');
    });
  });

  describe('sendMessage fallback scenarios', () => {
    test('should handle development mode when no Kafka producer available', async () => {
      // Set up communication with Hermes mediation enabled
      communication = new AgentCommunication('test-agent-id', {
        hermesAgentId: 'hermes-agent-1',
        hermesMediation: true
      });

      // No Kafka producer (simulating unavailable)
      communication.kafkaProducer = null;

      // Set NODE_ENV to development
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const targetAgentId = 'target-agent';
      const message = { type: 'test-message', data: 'test-data' };

      await communication.sendMessage(targetAgentId, message);

      // Should have logged development message instead of attempting to send
      expect(logger.debug).toHaveBeenCalledWith(
        '[DEV] Would send mediated message to Hermes hermes-agent-1:',
        expect.objectContaining({
          type: 'hermes_mediated_forward',
          originalTarget: 'target-agent'
        })
      );

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});