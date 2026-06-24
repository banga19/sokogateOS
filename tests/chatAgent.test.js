// Chat Agent Test for SokogateOS
// Tests the ChatAgent functionality including NLP, intent detection, entity extraction, and agent handoff

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const ChatAgent = require('../src/agents/chatAgent');
const logger = require('../src/utils/logger');

describe('ChatAgent', () => {
  let chatAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    chatAgent = new ChatAgent({ id: 'chat-agent-1' });
  });

  describe('constructor', () => {
    test('should set type to chat', () => {
      expect(chatAgent.type).toBe('chat');
    });

    test('should initialize with all required capabilities', () => {
      expect(chatAgent.capabilities).toContain('natural_language_understanding');
      expect(chatAgent.capabilities).toContain('intent_recognition');
      expect(chatAgent.capabilities).toContain('entity_extraction');
      expect(chatAgent.capabilities).toContain('context_aware_responses');
      expect(chatAgent.capabilities).toContain('conversation_management');
      expect(chatAgent.capabilities).toContain('agent_handoff');
    });

    test('should initialize conversations as empty Map', () => {
      expect(chatAgent.conversations).toBeInstanceOf(Map);
      expect(chatAgent.conversations.size).toBe(0);
    });
  });

  describe('initialize', () => {
    test('should call super.initialize and set initialized state', async () => {
      chatAgent.communication.initialize = jest.fn().mockResolvedValue();
      await chatAgent.initialize();
      expect(chatAgent.isInitialized).toBe(true);
    });
  });

  describe('processTask', () => {
    test('should handle chat_message task type', async () => {
      const handleSpy = jest.spyOn(chatAgent, 'handleChatMessage').mockResolvedValue({ success: true });
      await chatAgent.processTask({ type: 'chat_message', payload: { message: 'hello' } });
      expect(handleSpy).toHaveBeenCalledWith({ message: 'hello' });
      handleSpy.mockRestore();
    });

    test('should handle start_conversation task type', async () => {
      const startSpy = jest.spyOn(chatAgent, 'startConversation').mockResolvedValue({ success: true });
      await chatAgent.processTask({ type: 'start_conversation', payload: { userId: 'user-1' } });
      expect(startSpy).toHaveBeenCalledWith({ userId: 'user-1' });
      startSpy.mockRestore();
    });

    test('should handle end_conversation task type', async () => {
      const endSpy = jest.spyOn(chatAgent, 'endConversation').mockResolvedValue({ success: true });
      await chatAgent.processTask({ type: 'end_conversation', payload: { conversationId: 'conv-1' } });
      expect(endSpy).toHaveBeenCalledWith({ conversationId: 'conv-1' });
      endSpy.mockRestore();
    });

    test('should handle get_conversation_history task type', async () => {
      const histSpy = jest.spyOn(chatAgent, 'getConversationHistory').mockResolvedValue({ success: true });
      await chatAgent.processTask({ type: 'get_conversation_history', payload: { conversationId: 'conv-1' } });
      expect(histSpy).toHaveBeenCalledWith({ conversationId: 'conv-1' });
      histSpy.mockRestore();
    });

    test('should throw for unsupported task type', async () => {
      await expect(chatAgent.processTask({ type: 'unknown' })).rejects.toThrow(
        'Unsupported task type for ChatAgent: unknown'
      );
    });
  });

  describe('handleQuery', () => {
    test('should return agent status for agent_status query', async () => {
      const result = await chatAgent.handleQuery({ type: 'agent_status' });
      expect(result).toHaveProperty('agentId');
      expect(result).toHaveProperty('status');
    });

    test('should return system capabilities for system_capabilities query', async () => {
      const result = await chatAgent.handleQuery({ type: 'system_capabilities' });
      expect(result).toHaveProperty('agents');
      expect(result).toHaveProperty('features');
    });

    test('should return help info for help query', async () => {
      const result = await chatAgent.handleQuery({ type: 'help' });
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('commands');
    });
  });

  describe('handleChatMessage', () => {
    test('should create new conversation on first message', async () => {
      const result = await chatAgent.handleChatMessage({
        message: 'Hello',
        conversationId: 'new-conv',
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(chatAgent.conversations.has('new-conv')).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should reuse existing conversation', async () => {
      chatAgent.conversations.set('existing-conv', {
        id: 'existing-conv',
        userId: 'user-1',
        companyId: 'company-1',
        history: [],
        context: {},
      });

      const result = await chatAgent.handleChatMessage({
        message: 'Hello again',
        conversationId: 'existing-conv',
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(chatAgent.conversations.get('existing-conv').history.length).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    test('should handle error during message processing gracefully', async () => {
      // Make processNaturalLanguage throw
      chatAgent.processNaturalLanguage = jest.fn().mockRejectedValue(new Error('NLP error'));

      const result = await chatAgent.handleChatMessage({
        message: 'Hello',
        conversationId: 'error-conv',
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('NLP error');
      expect(result.data.conversationId).toBe('error-conv');
    });

    test('should store user message in conversation history', async () => {
      const result = await chatAgent.handleChatMessage({
        message: 'Find me suppliers',
        conversationId: 'hist-test',
        userId: 'user-1',
        companyId: 'company-1',
      });

      const conv = chatAgent.conversations.get('hist-test');
      expect(conv.history[0].role).toBe('user');
      expect(conv.history[0].content).toBe('Find me suppliers');
    });

    test('should store agent response in conversation history', async () => {
      const result = await chatAgent.handleChatMessage({
        message: 'Help me',
        conversationId: 'resp-test',
        userId: 'user-1',
        companyId: 'company-1',
      });

      const conv = chatAgent.conversations.get('resp-test');
      const lastEntry = conv.history[conv.history.length - 1];
      expect(lastEntry.role).toBe('agent');
      expect(lastEntry.content).toBeDefined();
    });

    test('should initiate handoff for sourcing intent', async () => {
      const result = await chatAgent.handleChatMessage({
        message: 'Find suppliers for cotton fabric',
        conversationId: 'handoff-test',
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(result.success).toBe(true);
      expect(result.data.handoff).toBe(true);
      expect(result.data.targetAgent).toBe('sourcing');
    });

    test('should handle handoff to specialized agent', async () => {
      const result = await chatAgent.handleChatMessage({
        message: 'Source 1000 cotton shirts',
        conversationId: 'handoff-source',
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(result.data.handoff).toBe(true);
      expect(result.data.targetAgent).toBe('sourcing');
      expect(result.data.context).toBeDefined();
      expect(result.data.context.intent).toBe('sourcing');
    });
  });

  describe('startConversation', () => {
    test('should create conversation with welcome message', async () => {
      const result = await chatAgent.startConversation({
        userId: 'user-1',
        companyId: 'company-1',
      });

      expect(result.success).toBe(true);
      expect(result.data.conversationId).toBe('mocked-uuid');
      expect(result.data.welcomeMessage).toContain('SokogateOS AI assistant');
    });

    test('should process initial message if provided', async () => {
      const result = await chatAgent.startConversation({
        userId: 'user-1',
        companyId: 'company-1',
        initialMessage: 'Help me source products',
      });

      expect(result.success).toBe(true);
      expect(result.data.initialResponse).toBeDefined();
    });
  });

  describe('endConversation', () => {
    test('should end existing conversation and store summary', async () => {
      chatAgent.conversations.set('end-test', {
        id: 'end-test',
        userId: 'user-1',
        history: [
          { role: 'user', content: 'Hello' },
          { role: 'agent', content: 'Hi there', metadata: { intent: 'greeting' } },
        ],
        startedAt: new Date().toISOString(),
        context: {},
      });

      jest.spyOn(chatAgent.memory, 'store').mockResolvedValue();

      const result = await chatAgent.endConversation({ conversationId: 'end-test' });

      expect(result.success).toBe(true);
      expect(result.data.conversationId).toBe('end-test');
      expect(result.data.summary).toContain('Conversation summary');
      expect(chatAgent.conversations.has('end-test')).toBe(false);
    });

    test('should return error for non-existent conversation', async () => {
      const result = await chatAgent.endConversation({ conversationId: 'nonexistent' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Conversation not found');
    });
  });

  describe('getConversationHistory', () => {
    test('should return conversation history', async () => {
      const history = [{ role: 'user', content: 'test' }];
      chatAgent.conversations.set('hist-conv', {
        id: 'hist-conv',
        history,
      });

      const result = await chatAgent.getConversationHistory({ conversationId: 'hist-conv' });
      expect(result.success).toBe(true);
      expect(result.data.history).toEqual(history);
    });

    test('should return error for non-existent conversation', async () => {
      const result = await chatAgent.getConversationHistory({ conversationId: 'nonexistent' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Conversation not found');
    });
  });

  describe('createNewConversation', () => {
    test('should create conversation with correct structure', () => {
      const conv = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');

      expect(conv.id).toBe('conv-1');
      expect(conv.userId).toBe('user-1');
      expect(conv.companyId).toBe('company-1');
      expect(conv.history).toEqual([]);
      expect(conv.context.currentIntent).toBeNull();
      expect(conv.context.extractedEntities).toEqual({});
      expect(conv.context.previousAgentHandoffs).toEqual([]);
    });
  });

  describe('detectIntent', () => {
    test('should detect sourcing intent', () => {
      expect(chatAgent.detectIntent('I need to find suppliers for cotton')).toBe('sourcing');
      expect(chatAgent.detectIntent('source products from China')).toBe('sourcing');
      expect(chatAgent.detectIntent('procure raw materials')).toBe('sourcing');
      expect(chatAgent.detectIntent('buy textiles in bulk')).toBe('sourcing');
    });

    test('should detect customization intent', () => {
      expect(chatAgent.detectIntent('I want to customize products')).toBe('customization');
      expect(chatAgent.detectIntent('brand my products')).toBe('customization');
      expect(chatAgent.detectIntent('add my label to the items')).toBe('customization');
      expect(chatAgent.detectIntent('modify the design specs')).toBe('customization');
    });

    test('should detect logistics intent', () => {
      expect(chatAgent.detectIntent('ship products to Kenya')).toBe('logistics');
      expect(chatAgent.detectIntent('track my shipment')).toBe('logistics');
      expect(chatAgent.detectIntent('arrange freight for cargo')).toBe('logistics');
      expect(chatAgent.detectIntent('deliver to Mombasa port')).toBe('logistics');
    });

    test('should detect compliance intent', () => {
      expect(chatAgent.detectIntent('check compliance requirements')).toBe('compliance');
      expect(chatAgent.detectIntent('what regulations apply')).toBe('compliance');
      expect(chatAgent.detectIntent('get certification for export')).toBe('compliance');
      expect(chatAgent.detectIntent('customs clearance')).toBe('compliance');
    });

    test('should detect negotiation intent', () => {
      expect(chatAgent.detectIntent('I want to negotiate the price')).toBe('negotiation');
      expect(chatAgent.detectIntent('ask for discount')).toBe('negotiation');
      expect(chatAgent.detectIntent('review the contract terms')).toBe('negotiation');
    });

    test('should detect greeting intent', () => {
      expect(chatAgent.detectIntent('hello')).toBe('greeting');
      expect(chatAgent.detectIntent('Hi there')).toBe('greeting');
      expect(chatAgent.detectIntent('good morning')).toBe('greeting');
    });

    test('should detect help intent', () => {
      expect(chatAgent.detectIntent('help me')).toBe('help');
      expect(chatAgent.detectIntent('how can I do this')).toBe('help');
      expect(chatAgent.detectIntent('guide me through the process')).toBe('help');
    });

    test('should return general for unknown intent', () => {
      expect(chatAgent.detectIntent('the weather is nice today')).toBe('general');
    });
  });

  describe('extractEntities', () => {
    test('should extract product references', () => {
      const entities = chatAgent.extractEntities('looking for product #ABC123');
      expect(entities.productId).toBe('ABC123');
    });

    test('should extract quantities', () => {
      const entities = chatAgent.extractEntities('need 5000 units');
      expect(entities.quantity).toBe(5000);

      const entities2 = chatAgent.extractEntities('need 100 pieces');
      expect(entities2.quantity).toBe(100);
    });

    test('should extract price mentions', () => {
      const entities = chatAgent.extractEntities('budget is $5000');
      expect(entities.price).toBeDefined();
    });

    test('should extract location mentions', () => {
      const entities = chatAgent.extractEntities('ship to Nairobi');
      expect(entities.location).toBe('Nairobi');

      const entities2 = chatAgent.extractEntities('from Guangzhou');
      expect(entities2.location).toBe('Guangzhou');
    });

    test('should return empty object when no entities found', () => {
      const entities = chatAgent.extractEntities('hello how are you');
      expect(Object.keys(entities).length).toBe(0);
    });
  });

  describe('processNaturalLanguage', () => {
    test('should detect intent and entities from message', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');
      const result = await chatAgent.processNaturalLanguage('source 5000 units of cotton fabric from India', conversation);

      expect(result.intent).toBe('sourcing');
      expect(result.entities.quantity).toBe(5000);
      expect(result.needsHandoff).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should update conversation context with detected entities', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');
      await chatAgent.processNaturalLanguage('source cotton fabric from India', conversation);

      expect(conversation.context.currentIntent).toBe('sourcing');
      expect(conversation.context.extractedEntities).toBeDefined();
    });

    test('should not trigger handoff for non-trade intents', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');
      const result = await chatAgent.processNaturalLanguage('hello', conversation);

      expect(result.needsHandoff).toBe(false);
    });
  });

  describe('handoffToSpecializedAgent', () => {
    test('should map intents to agent types', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');
      const nlpResult = { intent: 'logistics', entities: {} };

      const result = await chatAgent.handoffToSpecializedAgent(nlpResult, conversation, {
        message: 'Ship to Nairobi',
        conversationId: 'conv-1',
      });

      expect(result.success).toBe(true);
      expect(result.data.targetAgent).toBe('logistics');
    });

    test('should track handoff in conversation context', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');
      const nlpResult = { intent: 'sourcing', entities: { quantity: 100 } };

      await chatAgent.handoffToSpecializedAgent(nlpResult, conversation, {
        message: 'Source 100 units',
        conversationId: 'conv-1',
      });

      expect(conversation.context.previousAgentHandoffs.length).toBe(1);
      expect(conversation.context.previousAgentHandoffs[0].agentType).toBe('sourcing');
    });

    test('should return error for unmapped intent', async () => {
      const result = await chatAgent.handoffToSpecializedAgent(
        { intent: 'unknown', entities: {} },
        {},
        { message: 'test', conversationId: 'conv-1' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No specialized agent');
    });
  });

  describe('generateResponse', () => {
    test('should return appropriate response for each intent', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');

      const responses = {
        greeting: 'Hello!',
        sourcing: 'find products',
        help: "I'm your SokogateOS",
      };

      for (const [intent, expectedContent] of Object.entries(responses)) {
        const result = await chatAgent.generateResponse({ intent, entities: {}, confidence: 0.8 }, conversation);
        expect(result.content.toLowerCase()).toContain(expectedContent.toLowerCase());
      }
    });

    test('should include suggested actions', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');
      const result = await chatAgent.generateResponse({ intent: 'sourcing', entities: {}, confidence: 0.9 }, conversation);

      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    test('should set requiresFollowup for non-greeting intents', async () => {
      const conversation = chatAgent.createNewConversation('conv-1', 'user-1', 'company-1');
      const result = await chatAgent.generateResponse({ intent: 'sourcing', entities: {}, confidence: 0.9 }, conversation);

      expect(result.requiresFollowup).toBe(true);
    });
  });

  describe('getAgentStatus', () => {
    test('should return status with active conversation count', async () => {
      chatAgent.conversations.set('conv-1', {});
      chatAgent.conversations.set('conv-2', {});

      const status = chatAgent.getAgentStatus();
      expect(status.agentId).toBe('chat-agent-1');
      expect(status.agentType).toBe('chat');
      expect(status.activeConversations).toBe(2);
    });
  });

  describe('getSystemCapabilities', () => {
    test('should list all available agents and features', () => {
      const caps = chatAgent.getSystemCapabilities();
      expect(caps.agents).toContain('chat');
      expect(caps.agents).toContain('sourcing');
      expect(caps.features.length).toBeGreaterThan(0);
    });
  });

  describe('getHelpInfo', () => {
    test('should return help commands', () => {
      const help = chatAgent.getHelpInfo();
      expect(help.commands.length).toBeGreaterThan(0);
      expect(help.commands.some(c => c.command.includes('source'))).toBe(true);
      expect(help.commands.some(c => c.command.includes('help'))).toBe(true);
    });
  });

  describe('generateConversationSummary', () => {
    test('should generate summary from conversation history', async () => {
      const conversation = {
        id: 'conv-1',
        history: [
          { role: 'user', content: 'Source products' },
          { role: 'agent', content: 'Sure', metadata: { intent: 'sourcing' } },
          { role: 'user', content: 'Ship to Nairobi' },
          { role: 'agent', content: 'Okay', metadata: { intent: 'logistics' } },
        ],
        startedAt: new Date().toISOString(),
      };

      const summary = await chatAgent.generateConversationSummary(conversation);
      expect(summary).toContain('Conversation summary');
      expect(summary).toContain('4 messages');
      expect(summary).toContain('sourcing');
      expect(summary).toContain('logistics');
    });
  });
});
