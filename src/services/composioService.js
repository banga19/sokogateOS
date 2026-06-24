// Composio Integration Service for SokogateOS
// Centralized wrapper around Composio SDK for connecting AI agents
// to 200+ external tools: Gmail, GitHub, Slack, Notion, Salesforce, etc.
// Provides tool discovery, session management, authentication, and execution.

const logger = require('../utils/logger');

// Safely load @composio/core — wrap in try/catch so the app doesn't crash
// if the package is unavailable or fails to load (e.g., ESM-only export issue).
let Composio = null;
try {
  const composioModule = require('@composio/core');
  Composio = composioModule?.Composio || composioModule?.default || null;
  if (!Composio) {
    logger.warn('ComposioService: @composio/core loaded but Composio constructor not found');
  }
} catch (e) {
  logger.warn('ComposioService: @composio/core not available — Composio features disabled:', e.message);
}

// ---- Configuration ----

function getApiKey() {
  return process.env.COMPOSIO_API_KEY || '';
}

// ---- Client singleton ----
let composioClient = null;

function _resetClient() {
  composioClient = null;
}

/**
 * Get or initialize the Composio client.
 * Reads COMPOSIO_API_KEY from environment at runtime (not module load time).
 * @returns {Composio|null}
 */
function getClient() {
  if (!composioClient) {
    const key = getApiKey();
    if (!key) {
      logger.warn('ComposioService: COMPOSIO_API_KEY not set — Composio features will be unavailable.');
      return null;
    }
    composioClient = new Composio({ apiKey: key });
  }
  return composioClient;
}

// ──────────────────────────────────────────────
//  Session Management
// ──────────────────────────────────────────────

/**
 * Create a user session which manages tool authentication and access.
 * @param {string} userId - Unique identifier for the user / company
 * @returns {Promise<Object|null>} Session object with tools and management methods
 */
async function createSession(userId) {
  const client = getClient();
  if (!client) return null;

  try {
    const session = await client.create(userId);
    logger.info(`ComposioService: Session created for user ${userId}`);
    return session;
  } catch (error) {
    logger.error(`ComposioService: Failed to create session for ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get tools for a user session, formatted for AI agent consumption.
 * @param {string} userId - User/company identifier
 * @param {Object} [options]
 * @param {string[]} [options.toolkits] - List of toolkits (e.g., ['gmail', 'github', 'slack'])
 * @returns {Promise<Array>} Array of tool definitions for agents
 */
async function getTools(userId, options = {}) {
  const client = getClient();
  if (!client) return [];

  try {
    const session = await client.create(userId);
    if (!session) return [];

    // If specific toolkits requested, use tools.get for filtering
    if (options.toolkits && options.toolkits.length > 0) {
      const tools = await client.tools.get(userId, { toolkits: options.toolkits });
      return tools || [];
    }

    // Otherwise get all available tools for the session
    const tools = await session.tools();
    return tools || [];
  } catch (error) {
    logger.error(`ComposioService: Failed to get tools for ${userId}:`, error.message);
    return [];
  }
}

// ──────────────────────────────────────────────
//  Account / Authentication Management
// ──────────────────────────────────────────────

/**
 * Initiate the OAuth flow to connect a user's external account (e.g., GitHub, Gmail).
 * Returns a redirect URL that the user must visit to authenticate.
 * @param {string} userId - User/company identifier
 * @param {string} toolName - Tool name (e.g., 'github', 'gmail', 'slack', 'salesforce')
 * @returns {Promise<Object|null>} Connection result with redirectUrl
 */
async function connectAccount(userId, toolName) {
  const client = getClient();
  if (!client) return null;

  try {
    const connection = await client.connectedAccounts.link(userId, toolName.toLowerCase());
    logger.info(`ComposioService: Connection initiated for ${userId} -> ${toolName}`);
    return connection;
  } catch (error) {
    logger.error(`ComposioService: Failed to connect ${toolName} for ${userId}:`, error.message);
    return null;
  }
}

/**
 * List all connected accounts for a user.
 * @param {string} userId - User/company identifier
 * @returns {Promise<Array>} List of connected accounts
 */
async function listConnectedAccounts(userId) {
  const client = getClient();
  if (!client) return [];

  try {
    // Use the connectedAccounts property to list accounts
    const accounts = await client.connectedAccounts.list({ userId });
    return accounts || [];
  } catch (error) {
    logger.error(`ComposioService: Failed to list connected accounts for ${userId}:`, error.message);
    return [];
  }
}

/**
 * Disconnect a specific tool account for a user.
 * @param {string} connectedAccountId - The connected account ID to disconnect
 * @returns {Promise<boolean>} Whether disconnection succeeded
 */
async function disconnectAccount(connectedAccountId) {
  const client = getClient();
  if (!client) return false;

  try {
    await client.connectedAccounts.disconnect(connectedAccountId);
    logger.info(`ComposioService: Disconnected account ${connectedAccountId}`);
    return true;
  } catch (error) {
    logger.error(`ComposioService: Failed to disconnect account ${connectedAccountId}:`, error.message);
    return false;
  }
}

// ──────────────────────────────────────────────
//  Direct Tool Execution
// ──────────────────────────────────────────────

/**
 * Execute a specific tool action directly (without an AI agent).
 * Useful for backend workflows and scheduled tasks.
 * @param {string} toolAction - Action name (e.g., 'GITHUB_LIST_STARGAZERS', 'GMAIL_SEND_EMAIL')
 * @param {Object} params - Action parameters
 * @param {string} params.userId - User executing the action
 * @param {Object} params.arguments - Action-specific arguments
 * @param {string} [params.connectedAccountId] - Specific connected account to use
 * @returns {Promise<Object|null>} Execution result
 */
async function executeTool(toolAction, params) {
  const client = getClient();
  if (!client) return null;

  try {
    const result = await client.tools.execute(toolAction, {
      userId: params.userId,
      arguments: params.arguments || {},
      connectedAccountId: params.connectedAccountId,
    });
    logger.debug(`ComposioService: Executed ${toolAction} for ${params.userId}`);
    return result;
  } catch (error) {
    logger.error(`ComposioService: Failed to execute ${toolAction}:`, error.message);
    return null;
  }
}

/**
 * Execute a proxy request to a connected tool's API.
 * Use this when the exact action isn't available as a tool.
 * @param {Object} params
 * @param {string} params.endpoint - API endpoint (e.g., '/repos/owner/repo/issues')
 * @param {string} params.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} [params.data] - Request body for POST/PUT
 * @param {string} [params.connectedAccountId] - Connected account to use (required for authenticated requests)
 * @returns {Promise<Object|null>} Response data
 */
async function proxyExecute(params) {
  const client = getClient();
  if (!client) return null;

  if (!params.endpoint || !params.method) {
    logger.warn('ComposioService: endpoint and method are required for proxyExecute');
    return null;
  }

  if (!params.connectedAccountId) {
    logger.warn('ComposioService: connectedAccountId is required for proxyExecute');
    return null;
  }

  try {
    const result = await client.tools.proxyExecute({
      endpoint: params.endpoint,
      method: params.method,
      data: params.data,
      connectedAccountId: params.connectedAccountId,
    });
    return result;
  } catch (error) {
    logger.error(`ComposioService: Proxy execute failed for ${params.endpoint}:`, error.message);
    return null;
  }
}

// ──────────────────────────────────────────────
//  Tool Discovery & Categorization
// ──────────────────────────────────────────────

/**
 * Predefined toolkit categories relevant to SokogateOS agents.
 * Maps agent domains to relevant Composio toolkits.
 */
const AGENT_TOOLKIT_MAP = {
  // Supplier Trust / Sourcing agents need CRM, comms, and research tools
  sourcing: ['gmail', 'slack', 'salesforce', 'hubspot', 'linkedin', 'google_docs'],
  // Logistics agents need project management and communication
  logistics: ['slack', 'gmail', 'notion', 'asana', 'jira', 'google_docs'],
  // Compliance agents need document management and storage
  compliance: ['gmail', 'google_drive', 'notion', 'slack', 'dropbox'],
  // Negotiation agents need CRM and communication
  negotiation: ['gmail', 'slack', 'salesforce', 'hubspot', 'calendly'],
  // Customization agents need collaboration tools
  customization: ['slack', 'notion', 'gmail', 'google_drive', 'figma'],
  // Market intelligence agents need research and social monitoring
  marketIntelligence: ['gmail', 'slack', 'linkedin', 'google_docs', 'notion', 'twitter'],
};

/**
 * Get recommended toolkits for a specific agent type.
 * @param {string} agentType - Agent type (sourcing, logistics, compliance, etc.)
 * @returns {string[]} List of recommended toolkit names
 */
function getRecommendedToolkits(agentType) {
  return AGENT_TOOLKIT_MAP[agentType] || ['gmail', 'slack'];
}

// Cache for available toolkits (lazy-loaded)
let availableToolkitsCache = null;
let availableToolkitsCacheTime = 0;
const TOOLKIT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * List all available toolkits from Composio.
 * Results are cached for 5 minutes to avoid repeated API calls.
 * @param {boolean} [forceRefresh=false] - Force a fresh fetch from Composio
 * @returns {Promise<Array>} Available toolkit names
 */
async function listAvailableToolkits(forceRefresh = false) {
  // Return cached results if fresh enough
  if (!forceRefresh && availableToolkitsCache && Date.now() - availableToolkitsCacheTime < TOOLKIT_CACHE_TTL_MS) {
    return availableToolkitsCache;
  }

  const client = getClient();
  if (!client) return [];

  try {
    // Fetch toolkits via the tools API
    const tools = await client.tools.get('system', {});
    if (!tools) return [];

    // Extract unique toolkit names from tools
    const toolkitNames = new Set();
    for (const tool of tools) {
      if (tool.toolkit || tool.appName) {
        toolkitNames.add(tool.toolkit || tool.appName);
      }
    }
    availableToolkitsCache = Array.from(toolkitNames).sort();
    availableToolkitsCacheTime = Date.now();
    return availableToolkitsCache;
  } catch (error) {
    logger.warn('ComposioService: Could not list toolkits:', error.message);
    return [];
  }
}

// ──────────────────────────────────────────────
//  Service Status
// ──────────────────────────────────────────────

function isConfigured() {
  return !!getApiKey();
}

function getServiceStatus() {
  return {
    configured: isConfigured(),
    supportedToolkits: Object.keys(AGENT_TOOLKIT_MAP).length,
    toolkitMap: Object.fromEntries(
      Object.entries(AGENT_TOOLKIT_MAP).map(([agentType, toolkits]) => [agentType, toolkits.length])
    ),
  };
}

module.exports = {
  // Core
  isConfigured,
  getServiceStatus,

  // Session & Tools
  createSession,
  getTools,
  getRecommendedToolkits,
  listAvailableToolkits,

  // Account Management
  connectAccount,
  listConnectedAccounts,
  disconnectAccount,

  // Tool Execution
  executeTool,
  proxyExecute,

  // Constants
  AGENT_TOOLKIT_MAP,

  // Internal — exported for testability
  _resetClient,
};
