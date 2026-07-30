'use strict';

const logger = require('../utils/logger');

let redisClient = null;
let redisAvailable = false;
let initializationAttempted = false;

/**
 * Initialize a Redis client that prefers Upstash Redis (REST) when
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set, otherwise
 * falls back to ioredis via REDIS_URL.  If neither is configured the
 * client remains null and callers should use their in-memory fallback.
 */
function initializeRedis() {
  if (initializationAttempted) return;
  initializationAttempted = true;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redisUrl = process.env.REDIS_URL;

  if (upstashUrl && upstashToken) {
    try {
      const { Redis } = require('@upstash/redis');
      redisClient = new Redis({ url: upstashUrl, token: upstashToken });
      redisAvailable = true;
      logger.info('Redis: Upstash Redis configured (REST client)');
    } catch (err) {
      logger.warn(`Redis: Failed to initialise Upstash Redis: ${err.message}`);
      redisClient = null;
      redisAvailable = false;
    }
  } else if (redisUrl) {
    try {
      const { Redis } = require('ioredis');
      redisClient = new Redis(redisUrl, {
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });

      redisClient.on('connect', () => {
        redisAvailable = true;
        logger.info('Redis: ioredis connected — distributed rate limiting active');
      });

      redisClient.on('error', (err) => {
        if (redisAvailable) {
          logger.warn('Redis: connection lost — falling back to in-memory', err.message);
          redisAvailable = false;
        }
      });

      redisClient.on('close', () => {
        if (redisAvailable) {
          logger.warn('Redis: connection closed — falling back to in-memory');
          redisAvailable = false;
        }
      });

      redisAvailable = true; // optimistic until first error
    } catch (err) {
      logger.warn(`Redis: Failed to initialise ioredis: ${err.message}`);
      redisClient = null;
      redisAvailable = false;
    }
  } else {
    logger.info('Redis: No Redis URL configured — in-memory caching only');
    redisClient = null;
    redisAvailable = false;
  }
}

/**
 * @returns {Object|null} Redis client or null when not configured
 */
function getRedisClient() {
  if (!initializationAttempted) initializeRedis();
  return redisClient;
}

/**
 * @returns {boolean} true when a Redis client is usable
 */
function isConfigured() {
  if (!initializationAttempted) initializeRedis();
  return redisAvailable;
}

/**
 * Graceful shutdown.
 * @returns {Promise<void>}
 */
async function shutdown() {
  if (!redisClient) return;
  try {
    if (typeof redisClient.quit === 'function') {
      await redisClient.quit();
    } else if (typeof redisClient.close === 'function') {
      await redisClient.close();
    }
    logger.info('Redis: connection closed');
  } catch (err) {
    logger.warn(`Redis: error closing: ${err.message}`);
  } finally {
    redisClient = null;
    redisAvailable = false;
  }
}

// Eager init so first caller is synchronous.
initializeRedis();

module.exports = {
  getRedisClient,
  isConfigured,
  shutdown,
};
