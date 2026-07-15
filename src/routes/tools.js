// Tool Registry API Routes for SokogateOS
// Provides endpoints for listing available tools, connecting external accounts
// via Composio OAuth, and executing tool actions from the frontend.

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');
const { requireApiKey } = require('../middleware/apiKeyAuth');

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

const getToolRegistry = () => {
  try {
    return require('../services/toolRegistry');
  } catch {
    return null;
  }
};

const getComposioService = () => {
  try {
    return require('../services/composioService');
  } catch {
    return null;
  }
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ──────────────────────────────────────────────
//  Tool Listing & Discovery (API key or JWT required)
// ──────────────────────────────────────────────

// Protect all public listing/discovery routes with API key authentication.
// JWT-authenticated requests (req.user present) are allowed through automatically.
// In dev mode without EXTERNAL_API_KEY, requests pass through with a warning.
router.use(requireApiKey({ required: true, passthrough: true }));

/**
 * @route GET /api/tools
 * @description List all available tools with optional filtering.
 * @query {string} [category] - Filter by category (sourcing, logistics, compliance, etc.)
 * @query {string} [provider] - Filter by provider (local, apify, composio)
 * @access API Key or Authenticated
 */
router.get('/', asyncHandler(async (req, res) => {
  const registry = getToolRegistry();
  if (!registry) {
    return res.status(503).json({ success: false, error: 'Tool registry not available' });
  }

  const { category, provider } = req.query;
  const filters = {};
  if (category) filters.category = category;
  if (provider) filters.provider = provider;

  const tools = registry.listTools(filters);

  res.json({
    success: true,
    data: {
      tools,
      total: tools.length,
      filters: { category: category || null, provider: provider || null },
    },
  });
}));

/**
 * @route GET /api/tools/categories
 * @description Get all tool categories with tool counts.
 * @access API Key or Authenticated
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const registry = getToolRegistry();
  if (!registry) {
    return res.status(503).json({ success: false, error: 'Tool registry not available' });
  }

  const categories = registry.getCategories();
  const breakdown = registry.getCategoryBreakdown();

  const categoryDetails = categories.map((cat) => {
    const tools = registry.listTools({ category: cat });
    return {
      name: cat,
      toolCount: breakdown[cat],
      tools: tools.map((t) => ({
        name: t.name,
        provider: t.provider,
        description: t.description,
      })),
    };
  });

  res.json({
    success: true,
    data: { categories: categoryDetails, total: categories.length, breakdown },
  });
}));

/**
 * @route GET /api/tools/for-agent/:agentType
 * @description Get tools available for a specific agent type.
 * @param {string} agentType - Agent type (sourcing, logistics, compliance, etc.)
 * @access API Key or Authenticated
 */
router.get('/for-agent/:agentType', asyncHandler(async (req, res) => {
  const registry = getToolRegistry();
  if (!registry) {
    return res.status(503).json({ success: false, error: 'Tool registry not available' });
  }

  const { agentType } = req.params;
  const userId = req.user?.id || 'system';

  const validTypes = registry.getCategories();
  if (!validTypes.includes(agentType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid agent type "${agentType}". Valid types: ${validTypes.join(', ')}`,
    });
  }

  const tools = await registry.getToolsForAgent(agentType, userId);

  res.json({ success: true, data: tools });
}));

/**
 * @route GET /api/tools/status
 * @description Get tool registry and Composio service status.
 * @access API Key or Authenticated
 */
router.get('/status', asyncHandler(async (req, res) => {
  const registry = getToolRegistry();
  const composio = getComposioService();

  res.json({
    success: true,
    data: {
      registry: registry ? registry.getServiceStatus() : { error: 'Not available' },
      composio: composio ? composio.getServiceStatus() : { error: 'Not available' },
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route GET /api/tools/connections
 * @description List all connected external accounts for the authenticated user.
 * @access Authenticated
 */
router.get('/connections', authenticate, asyncHandler(async (req, res) => {
  const composio = getComposioService();
  if (!composio) {
    return res.status(503).json({ success: false, error: 'Composio service not available' });
  }

  if (!composio.isConfigured()) {
    return res.json({ success: true, data: { accounts: [], total: 0 } });
  }

  const userId = req.user.id.toString();
  const accounts = await composio.listConnectedAccounts(userId);

  res.json({
    success: true,
    data: {
      accounts: accounts.map((a) => ({
        id: a.id,
        appName: a.appName || a.integrationName || 'Unknown',
        status: a.status || 'active',
        connectedAt: a.createdAt || a.connectedAt || null,
        integrationId: a.integrationId || null,
      })),
      total: accounts.length,
    },
  });
}));

/**
 * @route DELETE /api/tools/connections/:connectionId
 * @description Disconnect a connected external account.
 * @param {string} connectionId - Composio connected account ID
 * @access Authenticated
 */
router.delete('/connections/:connectionId', authenticate, asyncHandler(async (req, res) => {
  const composio = getComposioService();
  if (!composio) {
    return res.status(503).json({ success: false, error: 'Composio service not available' });
  }

  const { connectionId } = req.params;
  const success = await composio.disconnectAccount(connectionId);

  if (!success) {
    return res.status(500).json({ success: false, error: 'Failed to disconnect account' });
  }

  res.json({
    success: true,
    data: { message: 'Account disconnected successfully', connectionId },
  });
}));

/**
 * @route GET /api/tools/:toolName
 * @description Get a specific tool definition by name. Must come after all
 * fixed-path routes to avoid conflicts with /categories, /status, /connections.
 * @param {string} toolName - Tool identifier (e.g., 'hs_classify', 'supplier_search')
 * @access API Key or Authenticated
 */
router.get('/:toolName', asyncHandler(async (req, res) => {
  const registry = getToolRegistry();
  if (!registry) {
    return res.status(503).json({ success: false, error: 'Tool registry not available' });
  }

  const tool = registry.getTool(req.params.toolName);
  if (!tool) {
    return res.status(404).json({ success: false, error: `Tool "${req.params.toolName}" not found` });
  }

  res.json({ success: true, data: tool });
}));

// ──────────────────────────────────────────────
//  Composio Account Connection (requires auth)
// ──────────────────────────────────────────────

/**
 * @route POST /api/tools/connect
 * @description Initiate Composio OAuth flow to connect an external account.
 * @body {string} toolName - Tool to connect (e.g., 'gmail', 'github', 'slack', 'salesforce')
 * @access Authenticated
 */
router.post('/connect', authenticate, asyncHandler(async (req, res) => {
  const composio = getComposioService();
  if (!composio) {
    return res.status(503).json({ success: false, error: 'Composio service not available' });
  }

  if (!composio.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Composio not configured. Set COMPOSIO_API_KEY to enable external tool connections.',
    });
  }

  const { toolName } = req.body;
  if (!toolName || typeof toolName !== 'string') {
    return res.status(400).json({ success: false, error: 'toolName must be a non-empty string' });
  }

  const userId = req.user.id.toString();
  const result = await composio.connectAccount(userId, toolName);

  if (!result) {
    return res.status(500).json({ success: false, error: `Failed to initiate connection for ${toolName}` });
  }

  res.json({
    success: true,
    data: {
      toolName: toolName.toLowerCase(),
      redirectUrl: result.redirectUrl,
      message: `Please visit the redirect URL to authorize ${toolName} access.`,
    },
  });
}));

// ──────────────────────────────────────────────
//  Tool Execution (requires auth)
// ──────────────────────────────────────────────

/**
 * @route POST /api/tools/execute
 * @description Execute a Composio tool action directly.
 * @body {string} toolAction - Action name (e.g., 'GMAIL_SEND_EMAIL', 'GITHUB_LIST_STARGAZERS')
 * @body {Object} params - Action parameters
 * @body {string} [params.connectedAccountId] - Specific connected account to use
 * @access Authenticated
 */
router.post('/execute', authenticate, asyncHandler(async (req, res) => {
  const composio = getComposioService();
  if (!composio) {
    return res.status(503).json({ success: false, error: 'Composio service not available' });
  }

  if (!composio.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Composio not configured. Set COMPOSIO_API_KEY to enable tool execution.',
    });
  }

  const { toolAction, params } = req.body;

  if (!toolAction || typeof toolAction !== 'string') {
    return res.status(400).json({ success: false, error: 'toolAction must be a non-empty string' });
  }
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return res.status(400).json({ success: false, error: 'params object is required' });
  }

  const userId = req.user.id.toString();
  const result = await composio.executeTool(toolAction, {
    userId,
    arguments: params.arguments || {},
    connectedAccountId: params.connectedAccountId,
  });

  if (!result) {
    return res.status(500).json({ success: false, error: `Failed to execute ${toolAction}` });
  }

  res.json({
    success: true,
    data: {
      toolAction,
      result,
      executedAt: new Date().toISOString(),
    },
  });
}));

/**
 * @route POST /api/tools/proxy-execute
 * @description Execute a raw API proxy request via a connected tool.
 * @body {string} endpoint - API endpoint
 * @body {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @body {Object} [data] - Request body for POST/PUT
 * @body {string} connectedAccountId - Connected account ID
 * @access Authenticated (admin)
 */
router.post('/proxy-execute', authenticate, authorize('super_admin', 'company_admin'), asyncHandler(async (req, res) => {
  const composio = getComposioService();
  if (!composio) {
    return res.status(503).json({ success: false, error: 'Composio service not available' });
  }

  const { endpoint, method, data, connectedAccountId } = req.body;

  if (!endpoint || !method || !connectedAccountId) {
    return res.status(400).json({
      success: false,
      error: 'endpoint, method, and connectedAccountId are required',
    });
  }

  const result = await composio.proxyExecute({ endpoint, method, data, connectedAccountId });

  if (!result) {
    return res.status(500).json({ success: false, error: 'Proxy execute failed' });
  }

  res.json({
    success: true,
    data: { result, executedAt: new Date().toISOString() },
  });
}));

module.exports = router;
