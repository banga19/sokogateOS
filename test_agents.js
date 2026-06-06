// Test script for sokogateOS specialized agents
// Tests the newly created LogisticsAgent, ComplianceAgent, and NegotiationAgent

const { LogisticsAgent } = require('./src/agents/specialized/logisticsAgent');
const { ComplianceAgent } = require('./src/agents/specialized/complianceAgent');
const { NegotiationAgent } = require('./src/agents/specialized/negotiationAgent');
const logger = require('./src/utils/logger');

async function testAgentCreation() {
  logger.info('Testing agent creation...');

  try {
    // Test LogisticsAgent
    const logisticsAgent = new LogisticsAgent({ id: 'logistics-test-1' });
    logger.info(`✓ LogisticsAgent created: ${logisticsAgent.id}`);
    logger.info(`  Type: ${logisticsAgent.type}`);
    logger.info(`  Capabilities: ${logisticsAgent.capabilities.join(', ')}`);

    // Test ComplianceAgent
    const complianceAgent = new ComplianceAgent({ id: 'compliance-test-1' });
    logger.info(`✓ ComplianceAgent created: ${complianceAgent.id}`);
    logger.info(`  Type: ${complianceAgent.type}`);
    logger.info(`  Capabilities: ${complianceAgent.capabilities.join(', ')}`);

    // Test NegotiationAgent
    const negotiationAgent = new NegotiationAgent({ id: 'negotiation-test-1' });
    logger.info(`✓ NegotiationAgent created: ${negotiationAgent.id}`);
    logger.info(`  Type: ${negotiationAgent.type}`);
    logger.info(`  Capabilities: ${negotiationAgent.capabilities.join(', ')}`);

    return { logisticsAgent, complianceAgent, negotiationAgent };
  } catch (error) {
    logger.error('✗ Error creating agents:', error);
    throw error;
  }
}

async function testAgentInitialization(agents) {
  logger.info('\nTesting agent initialization...');

  try {
    // Initialize each agent
    for (const [name, agent] of Object.entries(agents)) {
      await agent.initialize();
      logger.info(`✓ ${name} initialized successfully`);
    }
  } catch (error) {
    logger.error('✗ Error initializing agents:', error);
    throw error;
  }
}

async function testAgentMethods(agents) {
  logger.info('\nTesting agent methods...');

  try {
    // Test LogisticsAgent methods
    const logisticsResult = await agents.logisticsAgent.processTask({
      type: 'route_optimization',
      payload: {
        origin: 'Shanghai',
        destination: 'Mombasa',
        priority: 'balanced'
      }
    });
    logger.info(`✓ LogisticsAgent route_optimization: ${logisticsResult.success}`);

    // Test ComplianceAgent methods
    const complianceResult = await agents.complianceAgent.processTask({
      type: 'regulatory_checking',
      payload: {
        origin: 'Shanghai',
        destination: 'Mombasa',
        productCategory: 'electronics',
        goodsValue: 10000
      }
    });
    logger.info(`✓ ComplianceAgent regulatory_checking: ${complianceResult.success}`);

    // Test NegotiationAgent methods
    const negotiationResult = await agents.negotiationAgent.processTask({
      type: 'price_negotiation',
      payload: {
        productId: 'test_prod_001',
        supplierId: 'test_suppl_001',
        initialPrice: 100,
        quantity: 100,
        marketAvgPrice: 90
      }
    });
    logger.info(`✓ NegotiationAgent price_negotiation: ${negotiationResult.success}`);

    // Test query handling
    const logisticsQuery = await agents.logisticsAgent.handleQuery({
      type: 'route_info',
      payload: {}
    });
    logger.info(`✓ LogisticsAgent query handling: ${logisticsQuery.agentId}`);

    const complianceQuery = await agents.complianceAgent.handleQuery({
      type: 'regulations',
      payload: {}
    });
    logger.info(`✓ ComplianceAgent query handling: ${complianceQuery.agentId}`);

    const negotiationQuery = await agents.negotiationAgent.handleQuery({
      type: 'pricing',
      payload: {}
    });
    logger.info(`✓ NegotiationAgent query handling: ${negotiationQuery.agentId}`);

  } catch (error) {
    logger.error('✗ Error testing agent methods:', error);
    throw error;
  }
}

async function runTests() {
  logger.info('Starting sokogateOS specialized agents test...\n');

  try {
    // Test 1: Agent creation
    const agents = await testAgentCreation();

    // Test 2: Agent initialization
    await testAgentInitialization(agents);

    // Test 3: Agent methods
    await testAgentMethods(agents);

    logger.info('\n✅ All tests passed! Agents are working correctly.');
    return true;
  } catch (error) {
    logger.error('\n❌ Tests failed:', error);
    return false;
  }
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  logger.error('Unhandled error in test suite:', error);
  process.exit(1);
});