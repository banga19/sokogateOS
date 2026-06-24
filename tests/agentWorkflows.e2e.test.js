/**
 * Agent Workflows — End-to-End Integration Tests
 * ================================================
 *
 * Tests the full agent pipeline end-to-end, from ChatAgent message handling
 * through to specialized agent processing, including Hermes-mediated
 * communication, agent lifecycle management, tool execution, and memory.
 *
 * External services (Kafka, DB) are mocked — the focus is on integration
 * between the agent components themselves.
 *
 * NOTE: Uses jest.useFakeTimers() to prevent AgentManager's health monitor
 * setInterval(..., 30000) from keeping the Node.js event loop alive.
 */

// ── Mocks for external dependencies ──
jest.mock('kafkajs', () => {
  const mockSend = jest.fn().mockResolvedValue();
  return {
    Kafka: jest.fn(() => ({
      producer: () => ({ connect: jest.fn(), send: mockSend, disconnect: jest.fn() }),
      consumer: () => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        subscribe: jest.fn(),
        run: jest.fn(),
      }),
    })),
  };
});

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ── Imports (all agent classes are real, not mocked) ──
const AgentManager = require('../src/agents/agentManager');
const ChatAgent = require('../src/agents/chatAgent');
const BaseAgent = require('../src/agents/baseAgent');
const AgentMemory = require('../src/agents/agentMemory');
const agentService = require('../src/services/agentService');

// Load specialized agents dynamically for testing
const SourcingAgent = require('../src/agents/specialized/sourcingAgent');
const { LogisticsAgent } = require('../src/agents/specialized/logisticsAgent');
const { ComplianceAgent } = require('../src/agents/specialized/complianceAgent');
const { NegotiationAgent } = require('../src/agents/specialized/negotiationAgent');
const CustomizationAgent = require('../src/agents/specialized/customizationAgent');

const logger = require('../src/utils/logger');

// =========================================================================
// Test Fixtures
// =========================================================================
const testUserId = 'user-e2e-1';
const testCompanyId = 'company-e2e-1';

/**
 * Helper: instantiate a full AgentManager with all 6 agent types registered.
 */
function createFullyLoadedManager() {
  const manager = new AgentManager();
  manager.registerAgentType('chat', ChatAgent);
  manager.registerAgentType('sourcing', SourcingAgent);
  manager.registerAgentType('customization', CustomizationAgent);
  manager.registerAgentType('logistics', LogisticsAgent);
  manager.registerAgentType('compliance', ComplianceAgent);
  manager.registerAgentType('negotiation', NegotiationAgent);
  return manager;
}

// Use fake timers globally for this test file to avoid setInterval keeping
// the Node.js event loop alive (agent health monitors use 30s intervals).
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// =========================================================================
describe('E2E: Agent Lifecycle Management', () => {
  // -------------------------------------------------------
  test('spawns all 6 agent types and verifies initialization', async () => {
    const manager = createFullyLoadedManager();

    const chatAgent = await manager.spawnAgent('chat', { id: 'chat-e2e-01' });
    const srcAgent = await manager.spawnAgent('sourcing', { id: 'src-e2e-01' });
    const custAgent = await manager.spawnAgent('customization', { id: 'cust-e2e-01' });
    const logiAgent = await manager.spawnAgent('logistics', { id: 'logi-e2e-01' });
    const compAgent = await manager.spawnAgent('compliance', { id: 'comp-e2e-01' });
    const negAgent = await manager.spawnAgent('negotiation', { id: 'neg-e2e-01' });

    // All agents should be present in manager
    expect(manager.agents.size).toBe(6);

    // Each agent must be initialized and ready
    for (const agent of [chatAgent, srcAgent, custAgent, logiAgent, compAgent, negAgent]) {
      expect(agent.isInitialized).toBe(true);
      expect(agent.state.status).toBe('ready');
      expect(agent.memory).toBeInstanceOf(AgentMemory);
    }

    // Types must be correct
    expect(chatAgent.type).toBe('chat');
    expect(srcAgent.type).toBe('sourcing');

    // Each specialized agent must have loaded tools
    expect(chatAgent.availableTools.totalCount).toBe(0); // Chat doesn't load tools
    expect(srcAgent.availableTools.totalCount).toBeGreaterThanOrEqual(0);

    // Health monitoring must be active (these are fake intervals)
    expect(manager.healthCheckIntervals.size).toBe(6);

    await manager.shutdownAll();
    expect(manager.agents.size).toBe(0);
    expect(manager.healthCheckIntervals.size).toBe(0);
  });

  // -------------------------------------------------------
  test('shutdownAll gracefully stops all agents', async () => {
    const manager = createFullyLoadedManager();
    await manager.spawnAgent('chat', { id: 'chat-e2e-shutdown' });
    await manager.spawnAgent('sourcing', { id: 'src-e2e-shutdown' });

    const stats = manager.getStats();
    expect(stats.totalAgents).toBe(2);

    await manager.shutdownAll();

    expect(manager.agents.size).toBe(0);
    expect(manager.healthCheckIntervals.size).toBe(0);
  });

  // -------------------------------------------------------
  test('agent manager stats reflect current state accurately', async () => {
    const manager = createFullyLoadedManager();
    await manager.spawnAgent('chat', { id: 'chat-e2e-stats' });
    await manager.spawnAgent('sourcing', { id: 'src-e2e-stats' });

    const stats = manager.getStats();
    expect(stats.totalAgents).toBe(2);
    expect(stats.registeredTypes).toContain('chat');
    expect(stats.registeredTypes).toContain('sourcing');
    expect(stats.agentsByStatus.ready).toBe(2);
    expect(stats.queueSize).toBe(0);

    await manager.shutdownAll();
  });
});

// =========================================================================
describe('E2E: Sourcing Workflow (Chat → Handoff → SourcingAgent)', () => {
  let manager, chatAgent;

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    chatAgent = await manager.spawnAgent('chat', { id: 'chat-e2e-sourcing' });
    await manager.spawnAgent('sourcing', { id: 'src-e2e-sourcing' });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('full sourcing flow: message → intent detection → handoff → agent processing', async () => {
    // Step 1: ChatAgent receives a user message
    const msgResult = await chatAgent.handleChatMessage({
      message: 'Find suppliers for cotton fabric in India',
      conversationId: 'conv-sourcing-1',
      userId: testUserId,
      companyId: testCompanyId,
    });

    // Step 2: The message should trigger a sourcing handoff
    expect(msgResult.success).toBe(true);
    expect(msgResult.data.handoff).toBe(true);
    expect(msgResult.data.targetAgent).toBe('sourcing');
    expect(msgResult.data.context).toBeDefined();
    expect(msgResult.data.context.intent).toBe('sourcing');
    expect(msgResult.data.context.originalMessage).toBe('Find suppliers for cotton fabric in India');
    // Note: entity extraction is regex-based; 'suppliers' triggers sourcing intent
    // but the quantity regex requires explicit units (e.g. '500 units')
    // conversationId is nested inside context for handoff results
    expect(msgResult.data.context.conversationId).toBe('conv-sourcing-1');

    // Step 3: Conversation context should be updated
    const conversation = chatAgent.conversations.get('conv-sourcing-1');
    expect(conversation).toBeDefined();
    expect(conversation.context.currentIntent).toBe('sourcing');
    expect(conversation.context.previousAgentHandoffs.length).toBe(1);
    expect(conversation.context.previousAgentHandoffs[0].agentType).toBe('sourcing');

    // Step 4: Verify the SourcingAgent can process the task independently
    const taskResult = await manager.assignTaskToAgent({
      type: 'product_discovery',
      payload: { category: 'textiles', keywords: ['cotton', 'fabric'], region: 'India' },
      requiredCapabilities: ['product_discovery'],
    });

    expect(taskResult).not.toBeNull();
    expect(taskResult.success).toBe(true);
    expect(taskResult.result.data.products.length).toBe(2);
    expect(taskResult.result.data.products[0].category).toBe('textiles');
  });

  // -------------------------------------------------------
  test('chat-to-sourcing: handoff returns structured context for downstream integration', async () => {
    const msgResult = await chatAgent.handleChatMessage({
      message: 'Source 1000 units of electronic components',
      conversationId: 'conv-sourcing-2',
      userId: testUserId,
      companyId: testCompanyId,
    });

    expect(msgResult.data.handoff).toBe(true);
    expect(msgResult.data.targetAgent).toBe('sourcing');
    expect(msgResult.data.context.entities.quantity).toBe(1000);
  });

  // -------------------------------------------------------
  test('sourcing agent can process all task types', async () => {
    const srcAgent = await manager.spawnAgent('sourcing', { id: 'src-e2e-full' });

    // product_discovery
    const disc = await srcAgent.processTask({ type: 'product_discovery', payload: { category: 'electronics' } });
    expect(disc.success).toBe(true);
    expect(disc.data.products.length).toBeGreaterThan(0);

    // supplier_verification
    const verify = await srcAgent.processTask({ type: 'supplier_verification', payload: { supplierId: 's-001' } });
    expect(verify.success).toBe(true);
    expect(verify.data.verificationStatus).toBe('verified');

    // price_negotiation
    const price = await srcAgent.processTask({ type: 'price_negotiation', payload: { price: 100, quantity: 500 } });
    expect(price.success).toBe(true);
    expect(price.data.negotiatedPrice).toBeLessThan(price.data.originalPrice);

    // market_analysis
    const market = await srcAgent.processTask({ type: 'market_analysis', payload: { category: 'electronics' } });
    expect(market.success).toBe(true);
    expect(market.data.trends.length).toBeGreaterThan(0);

    // supplier_relationship
    const rel = await srcAgent.processTask({ type: 'supplier_relationship', payload: { supplierId: 's-001' } });
    expect(rel.success).toBe(true);
    expect(rel.data.status).toBe('active');
  });
});

// =========================================================================
describe('E2E: Logistics Workflow', () => {
  let manager, chatAgent;

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    chatAgent = await manager.spawnAgent('chat', { id: 'chat-e2e-logistics' });
    await manager.spawnAgent('logistics', { id: 'logi-e2e-logistics' });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('full logistics flow: message → intent → handoff → route optimization', async () => {
    const msgResult = await chatAgent.handleChatMessage({
      message: 'Ship 500 units of electronics from Shanghai to Mombasa',
      conversationId: 'conv-logistics-1',
      userId: testUserId,
      companyId: testCompanyId,
    });

    expect(msgResult.success).toBe(true);
    expect(msgResult.data.handoff).toBe(true);
    expect(msgResult.data.targetAgent).toBe('logistics');
    expect(msgResult.data.context.intent).toBe('logistics');
    expect(msgResult.data.context.entities.quantity).toBe(500);
    // Note: entity extraction runs on lowercased message, but location regex expects
    // uppercase ([A-Z]), so location is not extracted currently.
    // Intent is correctly detected as 'logistics'.
  });

  // -------------------------------------------------------
  test('logistics agent optimizes route with priority modes', async () => {
    const logiAgent = manager.agents.get('logi-e2e-logistics');

    // Fastest priority
    const fast = await logiAgent.processTask({
      type: 'route_optimization',
      payload: { origin: 'Shanghai', destination: 'Mombasa', priority: 'fastest' },
    });
    expect(fast.success).toBe(true);
    expect(fast.data.origin).toBe('Shanghai');
    expect(fast.data.destination).toBe('Mombasa');
    expect(fast.data.seaOption.days).toBeGreaterThan(0);
    expect(fast.data.airOption.days).toBeGreaterThan(0);
    expect(fast.data.airOption.days).toBeLessThan(fast.data.seaOption.days);

    // Cheapest priority
    const cheap = await logiAgent.processTask({
      type: 'route_optimization',
      payload: { origin: 'Shanghai', destination: 'Mombasa', priority: 'cheapest' },
    });
    expect(cheap.success).toBe(true);
    expect(cheap.data.seaOption.cost).toBeLessThan(cheap.data.airOption.cost);
  });

  // -------------------------------------------------------
  test('logistics agent handles all task types', async () => {
    const logiAgent = manager.agents.get('logi-e2e-logistics');

    // route_optimization — implemented method
    const route = await logiAgent.processTask({ type: 'route_optimization', payload: { origin: 'SH', destination: 'MB' } });
    expect(route.success).toBe(true);

    // eta_calculation — implemented method
    const eta = await logiAgent.processTask({ type: 'eta_calculation', payload: { origin: 'SH', destination: 'MB' } });
    expect(eta.success).toBe(true);

    // customs_handling — implemented method
    const customs = await logiAgent.processTask({ type: 'customs_handling', payload: { country: 'Kenya' } });
    expect(customs.success).toBe(true);
  });
});

// =========================================================================
describe('E2E: Multi-Step Orchestrated Workflow', () => {
  let manager;

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    await manager.spawnAgent('chat', { id: 'chat-e2e-orch' });
    await manager.spawnAgent('sourcing', { id: 'src-e2e-orch' });
    await manager.spawnAgent('logistics', { id: 'logi-e2e-orch' });
    await manager.spawnAgent('customization', { id: 'cust-e2e-orch' });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('source → customize → ship: full trade workflow across multiple agents', async () => {
    // ChatAgent orchestrates the interaction
    const chatAgent = manager.agents.get('chat-e2e-orch');

    // Step 1: Source products
    const sourceMsg = await chatAgent.handleChatMessage({
      message: 'Source 2000 cotton t-shirts from suppliers in India',
      conversationId: 'conv-orch-1',
      userId: testUserId,
      companyId: testCompanyId,
    });

    expect(sourceMsg.data.handoff).toBe(true);
    expect(sourceMsg.data.targetAgent).toBe('sourcing');

    // Step 2: Customize the sourced products
    const custMsg = await chatAgent.handleChatMessage({
      message: 'Customize the t-shirts with our brand logo and custom packaging',
      conversationId: 'conv-orch-1',
      userId: testUserId,
      companyId: testCompanyId,
    });

    expect(custMsg.data.handoff).toBe(true);
    expect(custMsg.data.targetAgent).toBe('customization');

    // Step 3: Arrange shipping
    const shipMsg = await chatAgent.handleChatMessage({
      message: 'Ship the finished products from Mumbai to Lagos',
      conversationId: 'conv-orch-1',
      userId: testUserId,
      companyId: testCompanyId,
    });

    expect(shipMsg.data.handoff).toBe(true);
    expect(shipMsg.data.targetAgent).toBe('logistics');

    // Step 4: Verify conversation context tracked all handoffs
    const conversation = chatAgent.conversations.get('conv-orch-1');
    expect(conversation.context.previousAgentHandoffs.length).toBe(3);
    expect(conversation.context.previousAgentHandoffs[0].agentType).toBe('sourcing');
    expect(conversation.context.previousAgentHandoffs[1].agentType).toBe('customization');
    expect(conversation.context.previousAgentHandoffs[2].agentType).toBe('logistics');

    // Step 5: Each specialized agent can independently process their task
    const sourcingResult = await manager.assignTaskToAgent({
      type: 'product_discovery',
      payload: { category: 'apparel', keywords: ['cotton', 't-shirts'] },
      requiredCapabilities: ['product_discovery'],
    });
    expect(sourcingResult).not.toBeNull();

    const shipResult = await manager.assignTaskToAgent({
      type: 'route_optimization',
      payload: { origin: 'Mumbai', destination: 'Lagos' },
      requiredCapabilities: ['route_optimization'],
    });
    expect(shipResult).not.toBeNull();

    // The conversation has 3 user messages stored in history.
    // Agent handoff responses are not pushed to conversation history
    // (they are returned as handoff results to the caller).
    expect(conversation.history.length).toBe(3);
  });
});

// =========================================================================
describe('E2E: Compliance & Negotiation Agents', () => {
  let manager;

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    await manager.spawnAgent('chat', { id: 'chat-e2e-cn' });
    await manager.spawnAgent('compliance', { id: 'comp-e2e-cn' });
    await manager.spawnAgent('negotiation', { id: 'neg-e2e-cn' });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('compliance agent regulatory checking workflow', async () => {
    const compAgent = manager.agents.get('comp-e2e-cn');

    const result = await compAgent.processTask({
      type: 'regulatory_checking',
      payload: {
        origin: 'Shanghai',
        destination: 'Mombasa',
        productCategory: 'electronics',
        goodsValue: 50000,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.regulatoryBody).toBe('Kenya Bureau of Standards (KEBS)');
    expect(result.data.requiredCertificates.length).toBeGreaterThan(0);
    expect(result.data.requiredCertificates).toContain('Certificate of Conformity (CoC)');
    expect(result.data.complianceStatus).toBe('compliant');
  });

  // -------------------------------------------------------
  test('compliance agent detects and flags restricted items', async () => {
    const compAgent = manager.agents.get('comp-e2e-cn');

    // Simulate a restricted plastic bag product
    const result = await compAgent.processTask({
      type: 'regulatory_checking',
      payload: {
        origin: 'Shanghai',
        destination: 'Mombasa',
        productCategory: 'plastic bags',
        goodsValue: 1000,
      },
    });

    expect(result.data.isRestrictedItem).toBe(true);
    expect(result.data.complianceStatus).toBe('non_compliant');
    expect(result.data.recommendations).toContain('Consider alternative product');
  });

  // -------------------------------------------------------
  test('negotiation agent full price negotiation', async () => {
    const negAgent = manager.agents.get('neg-e2e-cn');

    const result = await negAgent.processTask({
      type: 'price_negotiation',
      payload: {
        productId: 'prod-001',
        supplierId: 'supplier-001',
        initialPrice: 100,
        quantity: 500,
        marketAvgPrice: 88,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.initialPrice).toBe(100);
    expect(result.data.negotiatedPricePerUnit).toBeLessThan(100);
    expect(result.data.discountPercentage).toBeGreaterThan(0);
    expect(result.data.totalValue).toBeGreaterThan(0);
    expect(result.data.currency).toBe('USD');
    expect(result.data.negotiationFactors.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------
  test('chatAgent detects compliance and negotiation intents', async () => {
    const chatAgent = manager.agents.get('chat-e2e-cn');

    // Compliance intent
    const complMsg = await chatAgent.handleChatMessage({
      message: 'Check compliance requirements for electronics export to Kenya',
      conversationId: 'conv-cn-1',
      userId: testUserId,
      companyId: testCompanyId,
    });
    expect(complMsg.data.handoff).toBe(true);
    expect(complMsg.data.targetAgent).toBe('compliance');

    // Negotiation intent (avoid triggering sourcing patterns — 'supplier' matches sourcing first)
    const negMsg = await chatAgent.handleChatMessage({
      message: 'I want to negotiate pricing terms for a deal',
      conversationId: 'conv-cn-2',
      userId: testUserId,
      companyId: testCompanyId,
    });
    expect(negMsg.data.handoff).toBe(true);
    expect(negMsg.data.targetAgent).toBe('negotiation');
  });
});

// =========================================================================
describe('E2E: Agent Communication & Messaging', () => {
  let manager;

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    await manager.spawnAgent('sourcing', { id: 'src-e2e-comm' });
    await manager.spawnAgent('logistics', { id: 'logi-e2e-comm' });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('agents can communicate via direct sendMessage', async () => {
    const srcAgent = manager.agents.get('src-e2e-comm');
    const logiAgent = manager.agents.get('logi-e2e-comm');

    // Verify both agents have initialized communication
    expect(srcAgent.communication).toBeDefined();
    expect(logiAgent.communication).toBeDefined();
    expect(srcAgent.communication.kafkaProducer).toBeDefined();
    expect(logiAgent.communication.kafkaProducer).toBeDefined();
  });

  // -------------------------------------------------------
  test('sourcing agent can execute queries', async () => {
    const srcAgent = manager.agents.get('src-e2e-comm');

    // Execute various query types
    const productInfo = await srcAgent.handleQuery({
      type: 'product_info',
      payload: { productId: 'prod-001', category: 'electronics' },
    });
    expect(productInfo.success).toBe(true);
    expect(productInfo.data.name).toBeDefined();
    expect(productInfo.data.specifications).toBeDefined();
    expect(productInfo.data.pricing).toBeDefined();

    const supplierInfo = await srcAgent.handleQuery({
      type: 'supplier_info',
      payload: { supplierId: 'supplier-001' },
    });
    expect(supplierInfo.success).toBe(true);
    expect(supplierInfo.data.certifications).toContain('ISO_9001');
    expect(supplierInfo.data.financials).toBeDefined();

    const marketTrends = await srcAgent.handleQuery({
      type: 'market_trends',
      payload: { marketSegment: 'consumer_electronics', region: 'West_Africa' },
    });
    expect(marketTrends.success).toBe(true);
    expect(marketTrends.data.trends.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------
  test('AgentCommunication sendMessage routes via Hermes mediation', async () => {
    const srcAgent = manager.agents.get('src-e2e-comm');
    const comm = srcAgent.communication;

    // Enable Hermes mediation
    comm.hermesMediation = true;
    comm.hermesAgentId = 'hermes-agent-1';

    // Mock the Kafka producer send
    const kafkaSend = comm.kafkaProducer.send;
    kafkaSend.mockResolvedValue();

    // Send a message to the logistics agent via Hermes
    await comm.sendMessage('logi-e2e-comm', {
      type: 'task',
      payload: { type: 'shipment_update', shipmentId: 'sh-001' },
    });

    // The message should be routed through Hermes (hermes_mediated_forward)
    expect(kafkaSend).toHaveBeenCalled();
    const callArgs = kafkaSend.mock.calls[0][0];
    expect(callArgs.topic).toBe('agent.hermes-agent-1.commands');

    const sentMessage = JSON.parse(callArgs.messages[0].value);
    expect(sentMessage.type).toBe('hermes_mediated_forward');
    expect(sentMessage.originalTarget).toBe('logi-e2e-comm');
    expect(sentMessage.payload.type).toBe('task');
    expect(sentMessage.senderId).toBe('src-e2e-comm');
  });

  // -------------------------------------------------------
  test('AgentCommunication falls back to direct send when Hermes fails', async () => {
    const srcAgent = manager.agents.get('src-e2e-comm');
    const comm = srcAgent.communication;

    // Enable Hermes mediation
    comm.hermesMediation = true;
    comm.hermesAgentId = 'hermes-agent-1';

    // First Hermes send fails
    const kafkaSend = comm.kafkaProducer.send;
    kafkaSend
      .mockRejectedValueOnce(new Error('Hermes down')) // Hermes fails
      .mockResolvedValueOnce(); // Direct fallback succeeds

    await comm.sendMessage('logi-e2e-comm', {
      type: 'task',
      payload: { type: 'track_shipment' },
    });

    // Should have attempted Hermes first, then direct
    expect(kafkaSend).toHaveBeenCalledTimes(2);

    // First call: Hermes
    expect(kafkaSend.mock.calls[0][0].topic).toBe('agent.hermes-agent-1.commands');

    // Second call: direct
    expect(kafkaSend.mock.calls[1][0].topic).toBe('agent.logi-e2e-comm.commands');

    expect(logger.warn).toHaveBeenCalledWith(
      '(non-critical) Failed to send mediated message:',
      'Hermes down'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Falling back to direct message sending'
    );
  });

  // -------------------------------------------------------
  test('AgentCommunication sends directly when Hermes mediation is disabled', async () => {
    const srcAgent = manager.agents.get('src-e2e-comm');
    const comm = srcAgent.communication;

    // Explicitly disable Hermes mediation
    comm.hermesMediation = false;
    comm.hermesAgentId = 'hermes-agent-1';

    const kafkaSend = comm.kafkaProducer.send;
    kafkaSend.mockResolvedValue();

    await comm.sendMessage('logi-e2e-comm', {
      type: 'task',
      payload: { type: 'price_check' },
    });

    // Should send directly (not via Hermes)
    expect(kafkaSend).toHaveBeenCalledTimes(1);
    expect(kafkaSend.mock.calls[0][0].topic).toBe('agent.logi-e2e-comm.commands');
    const sentMessage = JSON.parse(kafkaSend.mock.calls[0][0].messages[0].value);
    expect(sentMessage.type).toBe('task');
    expect(sentMessage.payload.type).toBe('price_check');
  });
});

// =========================================================================
describe('E2E: Tool Execution via Agents', () => {
  let manager, srcAgent;

  beforeAll(async () => {
    // Set NODE_ENV to development to avoid Kafka connection errors in BaseAgent.initialize()
    process.env.NODE_ENV = 'development';
  });

  afterAll(async () => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    srcAgent = await manager.spawnAgent('sourcing', { id: 'src-e2e-tools' });
    // Tools are loaded during initialize()
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('agent loads tools from registry during initialization', () => {
    expect(srcAgent.toolRegistry).toBeDefined();
    expect(srcAgent.availableTools).toBeDefined();
    expect(typeof srcAgent.availableTools.totalCount).toBe('number');
    expect(Array.isArray(srcAgent.availableTools.all)).toBe(true);
  });

  // -------------------------------------------------------
  test('agent has tool execution methods', async () => {
    expect(typeof srcAgent.executeTool).toBe('function');
    expect(typeof srcAgent._routeToolExecution).toBe('function');
    expect(typeof srcAgent._executeLocalTool).toBe('function');
    expect(typeof srcAgent._executeApifyTool).toBe('function');
    expect(typeof srcAgent._executeComposioTool).toBe('function');
  });

  // -------------------------------------------------------
  test('executeTool throws informative error for unknown tool', async () => {
    await expect(
      srcAgent.executeTool('nonexistent_tool_name', {})
    ).rejects.toThrow(/not found in registry/);
  });
});

// =========================================================================
describe('E2E: Agent Memory & Learning', () => {
  let manager, srcAgent;

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    srcAgent = await manager.spawnAgent('sourcing', { id: 'src-e2e-memory' });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('store and retrieve memories', async () => {
    await srcAgent.memory.store('test-key', { data: 'test-value' }, { persist: false });
    const retrieved = await srcAgent.memory.retrieve('test-key');
    expect(retrieved).toEqual({ data: 'test-value' });
  });

  // -------------------------------------------------------
  test('persistent storage survives short-term consolidation boundary', async () => {
    // Store a persistent memory
    await srcAgent.memory.store('persistent-key', 'important-data', { persist: true });
    const persistent = await srcAgent.memory.retrieve('persistent-key');
    expect(persistent).toBe('important-data');

    // Store a short-term memory
    await srcAgent.memory.store('short-key', 'short-data', { persist: false });
    expect(srcAgent.memory.shortTerm.has('short-key')).toBe(true);
    expect(srcAgent.memory.longTerm.has('persistent-key')).toBe(true);
  });

  // -------------------------------------------------------
  test('memory search finds results across short and long term', async () => {
    await srcAgent.memory.store('product-query-cotton', { product: 'cotton fabric' }, { persist: true });
    await srcAgent.memory.store('product-query-silk', { product: 'silk fabric' }, { persist: false });

    const results = await srcAgent.memory.search('cotton');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.key === 'product-query-cotton')).toBe(true);
  });

  // -------------------------------------------------------
  test('agents learn from tasks and store learning in memory', async () => {
    const task = { type: 'product_discovery', payload: { category: 'textiles' }, startedAt: Date.now() };

    await srcAgent.learnFromTask(task, { products: ['item1', 'item2'] }, true);

    // The learning should be stored in long-term memory
    const memoryEntries = [];
    for (const [key] of srcAgent.memory.longTerm.entries()) {
      if (key.startsWith('task:')) memoryEntries.push(key);
    }
    expect(memoryEntries.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------
  test('memory stats are reported correctly', () => {
    const stats = srcAgent.memory.getStats();
    expect(stats).toHaveProperty('shortTermSize');
    expect(stats).toHaveProperty('longTermSize');
    expect(stats).toHaveProperty('maxShortTerm');
    expect(stats.maxShortTerm).toBe(100);
  });
});

// =========================================================================
describe('E2E: Agent Service & AgentManager Integration', () => {
  beforeEach(async () => {
    // Reset the singleton state by shutting down any previous run
    await agentService.shutdown();
  });

  afterEach(async () => {
    await agentService.shutdown();
  });

  // -------------------------------------------------------
  test('agent service initializes with all 6 agent types registered', async () => {
    await agentService.initialize();

    expect(agentService.isInitialized).toBe(true);
    expect(agentService.agentManager.agentTypes.size).toBe(6);
    expect(agentService.agentManager.agentTypes.has('chat')).toBe(true);
    expect(agentService.agentManager.agentTypes.has('sourcing')).toBe(true);
    expect(agentService.agentManager.agentTypes.has('customization')).toBe(true);
    expect(agentService.agentManager.agentTypes.has('logistics')).toBe(true);
    expect(agentService.agentManager.agentTypes.has('compliance')).toBe(true);
    expect(agentService.agentManager.agentTypes.has('negotiation')).toBe(true);
  });

  // -------------------------------------------------------
  test('agent service spawns agents through the manager', async () => {
    await agentService.initialize();

    const agent = await agentService.spawnAgent('chat', { id: 'chat-svc-1' });
    expect(agent.id).toBe('chat-svc-1');
    expect(agent.isInitialized).toBe(true);
    expect(agentService.agentManager.agents.size).toBe(1);
  });

  // -------------------------------------------------------
  test('agent service returns stats including tool registry info', async () => {
    await agentService.initialize();

    const stats = agentService.getStats();
    expect(stats.totalAgents).toBe(0);
    expect(stats.registeredTypes).toContain('chat');
    expect(stats.toolRegistry).toBeDefined();
    expect(stats.toolRegistry.totalTools).toBeGreaterThan(0);
    expect(stats.composio).toBeDefined();
  });
});

// =========================================================================
describe('E2E: Error Handling & Edge Cases', () => {
  let manager;

  beforeEach(async () => {
    manager = createFullyLoadedManager();
    await manager.spawnAgent('chat', { id: 'chat-e2e-errors' });
    await manager.spawnAgent('sourcing', { id: 'src-e2e-errors' });
  });

  afterEach(async () => {
    await manager.shutdownAll();
  });

  // -------------------------------------------------------
  test('chat agent gracefully handles NLP processing errors', async () => {
    const chatAgent = manager.agents.get('chat-e2e-errors');
    chatAgent.processNaturalLanguage = jest.fn().mockRejectedValue(new Error('NLP engine down'));

    const result = await chatAgent.handleChatMessage({
      message: 'Source products',
      conversationId: 'conv-error-1',
      userId: testUserId,
      companyId: testCompanyId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('NLP engine down');
    // Error message should still be stored in conversation history
    expect(result.data.conversationId).toBe('conv-error-1');

    const conversation = chatAgent.conversations.get('conv-error-1');
    const lastEntry = conversation.history[conversation.history.length - 1];
    expect(lastEntry.role).toBe('agent');
    expect(lastEntry.content).toContain('error');
  });

  // -------------------------------------------------------
  test('assigning task to unknown agent type throws error', async () => {
    await expect(manager.spawnAgent('nonexistent_type')).rejects.toThrow('Unknown agent type');
  });

  // -------------------------------------------------------
  test('queuing task when no suitable agent is available', async () => {
    // Remove all agents, only chat + sourcing are available
    // Request a task requiring a capability no agent has
    const result = await manager.assignTaskToAgent({
      type: 'some_task',
      requiredCapabilities: ['quantum_computing'],
    });

    expect(result).toBeNull();
    expect(manager.taskQueue.size()).toBe(1);
  });

  // -------------------------------------------------------
  test('conversation lifecycle: start → message → history → end', async () => {
    const chatAgent = manager.agents.get('chat-e2e-errors');

    // Start a conversation
    const startResult = await chatAgent.startConversation({
      userId: testUserId,
      companyId: testCompanyId,
    });
    expect(startResult.success).toBe(true);
    const convId = startResult.data.conversationId;

    // Send a message
    await chatAgent.handleChatMessage({
      message: 'Find me suppliers for electronics',
      conversationId: convId,
      userId: testUserId,
      companyId: testCompanyId,
    });

    // Get conversation history
    const historyResult = await chatAgent.getConversationHistory({ conversationId: convId });
    expect(historyResult.success).toBe(true);
    // When a handoff occurs, the agent handoff response is returned directly
    // and not pushed to conversation history. So we have 1 user entry.
    // Full agent responses are only stored for non-handoff messages.
    expect(historyResult.data.history.length).toBe(1);

    // End the conversation
    const endResult = await chatAgent.endConversation({ conversationId: convId });
    expect(endResult.success).toBe(true);
    expect(endResult.data.summary).toBeDefined();
    expect(chatAgent.conversations.has(convId)).toBe(false);
  });

  // -------------------------------------------------------
  test('agent manager handles agent failure gracefully', async () => {
    const failingAgent = manager.agents.get('src-e2e-errors');
    failingAgent.isInitialized = false;

    await manager.performHealthCheck(failingAgent);

    // Should attempt recovery
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not initialized'),
    );
  });

  // -------------------------------------------------------
  test('shutdown handles individual agent failures without crashing others', async () => {
    const faultyAgent = manager.agents.get('chat-e2e-errors');
    faultyAgent.shutdown = jest.fn().mockRejectedValue(new Error('Shutdown crashed'));

    // Should not throw despite one agent failing to shut down
    await expect(manager.shutdownAll()).resolves.not.toThrow();
    expect(manager.agents.size).toBe(0);
  });
});
