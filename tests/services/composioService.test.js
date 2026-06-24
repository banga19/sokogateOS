// Composio Service Tests for SokogateOS
// Tests the Composio integration wrapper with mocked @composio/core

jest.mock('@composio/core', () => ({
  Composio: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { Composio } = require('@composio/core');
const logger = require('../../src/utils/logger');
const composioService = require('../../src/services/composioService');

describe('ComposioService', () => {
  let mockClient;
  let mockSession;

  beforeAll(() => {
    delete process.env.COMPOSIO_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.COMPOSIO_API_KEY;
    composioService._resetClient();

    mockSession = {
      tools: jest.fn().mockResolvedValue([]),
    };

    mockClient = {
      create: jest.fn().mockResolvedValue(mockSession),
      tools: {
        get: jest.fn().mockResolvedValue([]),
        execute: jest.fn().mockResolvedValue({ data: 'executed' }),
        proxyExecute: jest.fn().mockResolvedValue({ data: 'proxied' }),
      },
      connectedAccounts: {
        link: jest.fn().mockResolvedValue({ redirectUrl: 'https://composio.dev/auth' }),
        list: jest.fn().mockResolvedValue([]),
        disconnect: jest.fn().mockResolvedValue({ success: true }),
      },
    };

    Composio.mockReturnValue(mockClient);
  });

  // ===== STATIC HELPERS =====

  describe('isConfigured', () => {
    test('should return false when COMPOSIO_API_KEY is not set', () => {
      expect(composioService.isConfigured()).toBe(false);
    });

    test('should return true when COMPOSIO_API_KEY is set', () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';
      expect(composioService.isConfigured()).toBe(true);
    });
  });

  describe('getServiceStatus', () => {
    test('should return configured: false when key is missing', () => {
      const status = composioService.getServiceStatus();
      expect(status.configured).toBe(false);
      expect(status.supportedToolkits).toBeGreaterThan(0);
    });

    test('should report toolkit mapping counts', () => {
      const status = composioService.getServiceStatus();
      expect(status.toolkitMap).toBeDefined();
      expect(Object.keys(status.toolkitMap)).toContain('sourcing');
      expect(Object.keys(status.toolkitMap)).toContain('logistics');
      expect(Object.keys(status.toolkitMap)).toContain('compliance');
      expect(Object.keys(status.toolkitMap)).toContain('marketIntelligence');
    });
  });

  // ===== SESSION MANAGEMENT =====

  describe('createSession', () => {
    test('should create a session for a user', async () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';

      const session = await composioService.createSession('user_123');

      expect(Composio).toHaveBeenCalledWith({ apiKey: 'test-key-123' });
      expect(mockClient.create).toHaveBeenCalledWith('user_123');
      expect(session).toBe(mockSession);
    });

    test('should return null when API key is not set', async () => {
      const session = await composioService.createSession('user_123');
      expect(session).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('COMPOSIO_API_KEY not set')
      );
    });

    test('should return null on error and log it', async () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';
      mockClient.create.mockRejectedValue(new Error('Connection failed'));

      const session = await composioService.createSession('user_123');
      expect(session).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create session'),
        'Connection failed'
      );
    });
  });

  describe('getTools', () => {
    test('should get tools for a user via session', async () => {
      const mockTools = [{ name: 'gmail_send', description: 'Send email' }];
      mockSession.tools.mockResolvedValue(mockTools);

      process.env.COMPOSIO_API_KEY = 'test-key-123';
      const tools = await composioService.getTools('user_123');

      expect(mockClient.create).toHaveBeenCalledWith('user_123');
      expect(mockSession.tools).toHaveBeenCalled();
      expect(tools).toEqual(mockTools);
    });

    test('should filter by toolkits when provided', async () => {
      const mockTools = [{ name: 'github_list_prs', toolkit: 'github' }];
      mockClient.tools.get.mockResolvedValue(mockTools);

      process.env.COMPOSIO_API_KEY = 'test-key-123';
      const tools = await composioService.getTools('user_123', {
        toolkits: ['github', 'gmail'],
      });

      expect(mockClient.tools.get).toHaveBeenCalledWith('user_123', {
        toolkits: ['github', 'gmail'],
      });
      expect(tools).toEqual(mockTools);
    });

    test('should return empty array without API key', async () => {
      const tools = await composioService.getTools('user_123');
      expect(tools).toEqual([]);
    });
  });

  // ===== ACCOUNT MANAGEMENT =====

  describe('connectAccount', () => {
    test('should initiate OAuth connection and return redirect URL', async () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';

      const result = await composioService.connectAccount('user_123', 'github');

      expect(mockClient.connectedAccounts.link).toHaveBeenCalledWith('user_123', 'github');
      expect(result.redirectUrl).toBe('https://composio.dev/auth');
    });

    test('should normalize tool name to lowercase', async () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';
      await composioService.connectAccount('user_123', 'GMAIL');

      expect(mockClient.connectedAccounts.link).toHaveBeenCalledWith('user_123', 'gmail');
    });

    test('should return null without API key', async () => {
      const result = await composioService.connectAccount('user_123', 'github');
      expect(result).toBeNull();
    });
  });

  describe('listConnectedAccounts', () => {
    test('should list connected accounts for a user', async () => {
      const mockAccounts = [{ id: 'ca_1', appName: 'github' }];
      mockClient.connectedAccounts.list.mockResolvedValue(mockAccounts);

      process.env.COMPOSIO_API_KEY = 'test-key-123';
      const accounts = await composioService.listConnectedAccounts('user_123');

      expect(mockClient.connectedAccounts.list).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(accounts).toEqual(mockAccounts);
    });

    test('should return empty array without API key', async () => {
      const accounts = await composioService.listConnectedAccounts('user_123');
      expect(accounts).toEqual([]);
    });
  });

  describe('disconnectAccount', () => {
    test('should disconnect a connected account', async () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';

      const result = await composioService.disconnectAccount('ca_123');

      expect(mockClient.connectedAccounts.disconnect).toHaveBeenCalledWith('ca_123');
      expect(result).toBe(true);
    });

    test('should return false without API key', async () => {
      const result = await composioService.disconnectAccount('ca_123');
      expect(result).toBe(false);
    });
  });

  // ===== TOOL EXECUTION =====

  describe('executeTool', () => {
    test('should execute a tool action directly', async () => {
      mockClient.tools.execute.mockResolvedValue({ data: { stargazers_count: 100 } });

      process.env.COMPOSIO_API_KEY = 'test-key-123';
      const result = await composioService.executeTool('GITHUB_LIST_STARGAZERS', {
        userId: 'user_123',
        arguments: { owner: 'composiohq', repo: 'composio', page: 1, per_page: 5 },
      });

      expect(mockClient.tools.execute).toHaveBeenCalledWith('GITHUB_LIST_STARGAZERS', {
        userId: 'user_123',
        arguments: { owner: 'composiohq', repo: 'composio', page: 1, per_page: 5 },
        connectedAccountId: undefined,
      });
      expect(result.data.stargazers_count).toBe(100);
    });

    test('should pass connectedAccountId when provided', async () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';
      await composioService.executeTool('GMAIL_SEND_EMAIL', {
        userId: 'user_123',
        arguments: { to: 'test@example.com', subject: 'Hello', body: 'World' },
        connectedAccountId: 'ca_456',
      });

      expect(mockClient.tools.execute).toHaveBeenCalledWith('GMAIL_SEND_EMAIL', {
        userId: 'user_123',
        arguments: { to: 'test@example.com', subject: 'Hello', body: 'World' },
        connectedAccountId: 'ca_456',
      });
    });

    test('should return null without API key', async () => {
      const result = await composioService.executeTool('GITHUB_LIST_STARGAZERS', {
        userId: 'user_123',
        arguments: {},
      });
      expect(result).toBeNull();
    });
  });

  describe('proxyExecute', () => {
    test('should execute a proxy request to a tool API', async () => {
      const mockResponse = { data: { id: 1, title: 'Issue title' } };
      mockClient.tools.proxyExecute.mockResolvedValue(mockResponse);

      process.env.COMPOSIO_API_KEY = 'test-key-123';
      const result = await composioService.proxyExecute({
        endpoint: '/repos/owner/repo/issues/1',
        method: 'GET',
        connectedAccountId: 'ca_123',
      });

      expect(mockClient.tools.proxyExecute).toHaveBeenCalledWith({
        endpoint: '/repos/owner/repo/issues/1',
        method: 'GET',
        data: undefined,
        connectedAccountId: 'ca_123',
      });
      expect(result).toEqual(mockResponse);
    });

    test('should return null without API key', async () => {
      const result = await composioService.proxyExecute({
        endpoint: '/test',
        method: 'GET',
        connectedAccountId: 'ca_123',
      });
      expect(result).toBeNull();
    });

    test('should validate required fields', async () => {
      process.env.COMPOSIO_API_KEY = 'test-key-123';

      // Missing endpoint
      let result = await composioService.proxyExecute({
        method: 'GET',
        connectedAccountId: 'ca_123',
      });
      expect(result).toBeNull();

      // Missing connectedAccountId
      result = await composioService.proxyExecute({
        endpoint: '/test',
        method: 'GET',
      });
      expect(result).toBeNull();

      // Ensure execute was never called with invalid params
      expect(mockClient.tools.proxyExecute).not.toHaveBeenCalled();
    });
  });

  // ===== TOOLKIT DISCOVERY =====

  describe('getRecommendedToolkits', () => {
    test('should return sourcing toolkits', () => {
      const toolkits = composioService.getRecommendedToolkits('sourcing');
      expect(toolkits).toContain('gmail');
      expect(toolkits).toContain('salesforce');
      expect(toolkits).toContain('linkedin');
    });

    test('should return logistics toolkits', () => {
      const toolkits = composioService.getRecommendedToolkits('logistics');
      expect(toolkits).toContain('slack');
      expect(toolkits).toContain('jira');
    });

    test('should return default toolkits for unknown agent type', () => {
      const toolkits = composioService.getRecommendedToolkits('unknown_type');
      expect(toolkits).toEqual(['gmail', 'slack']);
    });
  });

  describe('AGENT_TOOLKIT_MAP', () => {
    test('should define toolkits for all agent types', () => {
      const agentTypes = ['sourcing', 'logistics', 'compliance', 'negotiation', 'customization', 'marketIntelligence'];
      for (const type of agentTypes) {
        expect(composioService.AGENT_TOOLKIT_MAP[type]).toBeDefined();
        expect(composioService.AGENT_TOOLKIT_MAP[type].length).toBeGreaterThan(0);
      }
    });
  });

  // ===== GRACEFUL DEGRADATION =====

  describe('graceful degradation without API key', () => {
    test('createSession should return null', async () => {
      const session = await composioService.createSession('user_123');
      expect(session).toBeNull();
    });

    test('getTools should return empty array', async () => {
      const tools = await composioService.getTools('user_123');
      expect(tools).toEqual([]);
    });

    test('connectAccount should return null', async () => {
      const result = await composioService.connectAccount('user_123', 'github');
      expect(result).toBeNull();
    });

    test('listConnectedAccounts should return empty array', async () => {
      const accounts = await composioService.listConnectedAccounts('user_123');
      expect(accounts).toEqual([]);
    });

    test('disconnectAccount should return false', async () => {
      const result = await composioService.disconnectAccount('ca_123');
      expect(result).toBe(false);
    });

    test('executeTool should return null', async () => {
      const result = await composioService.executeTool('GITHUB_LIST_STARGAZERS', { userId: 'user_123', arguments: {} });
      expect(result).toBeNull();
    });
  });
});
