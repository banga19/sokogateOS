// Apify Integration Service for SokogateOS
// Centralized wrapper around the Apify client for web scraping,
// data enrichment, and business intelligence across all services.

const { ApifyClient } = require('apify-client');
const logger = require('../utils/logger');

const APIFY_DEFAULT_TIMEOUT_MS = 60000;

/** Read the Apify API key from the environment at runtime (not at module load time)
 *  so that callers (especially tests) can change the env var without reloading. */
function getApiKey() {
  return process.env.APIFY_API_KEY || '';
}

// ---- Apify Actor IDs ----
const ACTORS = {
  // Company / supplier data enrichment
  COMPANY_INTELLIGENCE: 'fortunate_favorite/company-intelligence',
  LEADS_FINDER: 'code_crafter/leads-finder',

  // Web scraping & market intelligence
  ECOMMERCE_SCRAPER: 'apify/e-commerce-scraping-tool',
  GOOGLE_SEARCH: 'apify/google-search-scraper',
  WEBSITE_CRAWLER: 'apify/website-content-crawler',

  // Korean business data
  KOREAN_BUSINESS_DATA: 'lazymac/korean-business-data',
  KOREAN_COMPANY_SCRAPER: 'lazymac/korean-company-scraper',
};

// ---- Client singleton ----
let client = null;

/** Reset the client singleton. Useful for tests that need to re-create the client with a
 *  different API key. Not exported as a public API — consumers should set APIFY_API_KEY
 *  once at startup. */
function _resetClient() {
  client = null;
}

function getClient() {
  if (!client) {
    const key = getApiKey();
    if (!key) {
      logger.warn('ApifyService: APIFY_API_KEY not set — Apify features will be unavailable.');
      return null;
    }
    client = new ApifyClient({ token: key });
  }
  return client;
}

// ──────────────────────────────────────────────
//  Generic helpers
// ──────────────────────────────────────────────

/**
 * Run an Apify actor with the given input and wait for results.
 * @param {string} actorId - Full actor name (e.g. 'apify/google-search-scraper')
 * @param {Object} input   - Actor run input payload
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs=60000]
 * @param {boolean} [opts.silent=false] - If true, skip error logging
 * @returns {Promise<Array<Object>|null>} Array of dataset items, or null on failure
 */
async function runActor(actorId, input, opts = {}) {
  const c = getClient();
  if (!c) return null;

  const timeoutMs = opts.timeoutMs || APIFY_DEFAULT_TIMEOUT_MS;
  const silent = opts.silent || false;

  try {
    const run = await c.actor(actorId).call(input, { timeout: Math.ceil(timeoutMs / 1000) });
    const { items } = await c.dataset(run.defaultDatasetId).listItems();
    return items;
  } catch (err) {
    if (!silent) logger.error(`ApifyService: Actor "${actorId}" failed: ${err.message}`);
    return null;
  }
}

// ──────────────────────────────────────────────
//  1. Supplier Trust — Company/Supplier enrichment
// ──────────────────────────────────────────────

/**
 * Enrich supplier company data using Apify's company intelligence.
 * Returns additional metadata (industry, size, contacts, etc.).
 * @param {string} companyName
 * @param {string} [domain]
 * @returns {Promise<Object|null>}
 */
async function enrichCompanyData(companyName, domain) {
  const items = await runActor(ACTORS.COMPANY_INTELLIGENCE, {
    companyName,
    domain: domain || '',
    enrichContacts: true,
    enrichFinancials: true,
  });
  return items && items.length > 0 ? items[0] : null;
}

/**
 * Search for potential suppliers by product/category using an Apify
 * lead-finding actor.
 * @param {Object} criteria
 * @param {string} criteria.productCategory
 * @param {string} [criteria.country]
 * @param {number} [criteria.maxResults=20]
 * @returns {Promise<Array>}
 */
async function searchSuppliers(criteria) {
  const items = await runActor(ACTORS.LEADS_FINDER, {
    searchPhrase: `${criteria.productCategory} supplier ${criteria.country || ''}`.trim(),
    maxLeads: criteria.maxResults || 20,
    enrichCompanyData: true,
  });
  return items || [];
}

// ──────────────────────────────────────────────
//  2. Market Intelligence — Pricing & news scraping
// ──────────────────────────────────────────────

/**
 * Scrape product / pricing data from e-commerce sites via Apify.
 * @param {Object} query
 * @param {string} query.product - Product name to search for
 * @param {string} [query.marketplace] - e.g. 'amazon', 'ebay'
 * @param {number} [query.maxResults=10]
 * @returns {Promise<Array>}
 */
async function scrapePricingData(query) {
  const items = await runActor(ACTORS.ECOMMERCE_SCRAPER, {
    SearchEngineSearchKeyword: query.product,
    countryCode: query.marketplace === 'amazon' ? 'us' : (query.countryCode || 'us'),
    scrapeProductsFromSearchEngine: true,
    maxSearchEngineProducts: query.maxResults || 10,
    maxSearchEngineResults: query.maxResults || 10,
  });
  return items || [];
}

/**
 * Scrape the latest market news or intelligence from Google Search.
 * @param {string} topic    - Search query (e.g. "Korea textile import market 2025")
 * @param {number} [count=5]
 * @returns {Promise<Array>}
 */
async function scrapeMarketNews(topic, count = 5) {
  const items = await runActor(ACTORS.GOOGLE_SEARCH, {
    queries: topic,
    maxPagesPerQuery: 1,
    resultsPerPage: count,
    near: '',
  });
  return items || [];
}

/**
 * Crawl a public website for structured data (e.g. a customs or trade portal).
 * @param {string} url  - Starting URL
 * @param {Object} [opts]
 * @returns {Promise<Array>}
 */
async function crawlWebsite(url, opts = {}) {
  const items = await runActor(ACTORS.WEBSITE_CRAWLER, {
    startUrls: [{ url }],
    maxCrawlPages: opts.maxPages || 10,
    maxCrawlDepth: opts.maxDepth || 2,
    extractFullPage: true,
  });
  return items || [];
}

// ──────────────────────────────────────────────
//  3. Customs Engine — Tariff / trade data
// ──────────────────────────────────────────────

/**
 * Attempt to look up tariff data for a given HS code and country
 * by crawling public tariff portals.
 * @param {string} hsCode
 * @param {string} country
 * @returns {Promise<Object|null>}
 */
async function lookupTariffData(hsCode, country) {
  // Try known tariff lookup portals
  const urls = [
    `https://www.trade.gov/tariff?hs=${hsCode}&country=${encodeURIComponent(country)}`,
    `https://www.macmap.org/en/query/results?reporter=${encodeURIComponent(country)}&partner=all&product=${hsCode}`,
  ];

  for (const url of urls) {
    const items = await crawlWebsite(url, { maxPages: 1, maxDepth: 1 });
    if (items && items.length > 0) {
      return {
        source: url,
        data: items,
        hsCode,
        country,
        retrievedAt: new Date().toISOString(),
      };
    }
  }
  return null;
}

/**
 * Crawl for trade agreement information by scraping relevant trade portal pages.
 * @param {string} country
 * @returns {Promise<Array>}
 */
async function crawlTradeAgreements(country) {
  const url = `https://www.macmap.org/en/query/country?reporter=${encodeURIComponent(country)}`;
  const items = await crawlWebsite(url, { maxPages: 3, maxDepth: 2 });
  return items || [];
}

// ──────────────────────────────────────────────
//  4. Korean Compliance — BRN validation & company enrichment
// ──────────────────────────────────────────────

/**
 * Validate a Korean Business Registration Number (BRN) and enrich company data.
 * Uses the 'lazymac/korean-business-data' actor.
 * @param {string} brn - 10-digit Korean BRN
 * @returns {Promise<Object|null>} Company details or null
 */
async function validateKoreanBRN(brn) {
  const items = await runActor(ACTORS.KOREAN_BUSINESS_DATA, {
    businessNumbers: [brn.replace(/[^0-9]/g, '')],
    includeCompanyInfo: true,
    includeTaxInfo: true,
  });
  return items && items.length > 0 ? items[0] : null;
}

/**
 * Enrich Korean company data by scraping public Korean business directories.
 * @param {string} companyName - Korean company name to search for
 * @returns {Promise<Array>}
 */
async function searchKoreanCompany(companyName) {
  const items = await runActor(ACTORS.KOREAN_COMPANY_SCRAPER, {
    searchTerm: companyName,
    maxResults: 10,
  });
  return items || [];
}

// ──────────────────────────────────────────────
//  Service status
// ──────────────────────────────────────────────

function isConfigured() {
  return !!getApiKey();
}

function getServiceStatus() {
  return {
    configured: isConfigured(),
    actorCount: Object.keys(ACTORS).length,
  };
}

module.exports = {
  // Generic
  runActor,
  isConfigured,
  getServiceStatus,

  // Supplier Trust
  enrichCompanyData,
  searchSuppliers: searchSuppliers,

  // Market Intelligence
  scrapePricingData,
  scrapeMarketNews,
  crawlWebsite,

  // Customs Engine
  lookupTariffData,
  crawlTradeAgreements,

  // Korean Compliance
  validateKoreanBRN,
  searchKoreanCompany,

  // Expose actor IDs for extension
  ACTORS,

  // Internal — exported for testability
  _resetClient,
};
