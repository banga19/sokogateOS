// Cloudflare Service for sokogateOS
// Integrates with Cloudflare API for CDN, security, and performance features

const https = require('https');
const { parse } = require('url');
const logger = require('../utils/logger');

// Cloudflare API configuration
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

class CloudflareService {
  constructor() {
    this.enabled = !!CLOUDFLARE_API_TOKEN && !!CLOUDFLARE_ZONE_ID;
    if (!this.enabled) {
      logger.info('Cloudflare Service: Not configured (missing API token or zone ID)');
    }
  }

  /**
   * Initialize the Cloudflare service
   * @returns {Promise<void>}
   */
  initialize() {
    return Promise.resolve();
  }

  /**
   * Make a request to the Cloudflare API
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param {Object} [data] - Request body data
   * @param {Object} [params] - Query parameters
   * @returns {Promise<Object>} API response
   * @private
   */
  async _request(endpoint, method, data = null, params = {}) {
    if (!this.enabled) {
      throw new Error('Cloudflare service is not configured');
    }

    // Build query string
    const queryString = new URLSearchParams(params).toString();
    const url = `${CLOUDFLARE_API_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`;

    const parsedUrl = parse(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method,
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.success) {
              logger.error(`Cloudflare API error:`, parsed.errors);
              reject(new Error(`Cloudflare API error: ${parsed.errors.map(e => e.message).join(', ')}`));
            } else {
              resolve(parsed.result);
            }
          } catch (parseError) {
            reject(parseError);
          }
        });
      });

      req.on('error', reject);

      // Write data if present
      if (data !== null) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Purge cache for specific URLs or everything
   * @param {string[]} urls - Array of URLs to purge (empty array purges everything)
   * @returns {Promise<Object>} Purge result
   */
  async purgeCache(urls = []) {
    try {
      const data = {
        purge_everything: urls.length === 0,
        files: urls
      };

      const result = await this._request(`/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`, 'POST', data);
      logger.info(`Cloudflare Service: Cache purged successfully${urls.length > 0 ? ` for ${urls.length} URLs` : ' (everything)'}`);
      return result;
    } catch (error) {
      logger.error('Cloudflare Service: Failed to purge cache:', error);
      throw error;
    }
  }

  /**
   * Get zone settings
   * @returns {Promise<Object>} Zone settings
   */
  async getZoneSettings() {
    try {
      const result = await this._request(`/zones/${CLOUDFLARE_ZONE_ID}/settings`);
      return result;
    } catch (error) {
      logger.error('Cloudflare Service: Failed to get zone settings:', error);
      throw error;
    }
  }

  /**
   * Update zone setting
   * @param {string} setting - Setting name to update
   * @param {*} value - Value to set
   * @returns {Promise<Object>} Update result
   */
  async updateZoneSetting(setting, value) {
    try {
      const result = await this._request(
        `/zones/${CLOUDFLARE_ZONE_ID}/settings/${setting}`, 
        'PATCH', 
        { value }
      );
      logger.info(`Cloudflare Service: Updated zone setting ${setting} to ${value}`);
      return result;
    } catch (error) {
      logger.error(`Cloudflare Service: Failed to update zone setting ${setting}:`, error);
      throw error;
    }
  }

  /**
   * Get firewall rules for the zone
   * @returns {Promise<Object[]>} Firewall rules
   */
  async getFirewallRules() {
    try {
      const result = await this._request(`/zones/${CLOUDFLARE_ZONE_ID}/firewall/rules`);
      return result;
    } catch (error) {
      logger.error('Cloudflare Service: Failed to get firewall rules:', error);
      throw error;
    }
  }

  /**
   * Create a new firewall rule
   * @param {Object} rule - Firewall rule definition
   * @returns {Promise<Object>} Created rule
   */
  async createFirewallRule(rule) {
    try {
      const result = await this._request(
        `/zones/${CLOUDFLARE_ZONE_ID}/firewall/rules`, 
        'POST', 
        rule
      );
      logger.info('Cloudflare Service: Created firewall rule');
      return result;
    } catch (error) {
      logger.error('Cloudflare Service: Failed to create firewall rule:', error);
      throw error;
    }
  }

  /**
   * Get analytics data for the zone
   * @param {Object} params - Query parameters (since, until, etc.)
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(params = {}) {
    try {
      const result = await this._request(
        `/zones/${CLOUDFLARE_ZONE_ID}/analytics/dashboard`, 
        'GET', 
        null, 
        params
      );
      return result;
    } catch (error) {
      logger.error('Cloudflare Service: Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Check if Cloudflare service is enabled and configured
   * @returns {boolean} True if configured
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get middleware to add Cloudflare-specific headers
   * @returns {function} Express middleware function
   */
  getHeadersMiddleware() {
    return (req, res, next) => {
      // Add headers that help Cloudflare cache appropriately
      if (!res.headersSent) {
        // Don't cache sensitive endpoints
        const sensitivePaths = ['/api/auth', '/api/agents', '/api/hermes'];
        const isSensitive = sensitivePaths.some(path => req.path.startsWith(path));
        
        if (!isSensitive) {
          // Cache static assets and API responses for a reasonable time
          if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year for static assets
          } else if (req.path.startsWith('/api/')) {
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes for API responses
          }
        } else {
          // No caching for sensitive/authenticated endpoints
          res.setHeader('Cache-Control', 'no-store, max-age=0');
        }
      }
      next();
    };
  }

  /**
   * Get service status information
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      zoneId: CLOUDFLARE_ZONE_ID || null,
      accountId: CLOUDFLARE_ACCOUNT_ID || null,
      features: {
        cachePurging: this.enabled,
        firewallRules: this.enabled,
        analytics: this.enabled,
        zoneSettings: this.enabled
      }
    };
  }
}

// Create and export singleton instance
const cloudflareService = new CloudflareService();
module.exports = { cloudflareService, CloudflareService };
