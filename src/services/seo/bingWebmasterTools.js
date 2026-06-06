// Bing Webmaster Tools Integration for sokogateOS
// Handles sitemap submission and URL submission to Bing Webmaster Tools

const logger = require('../../utils/logger');
const axios = require('axios');

/**
 * Bing Webmaster Tools service class
 */
class BingWebmasterToolsService {
  constructor() {
    this.apiEndpoint = 'https://ssl.bing.com/webmaster/api.svc/json';
    // In production, you would get this from environment variables
    this.apiKey = process.env.BING_WEBSMASTER_TOOLS_API_KEY || '';
    this.siteUrl = process.env.BING_SITE_URL || 'https://sokogateos.com';
  }

  /**
   * Submit sitemap to Bing Webmaster Tools
   * @param {string} sitemapUrl - URL of the sitemap to submit
   * @returns {Promise<Object>} Response from Bing API
   */
  async submitSitemap(sitemapUrl) {
    try {
      if (!this.apiKey) {
        logger.warn('Bing Webmaster Tools API key not configured');
        return {
          success: false,
          error: 'Bing Webmaster Tools API key not configured',
          hint: 'Set BING_WEBSMASTER_TOOLS_API_KEY environment variable'
        };
      }

      const data = {
        siteUrl: this.siteUrl,
        sitemapUrl: sitemapUrl,
        apiKey: this.apiKey
      };

      const response = await axios.post(
        `${this.apiEndpoint}/SubmitSitemap`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Sitemap submitted to Bing: ${sitemapUrl}`);

      return {
        success: true,
        data: response.data.d
      };
    } catch (error) {
      logger.error('Error submitting sitemap to Bing Webmaster Tools:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit sitemap to Bing'
      };
    }
  }

  /**
   * Submit URLs to Bing Webmaster Tools for indexing
   * @param {Array<string>} urls - Array of URLs to submit
   * @returns {Promise<Object>} Response from Bing API
   */
  async submitUrls(urls) {
    try {
      if (!this.apiKey) {
        logger.warn('Bing Webmaster Tools API key not configured');
        return {
          success: false,
          error: 'Bing Webmaster Tools API key not configured'
        };
      }

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return {
          success: false,
          error: 'No URLs provided for submission'
        };
      }

      const data = {
        siteUrl: this.siteUrl,
        apiKey: this.apiKey,
        urls: urls
      };

      const response = await axios.post(
        `${this.apiEndpoint}/SubmitUrlBatch`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`${urls.length} URLs submitted to Bing for indexing`);

      return {
        success: true,
        data: response.data.d
      };
    } catch (error) {
      logger.error('Error submitting URLs to Bing Webmaster Tools:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit URLs to Bing'
      };
    }
  }

  /**
   * Get submitted sitemaps for a site
   * @returns {Promise<Object>} Response from Bing API
   */
  async getSubmittedSitemaps() {
    try {
      if (!this.apiKey) {
        logger.warn('Bing Webmaster Tools API key not configured');
        return {
          success: false,
          error: 'Bing Webmaster Tools API key not configured'
        };
      }

      const data = {
        siteUrl: this.siteUrl,
        apiKey: this.apiKey
      };

      const response = await axios.post(
        `${this.apiEndpoint}/GetSitemaps`,
        data,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.d
      };
    } catch (error) {
      logger.error('Error getting submitted sitemaps from Bing:', error);
      return {
        success: false,
        error: error.message || 'Failed to get submitted sitemaps from Bing'
      };
    }
  }
}

module.exports = new BingWebmasterToolsService();