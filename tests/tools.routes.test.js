// Tool API Route Tests for SokogateOS
// Tests the /api/tools endpoints for tool listing, Composio OAuth,
// and tool execution.

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../src/middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test_user_123', role: 'company_admin', email: 'test@example.com' };
    next();
  }),
  authorize: jest.fn(() => (req, res, next) => next()),
}));

jest.mock('../src/services/toolRegistry', () => {
  const actual = jest.requireActual('../src/services/toolRegistry');
  return {
    ...actual,
    listTools: jest.fn().mockImplementation((filters) => {
      const allTools = Object.values(actual.LOCAL_TOOLS);
      if (filters.category) return allTools.filter((t) => t.category === filters.category);
      if (filters.provider) return allTools.filter((t) => t.provider === filters.provider);
      return allTools;
    }),
    getTool: jest.fn().mockImplementation((name) => {
      return actual.LOCAL_TOOLS[name] || null;
    }),
    getCategories: jest.fn().mockReturnValue(Object.keys(actual.TOOL_CATEGORIES)),
    getCategoryBreakdown: jest.fn().mockImplementation(() => {
      const breakdown = {};
      for (const [cat, tools] of Object.entries(actual.TOOL_CATEGORIES)) {
        breakdown[cat] = tools.length;
      }
      return breakdown;
    }),
    getServiceStatus: jest.fn().mockReturnValue({
      totalTools: 19,
      categories: { sourcing: 5, logistics: 4, compliance: 5, customization: 2, negotiation: 2, marketIntelligence: 6, communication: 2, system: 2 },
      byProvider: { local: 9, apify: 8, composio: 2 },
      composioConfigured: false,
      apifyConfigured: false,
    }),
    getToolsForAgent: jest.fn().mockResolvedValue({
      local: [{ name: 'supplier_search', provider: 'local', category: 'sourcing', description: 'Search for suppliers' }],
      apify: [{ name: 'supplier_discover', provider: 'apify', category: 'sourcing', description: 'Discover suppliers' }],
      composio: [],
      all: [
        { name: 'supplier_search', provider: 'local', category: 'sourcing', description: 'Search for suppliers' },
        { name: 'supplier_discover', provider: 'apify', category: 'sourcing', description: 'Discover suppliers' },
      ],
      totalCount: 2,
    }),
  };
});

jest.mock('../src/services/composioService', () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  getServiceStatus: jest.fn().mockReturnValue({ configured: true, supportedToolkits: 6, toolkitMap: {} }),
  connectAccount: jest.fn().mockResolvedValue({ redirectUrl: 'https://composio.dev/auth/callback?token=abc123' }),
  listConnectedAccounts: jest.fn().mockResolvedValue([
    { id: 'ca_123', appName: 'github', status: 'active', createdAt: new Date().toISOString(), integrationId: 'int_1' },
    { id: 'ca_456', appName: 'gmail', status: 'active', createdAt: new Date().toISOString(), integrationId: 'int_2' },
  ]),
  disconnectAccount: jest.fn().mockResolvedValue(true),
  executeTool: jest.fn().mockResolvedValue({ data: { success: true, content: 'executed' } }),
  proxyExecute: jest.fn().mockResolvedValue({ data: { success: true, content: 'proxied' } }),
}));

const request = require('supertest');
const express = require('express');
const toolRoutes = require('../src/routes/tools');

// Build a minimal Express app with the tool routes
const app = express();
app.use(express.json());
app.use('/api/tools', toolRoutes);

describe('Tool API Routes', () => {
  // ===== TOOL LISTING =====

  describe('GET /api/tools', () => {
    test('should list all tools', async () => {
      const res = await request(app).get('/api/tools');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tools.length).toBeGreaterThan(15);
      expect(res.body.data.total).toBeGreaterThan(15);
    });

    test('should filter tools by category', async () => {
      const res = await request(app).get('/api/tools?category=sourcing');
      expect(res.status).toBe(200);
      expect(res.body.data.tools.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.tools.every((t) => t.category === 'sourcing')).toBe(true);
    });

    test('should filter tools by provider', async () => {
      const res = await request(app).get('/api/tools?provider=apify');
      expect(res.status).toBe(200);
      expect(res.body.data.tools.every((t) => t.provider === 'apify')).toBe(true);
    });
  });

  // ===== CATEGORIES =====

  describe('GET /api/tools/categories', () => {
    test('should list all tool categories with details', async () => {
      const res = await request(app).get('/api/tools/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(7);
      expect(res.body.data.total).toBeGreaterThanOrEqual(7);

      // Each category should have tools array
      const sourcing = res.body.data.categories.find((c) => c.name === 'sourcing');
      expect(sourcing).toBeDefined();
      expect(sourcing.toolCount).toBeGreaterThan(0);
      expect(sourcing.tools.length).toBeGreaterThan(0);
    });
  });

  // ===== AGENT-SPECIFIC TOOLS =====

  describe('GET /api/tools/for-agent/:agentType', () => {
    test('should return tools for sourcing agent', async () => {
      const res = await request(app).get('/api/tools/for-agent/sourcing');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.local.length).toBeGreaterThan(0);
      expect(res.body.data.totalCount).toBe(2);
    });

    test('should return tools for compliance agent', async () => {
      const res = await request(app).get('/api/tools/for-agent/compliance');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should return 400 for invalid agent type', async () => {
      const res = await request(app).get('/api/tools/for-agent/nonexistent_type');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== SPECIFIC TOOL =====

  describe('GET /api/tools/:toolName', () => {
    test('should return a specific tool by name', async () => {
      const res = await request(app).get('/api/tools/hs_classify');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('hs_classify');
      expect(res.body.data.provider).toBe('local');
      expect(res.body.data.category).toBe('compliance');
    });

    test('should return 404 for unknown tool', async () => {
      const res = await request(app).get('/api/tools/unknown_tool');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== COMPOSIO OAUTH CONNECTION =====

  describe('POST /api/tools/connect', () => {
    test('should initiate OAuth connection for a tool', async () => {
      const res = await request(app)
        .post('/api/tools/connect')
        .send({ toolName: 'github' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.redirectUrl).toBeDefined();
      expect(res.body.data.toolName).toBe('github');
    });

    test('should return 400 when toolName is missing', async () => {
      const res = await request(app).post('/api/tools/connect').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== LIST CONNECTED ACCOUNTS =====

  describe('GET /api/tools/connections', () => {
    test('should list connected accounts', async () => {
      const res = await request(app).get('/api/tools/connections');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accounts.length).toBe(2);
      expect(res.body.data.total).toBe(2);
    });
  });

  // ===== DISCONNECT ACCOUNT =====

  describe('DELETE /api/tools/connections/:connectionId', () => {
    test('should disconnect an account', async () => {
      const res = await request(app).delete('/api/tools/connections/ca_123');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.connectionId).toBe('ca_123');
    });
  });

  // ===== TOOL EXECUTION =====

  describe('POST /api/tools/execute', () => {
    test('should execute a tool action', async () => {
      const res = await request(app)
        .post('/api/tools/execute')
        .send({
          toolAction: 'GITHUB_LIST_STARGAZERS',
          params: {
            arguments: { owner: 'composiohq', repo: 'composio', page: 1, per_page: 5 },
            connectedAccountId: 'ca_123',
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.toolAction).toBe('GITHUB_LIST_STARGAZERS');
      expect(res.body.data.result).toBeDefined();
    });

    test('should return 400 when toolAction is missing', async () => {
      const res = await request(app)
        .post('/api/tools/execute')
        .send({ params: {} });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return 400 when params is missing', async () => {
      const res = await request(app)
        .post('/api/tools/execute')
        .send({ toolAction: 'TEST_ACTION' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== PROXY EXECUTION =====

  describe('POST /api/tools/proxy-execute', () => {
    test('should execute a proxy request', async () => {
      const res = await request(app)
        .post('/api/tools/proxy-execute')
        .send({
          endpoint: '/repos/owner/repo/issues',
          method: 'GET',
          connectedAccountId: 'ca_123',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/tools/proxy-execute')
        .send({ endpoint: '/test' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ===== STATUS =====

  describe('GET /api/tools/status', () => {
    test('should return registry and composio status', async () => {
      const res = await request(app).get('/api/tools/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registry).toBeDefined();
      expect(res.body.data.registry.totalTools).toBeGreaterThan(0);
      expect(res.body.data.composio).toBeDefined();
      expect(res.body.data.composio.configured).toBe(true);
    });
  });
});
