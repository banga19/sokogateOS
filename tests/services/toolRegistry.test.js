// Tool Registry Tests for SokogateOS
// Tests the unified tool registry that combines Apify, Composio, and local tools

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock composio service
jest.mock('../../src/services/composioService', () => ({
  isConfigured: jest.fn().mockReturnValue(false),
  getRecommendedToolkits: jest.fn().mockReturnValue(['gmail', 'slack']),
  getTools: jest.fn().mockResolvedValue([
    { name: 'gmail_send', description: 'Send email', function: { name: 'gmail_send', description: 'Send email', parameters: { type: 'object' } } },
  ]),
  getServiceStatus: jest.fn().mockReturnValue({ configured: false, supportedToolkits: 6, toolkitMap: {} }),
}));

jest.mock('../../src/services/apifyService', () => ({
  isConfigured: jest.fn().mockReturnValue(false),
  getServiceStatus: jest.fn().mockReturnValue({ configured: false, actorCount: 7 }),
}));

const toolRegistry = require('../../src/services/toolRegistry');

describe('ToolRegistry', () => {
  // ===== STATIC DEFINITIONS =====

  describe('LOCAL_TOOLS', () => {
    test('should define all tool categories', () => {
      const tools = Object.values(toolRegistry.LOCAL_TOOLS);
      expect(tools.length).toBeGreaterThan(15);

      // Verify all tools have required fields
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.provider).toBeDefined();
        expect(tool.category).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.params).toBeDefined();
      }
    });

    test('should have tools in each provider category', () => {
      const tools = Object.values(toolRegistry.LOCAL_TOOLS);
      expect(tools.some((t) => t.provider === 'local')).toBe(true);
      expect(tools.some((t) => t.provider === 'apify')).toBe(true);
      expect(tools.some((t) => t.provider === 'composio')).toBe(true);
    });

    test('should have sourcing tools', () => {
      const sourcingTools = Object.values(toolRegistry.LOCAL_TOOLS).filter((t) => t.category === 'sourcing');
      expect(sourcingTools.length).toBeGreaterThanOrEqual(3);
      expect(sourcingTools.map((t) => t.name)).toContain('supplier_search');
      expect(sourcingTools.map((t) => t.name)).toContain('supplier_enrich');
    });

    test('should have compliance tools', () => {
      const complianceTools = Object.values(toolRegistry.LOCAL_TOOLS).filter((t) => t.category === 'compliance');
      expect(complianceTools.length).toBeGreaterThanOrEqual(3);
      expect(complianceTools.map((t) => t.name)).toContain('hs_classify');
      expect(complianceTools.map((t) => t.name)).toContain('duty_calculate');
    });

    test('should have market intelligence tools', () => {
      const miTools = Object.values(toolRegistry.LOCAL_TOOLS).filter((t) => t.category === 'marketIntelligence');
      expect(miTools.length).toBeGreaterThanOrEqual(3);
      expect(miTools.map((t) => t.name)).toContain('pricing_scrape');
      expect(miTools.map((t) => t.name)).toContain('market_news');
    });
  });

  // ===== TOOL CATEGORIES =====

  describe('TOOL_CATEGORIES', () => {
    test('should define a category for each agent type', () => {
      const expectedCategories = ['sourcing', 'logistics', 'compliance', 'customization', 'negotiation', 'marketIntelligence', 'communication', 'system'];
      for (const cat of expectedCategories) {
        expect(toolRegistry.TOOL_CATEGORIES[cat]).toBeDefined();
        expect(toolRegistry.TOOL_CATEGORIES[cat].length).toBeGreaterThan(0);
      }
    });
  });

  // ===== TOOL LOOKUP =====

  describe('getTool', () => {
    test('should return tool by name', () => {
      const tool = toolRegistry.getTool('hs_classify');
      expect(tool).toBeDefined();
      expect(tool.name).toBe('hs_classify');
      expect(tool.provider).toBe('local');
      expect(tool.category).toBe('compliance');
    });

    test('should return null for unknown tool', () => {
      const tool = toolRegistry.getTool('nonexistent_tool');
      expect(tool).toBeNull();
    });
  });

  describe('getToolsForAgent', () => {
    test('should return tools for sourcing agent', async () => {
      const result = await toolRegistry.getToolsForAgent('sourcing');

      expect(result.local.length).toBeGreaterThan(0);
      expect(result.apify.length).toBeGreaterThan(0);
      expect(result.composio).toBeDefined();
      expect(result.all.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);

      // Verify sourcing tools are present
      const toolNames = result.all.map((t) => t.name);
      expect(toolNames).toContain('supplier_search');
      expect(toolNames).toContain('supplier_discover');
    });

    test('should return tools for compliance agent', async () => {
      const result = await toolRegistry.getToolsForAgent('compliance');

      const toolNames = result.all.map((t) => t.name);
      expect(toolNames).toContain('compliance_check');
      expect(toolNames).toContain('hs_classify');
      expect(toolNames).toContain('korean_compliance_check');
    });

    test('should return tools for logistics agent', async () => {
      const result = await toolRegistry.getToolsForAgent('logistics');

      const toolNames = result.all.map((t) => t.name);
      expect(toolNames).toContain('route_optimize');
      expect(toolNames).toContain('duty_calculate');
    });

    test('should return tools for market intelligence agent', async () => {
      const result = await toolRegistry.getToolsForAgent('marketIntelligence');

      const toolNames = result.all.map((t) => t.name);
      expect(toolNames).toContain('pricing_scrape');
      expect(toolNames).toContain('market_news');
      expect(toolNames).toContain('korean_market_fit');
    });

    test('should return composio tools when configured', async () => {
      // Temporarily enable composio mock
      const composioService = require('../../src/services/composioService');
      composioService.isConfigured.mockReturnValue(true);

      const result = await toolRegistry.getToolsForAgent('sourcing', 'user_123');

      expect(result.composio.length).toBeGreaterThan(0);
      expect(result.all.some((t) => t.provider === 'composio')).toBe(true);
    });
  });

  // ===== REGISTRATION =====

  describe('registerTool', () => {
    test('should register a new custom tool', () => {
      toolRegistry.registerTool('custom_test_tool', {
        provider: 'local',
        category: 'sourcing',
        description: 'A custom test tool',
        service: 'testService',
        params: { input: 'string' },
      });

      const tool = toolRegistry.getTool('custom_test_tool');
      expect(tool).toBeDefined();
      expect(tool.name).toBe('custom_test_tool');
      expect(tool.provider).toBe('local');
      expect(tool.category).toBe('sourcing');
    });

    test('should throw error for missing name', () => {
      expect(() => toolRegistry.registerTool('', { provider: 'local' })).toThrow('Tool name');
    });

    test('should throw error for missing definition', () => {
      expect(() => toolRegistry.registerTool('test', null)).toThrow('Tool name');
    });
  });

  // ===== LISTING =====

  describe('listTools', () => {
    test('should list all tools', () => {
      const tools = toolRegistry.listTools();
      expect(tools.length).toBeGreaterThan(15);
    });

    test('should filter by category', () => {
      const tools = toolRegistry.listTools({ category: 'sourcing' });
      expect(tools.length).toBeGreaterThanOrEqual(3);
      expect(tools.every((t) => t.category === 'sourcing')).toBe(true);
    });

    test('should filter by provider', () => {
      const tools = toolRegistry.listTools({ provider: 'apify' });
      expect(tools.length).toBeGreaterThanOrEqual(4);
      expect(tools.every((t) => t.provider === 'apify')).toBe(true);
    });
  });

  // ===== CATEGORIES =====

  describe('getCategories', () => {
    test('should return all category names', () => {
      const categories = toolRegistry.getCategories();
      expect(categories).toContain('sourcing');
      expect(categories).toContain('compliance');
      expect(categories).toContain('marketIntelligence');
      expect(categories).toContain('system');
    });
  });

  describe('getCategoryBreakdown', () => {
    test('should return category counts', () => {
      const breakdown = toolRegistry.getCategoryBreakdown();
      expect(breakdown.sourcing).toBeGreaterThanOrEqual(3);
      expect(breakdown.compliance).toBeGreaterThanOrEqual(3);
    });
  });

  // ===== STATUS =====

  describe('getServiceStatus', () => {
    test('should return registry statistics', () => {
      const status = toolRegistry.getServiceStatus();
      expect(status.totalTools).toBeGreaterThan(15);
      expect(status.categories).toBeDefined();
      expect(status.byProvider).toBeDefined();
      expect(status.byProvider.local).toBeGreaterThan(0);
      expect(status.byProvider.apify).toBeGreaterThan(0);
      expect(status.byProvider.composio).toBeGreaterThan(0);
      // These booleans depend on env vars — just verify they exist
      expect(typeof status.composioConfigured).toBe('boolean');
      expect(typeof status.apifyConfigured).toBe('boolean');
    });
  });
});
