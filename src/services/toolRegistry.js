// Unified Tool Registry for SokogateOS
// Combines Apify, Composio, and local/ingestion tools into a single registry
// that agents can discover, query, and use to perform actions.
//
// Architecture:
//   toolRegistry.getTools(agentType, userId)
//     ├── Apify tools  (web scraping, data enrichment)
//     ├── Composio tools (SaaS integrations: Gmail, GitHub, Slack, etc.)
//     └── Local tools  (built-in services: customs, supplier trust, etc.)

const apifyService = require('./apifyService');
const composioService = require('./composioService');
const logger = require('../utils/logger');

// ──────────────────────────────────────────────
//  Local Tool Definitions
//  These are built-in capabilities exposed by SokogateOS services.
// ──────────────────────────────────────────────

const LOCAL_TOOLS = {
  // ── Supplier Trust Network Tools ──
  supplier_search: {
    name: 'supplier_search',
    provider: 'local',
    category: 'sourcing',
    description: 'Search for suppliers by category, country, and trust score',
    service: 'supplierTrustService',
    params: { category: 'string', country: 'string', minTrustScore: 'number', limit: 'number' },
  },
  supplier_enrich: {
    name: 'supplier_enrich',
    provider: 'apify',
    category: 'sourcing',
    description: 'Enrich supplier profile data using Apify company intelligence',
    service: 'supplierTrustService',
    params: { supplierId: 'string' },
  },
  supplier_discover: {
    name: 'supplier_discover',
    provider: 'apify',
    category: 'sourcing',
    description: 'Discover new supplier candidates via Apify lead finding',
    service: 'supplierTrustService',
    params: { productCategory: 'string', country: 'string', maxResults: 'number' },
  },

  // ── Customs / Trade Tools ──
  hs_classify: {
    name: 'hs_classify',
    provider: 'local',
    category: 'compliance',
    description: 'Classify a product by description to find the best HS code match',
    service: 'customsEngineService',
    params: { productDescription: 'string', productCategory: 'string' },
  },
  duty_calculate: {
    name: 'duty_calculate',
    provider: 'local',
    category: 'compliance',
    description: 'Calculate duties and taxes for a cross-border shipment',
    service: 'customsEngineService',
    params: { hsCode: 'string', originCountry: 'string', destinationCountry: 'string', invoiceAmount: 'number' },
  },
  compliance_check: {
    name: 'compliance_check',
    provider: 'local',
    category: 'compliance',
    description: 'Check regulatory compliance for a product in a destination country',
    service: 'customsEngineService',
    params: { hsCode: 'string', destinationCountry: 'string' },
  },
  tariff_lookup: {
    name: 'tariff_lookup',
    provider: 'apify',
    category: 'compliance',
    description: 'Look up live tariff data via Apify web crawling',
    service: 'customsEngineService',
    params: { hsCode: 'string', country: 'string' },
  },

  // ── Market Intelligence Tools ──
  pricing_scrape: {
    name: 'pricing_scrape',
    provider: 'apify',
    category: 'marketIntelligence',
    description: 'Scrape product pricing data from e-commerce platforms',
    service: 'apifyService',
    params: { product: 'string', marketplace: 'string', maxResults: 'number' },
  },
  market_news: {
    name: 'market_news',
    provider: 'apify',
    category: 'marketIntelligence',
    description: 'Scrape market news and intelligence via Google Search',
    service: 'apifyService',
    params: { topic: 'string', count: 'number' },
  },
  website_crawl: {
    name: 'website_crawl',
    provider: 'apify',
    category: 'marketIntelligence',
    description: 'Crawl a public website for structured data extraction',
    service: 'apifyService',
    params: { url: 'string', maxPages: 'number', maxDepth: 'number' },
  },

  // ── Korean Market Tools ──
  korean_compliance_check: {
    name: 'korean_compliance_check',
    provider: 'local',
    category: 'compliance',
    description: 'Check product compliance for Korean market entry requirements',
    service: 'koreanComplianceService',
    params: { productData: 'object', documents: 'array' },
  },
  korean_brn_validate: {
    name: 'korean_brn_validate',
    provider: 'apify',
    category: 'compliance',
    description: 'Validate a Korean Business Registration Number via Apify',
    service: 'koreanComplianceService',
    params: { brn: 'string' },
  },
  korean_market_fit: {
    name: 'korean_market_fit',
    provider: 'local',
    category: 'marketIntelligence',
    description: 'Analyze product-market fit for Korean market entry',
    service: 'koreanMarketAnalysisService',
    params: { productData: 'object' },
  },
  korean_pricing_scrape: {
    name: 'korean_pricing_scrape',
    provider: 'apify',
    category: 'marketIntelligence',
    description: 'Scrape live pricing data from Korean e-commerce platforms',
    service: 'koreanMarketAnalysisService',
    params: { productName: 'string', marketplace: 'string' },
  },

  // ── Logistics Tools ──
  route_optimize: {
    name: 'route_optimize',
    provider: 'local',
    category: 'logistics',
    description: 'Find optimal trade routes and transit estimates between countries',
    service: 'customsEngineService',
    params: { hsCode: 'string', originCountry: 'string', destinationCountry: 'string' },
  },

  // ── Agent Memory & Learning Tools ──
  memory_store: {
    name: 'memory_store',
    provider: 'local',
    category: 'system',
    description: 'Store information in agent memory for future recall',
    service: 'agentMemory',
    params: { key: 'string', value: 'any', persist: 'boolean' },
  },
  memory_search: {
    name: 'memory_search',
    provider: 'local',
    category: 'system',
    description: 'Search agent memory for stored knowledge',
    service: 'agentMemory',
    params: { query: 'string', limit: 'number' },
  },

  // ── Communication Tools (local fallbacks) ──
  send_email: {
    name: 'send_email',
    provider: 'composio',
    category: 'communication',
    description: 'Send an email via connected Gmail/email account',
    service: 'composioService',
    params: { to: 'string', subject: 'string', body: 'string' },
  },
  send_slack_message: {
    name: 'send_slack_message',
    provider: 'composio',
    category: 'communication',
    description: 'Send a message to a Slack channel',
    service: 'composioService',
    params: { channel: 'string', message: 'string' },
  },
};

// ──────────────────────────────────────────────
//  Tool Categories (for agent capability matching)
// ──────────────────────────────────────────────

const TOOL_CATEGORIES = {
  sourcing: ['supplier_search', 'supplier_enrich', 'supplier_discover', 'pricing_scrape', 'market_news'],
  logistics: ['route_optimize', 'duty_calculate', 'hs_classify', 'compliance_check'],
  compliance: ['compliance_check', 'hs_classify', 'tariff_lookup', 'korean_compliance_check', 'korean_brn_validate'],
  customization: ['pricing_scrape', 'market_news'],
  negotiation: ['supplier_search', 'supplier_enrich'],
  marketIntelligence: ['pricing_scrape', 'market_news', 'website_crawl', 'korean_market_fit', 'korean_pricing_scrape', 'korean_compliance_check'],
  communication: ['send_email', 'send_slack_message'],
  system: ['memory_store', 'memory_search'],
};

// ──────────────────────────────────────────────
//  Registry API
// ──────────────────────────────────────────────

/**
 * Get all tools available for a given agent type.
 * Combines local tools with Apify and Composio-provided tools.
 * @param {string} agentType - Agent type (sourcing, logistics, compliance, etc.)
 * @param {string} [userId] - User ID for Composio tool access (optional)
 * @returns {Promise<Object>} { local, composio, apify } tool sets
 */
async function getToolsForAgent(agentType, userId = 'system') {
  const toolNames = TOOL_CATEGORIES[agentType] || [];
  const allTools = [];

  // 1. Gather local tools matching this agent's categories
  const localTools = toolNames
    .map((name) => LOCAL_TOOLS[name])
    .filter(Boolean)
    .filter((t) => t.provider === 'local');

  allTools.push(...localTools);

  // 2. Gather Apify tools matching this agent's categories
  const apifyTools = toolNames
    .map((name) => LOCAL_TOOLS[name])
    .filter(Boolean)
    .filter((t) => t.provider === 'apify');

  allTools.push(...apifyTools);

  // 3. Gather Composio tools for this agent type (if configured)
  let composioTools = [];
  try {
    const recommendedToolkits = composioService.getRecommendedToolkits(agentType);
    if (composioService.isConfigured() && recommendedToolkits.length > 0) {
      const tools = await composioService.getTools(userId, { toolkits: recommendedToolkits });
      if (tools && tools.length > 0) {
        composioTools = tools.map((t) => ({
          name: t.name || t.function?.name || `composio_${t.id || Math.random().toString(36).slice(2)}`,
          provider: 'composio',
          category: agentType,
          description: t.description || t.function?.description || `Composio ${agentType} tool`,
          params: t.parameters || t.function?.parameters || {},
          raw: t,
        }));
        allTools.push(...composioTools);
      }
    }
  } catch (error) {
    const msg = error.message || '';
    if (msg.toLowerCase().includes('not configured') || msg.toLowerCase().includes('api key')) {
      logger.debug(`ToolRegistry: Composio not available for ${agentType} — ${msg}`);
    } else {
      logger.warn(`ToolRegistry: Composio tools error for ${agentType}:`, msg);
    }
  }

  return {
    local: localTools,
    apify: apifyTools,
    composio: composioTools,
    all: allTools,
    totalCount: allTools.length,
  };
}

/**
 * Get a specific tool by name.
 * @param {string} toolName - Name of the tool
 * @returns {Object|null} Tool definition or null
 */
function getTool(toolName) {
  return LOCAL_TOOLS[toolName] || null;
}

/**
 * Register a custom tool at runtime.
 * @param {string} name - Tool name
 * @param {Object} definition - Tool definition
 */
function registerTool(name, definition) {
  if (!name || !definition) {
    throw new Error('Tool name and definition are required');
  }
  LOCAL_TOOLS[name] = {
    name,
    provider: definition.provider || 'local',
    category: definition.category || 'custom',
    description: definition.description || '',
    service: definition.service || '',
    params: definition.params || {},
  };

  // Add to appropriate category (no duplicates)
  const category = definition.category || 'custom';
  if (!TOOL_CATEGORIES[category]) {
    TOOL_CATEGORIES[category] = [];
  }
  if (!TOOL_CATEGORIES[category].includes(name)) {
    TOOL_CATEGORIES[category].push(name);
  }

  logger.info(`ToolRegistry: Registered custom tool "${name}" in category "${category}"`);
}

/**
 * List all available tools optionally filtered by category and provider.
 * @param {Object} [filters]
 * @param {string} [filters.category] - Filter by category
 * @param {string} [filters.provider] - Filter by provider (local, apify, composio)
 * @returns {Object[]} Matching tools
 */
function listTools(filters = {}) {
  let tools = Object.values(LOCAL_TOOLS);

  if (filters.category) {
    tools = tools.filter((t) => t.category === filters.category);
  }
  if (filters.provider) {
    tools = tools.filter((t) => t.provider === filters.provider);
  }

  return tools;
}

/**
 * Get all available categories.
 * @returns {string[]} Category names
 */
function getCategories() {
  return Object.keys(TOOL_CATEGORIES);
}

/**
 * Get tool category breakdown with counts.
 * @returns {Object} Category => count mapping
 */
function getCategoryBreakdown() {
  const breakdown = {};
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    breakdown[category] = tools.length;
  }
  return breakdown;
}

/**
 * Get registry statistics.
 * @returns {Object} Stats
 */
function getServiceStatus() {
  const allTools = Object.values(LOCAL_TOOLS);
  return {
    totalTools: allTools.length,
    categories: getCategoryBreakdown(),
    byProvider: {
      local: allTools.filter((t) => t.provider === 'local').length,
      apify: allTools.filter((t) => t.provider === 'apify').length,
      composio: allTools.filter((t) => t.provider === 'composio').length,
    },
    composioConfigured: composioService.isConfigured(),
    apifyConfigured: apifyService.isConfigured(),
  };
}

module.exports = {
  // Core API
  getToolsForAgent,
  getTool,
  registerTool,
  listTools,

  // Categories
  getCategories,
  getCategoryBreakdown,

  // Constants
  LOCAL_TOOLS,
  TOOL_CATEGORIES,

  // Status
  getServiceStatus,
};
