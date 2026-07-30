'use strict';

const { createNeonClient } = require('@neondatabase/serverless');
const logger = require('../utils/logger');

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const NEON_API_KEY = process.env.NEON_API_KEY;

/**
 * Mask credentials in a connection string for safe logging.
 * @param {string} url
 * @returns {string}
 * @private
 */
function maskUrl(url) {
  if (!url) return '(not set)';
  try {
    const u = new URL(url);
    if (u.password) {
      u.password = '***';
    }
    if (u.username) {
      u.username = u.username.slice(0, 3) + '***';
    }
    return u.toString();
  } catch {
    return '(invalid url)';
  }
}

class NeonService {
  constructor() {
    this.enabled = Boolean(NEON_DATABASE_URL);
    this._client = null;
    this._initialized = false;

    if (this.enabled) {
      logger.info('[Neon] Service enabled - Neon Database URL detected');
    } else {
      logger.info('[Neon] Service disabled - NEON_DATABASE_URL not set');
    }
  }

  /**
   * Initialize the Neon SQL client (idempotent).
   * @returns {Promise<void>}
   */
  initialize() {
    if (this._initialized) return Promise.resolve();

    if (!this.enabled) {
      return Promise.resolve();
    }

    try {
      this._client = createNeonClient(NEON_DATABASE_URL);
      this._initialized = true;
      logger.info('[Neon] Serverless HTTP client created');
    } catch (err) {
      const safeMsg = err.message
        .replace(NEON_DATABASE_URL || '', maskUrl(NEON_DATABASE_URL))
        .replace(/password=[^&\s]+/gi, 'password=***')
        .replace(/user=[^&\s]+/gi, 'user=***');
      logger.error('[Neon] Client creation failed:', safeMsg);
      this.enabled = false;
    }

    return Promise.resolve();
  }

  /**
   * @returns {boolean} true when NEON_DATABASE_URL is configured
   */
  isConfigured() {
    return this.enabled;
  }

  /**
   * Run a simple live health probe (SELECT 1).
   * @returns {Promise<{ ok: boolean, message: string, responseTimeMs?: number }>}
   */
  async checkHealth() {
    if (!this.enabled) {
      return { ok: false, message: 'Neon not configured' };
    }

    try {
      const start = Date.now();
      await this.sql('SELECT $1::text AS probe', ['1']);
      const elapsed = Date.now() - start;
      return {
        ok: true,
        message: 'Neon connected',
        responseTimeMs: elapsed,
      };
    } catch (err) {
      const safeMsg = err.message
        .replace(NEON_DATABASE_URL || '', maskUrl(NEON_DATABASE_URL))
        .replace(/password=[^&\s]+/gi, 'password=***')
        .replace(/user=[^&\s]+/gi, 'user=***');
      return { ok: false, message: safeMsg };
    }
  }

  /**
   * Execute a parameterised SQL query and return rows.
   * @param {string} sql - Parameterised SQL ($1, $2, ...)
   * @param {Array} [params=[]]
   * @returns {Promise<Array<Object>>}
   */
  async sql(sql, params = []) {
    if (!this._client) {
      if (!this.enabled) {
        throw new Error('Neon service is not configured');
      }
      await this.initialize();
    }
    if (!this._client) {
      throw new Error('Neon client unavailable');
    }

    try {
      return await this._client(sql, params);
    } catch (err) {
      const safeMsg = err.message
        .replace(NEON_DATABASE_URL || '', maskUrl(NEON_DATABASE_URL))
        .replace(/password=[^&\s]+/gi, 'password=***')
        .replace(/user=[^&\s]+/gi, 'user=***');
      const wrapped = new Error(safeMsg);
      wrapped.originalError = err;
      throw wrapped;
    }
  }

  /**
   * Execute a parameterised SQL statement that returns no rows
   * (INSERT, UPDATE, DELETE).
   * @param {string} sql
   * @param {Array} [params=[]]
   * @returns {Promise<{ rowCount: number }>}
   */
  async execute(sql, params = []) {
    const rows = await this.sql(sql, params);
    return { rowCount: Array.isArray(rows) ? rows.length : 0 };
  }

  /**
   * @returns {{ enabled: boolean, apiKeySet: boolean }}
   */
  getStatus() {
    return {
      enabled: this.enabled,
      configured: this.enabled,
      apiKeySet: Boolean(NEON_API_KEY),
    };
  }
}

const neonService = new NeonService();

/** @returns {NeonService} */
function getNeonService() {
  return neonService;
}

/** Convenience - get the underlying Neon SQL client. */
function getNeonClient() {
  if (!neonService._client) {
    throw new Error('Neon client not initialized - call neonService.initialize() first');
  }
  return neonService._client;
}

module.exports = {
  NeonService,
  neonService,
  getNeonService,
  getNeonClient,
  isConfigured: () => neonService.isConfigured(),
};
