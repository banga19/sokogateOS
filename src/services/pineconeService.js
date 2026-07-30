'use strict';

const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../utils/logger');

class PineconeService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.initialized = false;
    this.apiKey = process.env.PINECONE_API_KEY;
    this.indexName = process.env.PINECONE_INDEX || 'sokogateos';
  }

  /**
   * Connect to Pinecone (v3+ client). Also creates the index if it doesn't exist yet.
   * @returns {Promise<boolean>}
   */
  async initialize() {
    if (this.initialized) return true;

    if (!this.apiKey) {
      logger.warn('Pinecone: API key not set — semantic search disabled');
      return false;
    }

    try {
      this.pinecone = new Pinecone({ apiKey: this.apiKey });

      await this.pinecone.describeIndex(this.indexName);
      this.index = this.pinecone.Index(this.indexName);
      logger.info(`Pinecone: connected to index "${this.indexName}"`);
    } catch (err) {
      if (err.name === 'NotFound' || err.status === 404) {
        logger.info(`Pinecone: creating index "${this.indexName}"`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI text-embedding-3-small default
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });
        // Wait briefly for index to become ready
        await new Promise((r) => setTimeout(r, 5000));
        this.index = this.pinecone.Index(this.indexName);
        logger.info(`Pinecone: created and connected to "${this.indexName}"`);
      } else {
        logger.error('Pinecone: init failed:', err.message);
        this.initialized = false;
        return false;
      }
    }

    this.initialized = true;
    return true;
  }

  /**
   * Upsert vectors into Pinecone.
   * @param {Array<{ id: string, values: number[], metadata?: Object }>} vectors
   * @param {string} [namespace='']
   * @returns {Promise<boolean>}
   */
  async upsert(vectors, namespace = '') {
    if (!this.initialized) {
      logger.warn('Pinecone: not initialised — skipping upsert');
      return false;
    }
    try {
      await this.index.upsert({ vectors, namespace });
      logger.debug(
        `Pinecone: upserted ${vectors.length} vectors${namespace ? ` (ns=${namespace})` : ''}`,
      );
      return true;
    } catch (err) {
      logger.error('Pinecone: upsert failed:', err.message);
      return false;
    }
  }

  /**
   * Query by vector.
   * @param {number[]} vector
   * @param {number} [topK=5]
   * @param {string} [namespace='']
   * @param {Object} [filter={}]
   * @returns {Promise<Array>}
   */
  async query(vector, topK = 5, namespace = '', filter = {}) {
    if (!this.initialized) {
      logger.warn('Pinecone: not initialised — returning empty query');
      return [];
    }
    try {
      const res = await this.index.query({
        vector,
        topK,
        namespace,
        filter,
        includeMetadata: true,
      });
      return res.matches || [];
    } catch (err) {
      logger.error('Pinecone: query failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch vectors by IDs.
   * @param {string|string[]} ids
   * @param {string} [namespace='']
   * @returns {Promise<Object>}
   */
  async fetch(ids, namespace = '') {
    if (!this.initialized) {
      logger.warn('Pinecone: not initialised — returning empty fetch');
      return {};
    }
    try {
      const idList = Array.isArray(ids) ? ids : [ids];
      const res = await this.index.fetch({ ids: idList, namespace });
      return res.records || {};
    } catch (err) {
      logger.error('Pinecone: fetch failed:', err.message);
      return {};
    }
  }

  /**
   * Delete vectors by IDs.
   * @param {string|string[]} ids
   * @param {string} [namespace='']
   * @param {boolean} [deleteAll=false]
   * @returns {Promise<boolean>}
   */
  async delete(ids, namespace = '', deleteAll = false) {
    if (!this.initialized) {
      logger.warn('Pinecone: not initialised — skipping delete');
      return false;
    }
    try {
      if (deleteAll) {
        await this.index.deleteAll({ namespace });
        logger.info(`Pinecone: deleted all vectors${namespace ? ` in ns=${namespace}` : ''}`);
      } else {
        const idList = Array.isArray(ids) ? ids : [ids];
        await this.index.delete({ ids: idList, namespace });
        logger.info(`Pinecone: deleted ${idList.length} vectors${namespace ? ` in ns=${namespace}` : ''}`);
      }
      return true;
    } catch (err) {
      logger.error('Pinecone: delete failed:', err.message);
      return false;
    }
  }

  /**
   * Describe the index (stats).
   * @returns {Promise<Object|null>}
   */
  async describeIndexStats() {
    if (!this.initialized) return null;
    try {
      return await this.index.describeIndexStats();
    } catch (err) {
      logger.error('Pinecone: describeIndexStats failed:', err.message);
      return null;
    }
  }

  /**
   * Health check for /health route.
   * @returns {{ ok: boolean, message: string }}
   */
  async healthProbe() {
    if (!this.apiKey) {
      return { ok: false, message: 'API key not set' };
    }
    if (!this.initialized) {
      const ok = await this.initialize();
      return ok
        ? { ok: true, message: 'Initialized on demand' }
        : { ok: false, message: 'Failed to initialize' };
    }
    try {
      const stats = await this.index.describeIndexStats();
      return {
        ok: true,
        message: `Index "${this.indexName}" ready`,
        vectorCount: stats?.totalRecordCount ?? null,
      };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
}

const pineconeService = new PineconeService();

module.exports = { pineconeService, PineconeService };
