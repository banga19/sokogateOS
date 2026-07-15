// Distributed Rate Limiter for sokogateOS
// Uses Redis when available (via rate-limiter-flexible's RateLimiterRedis),
// falls back to in-memory RateLimiterMemory when Redis is unavailable.
//
// Provides factory functions that create rate limiter middleware for any route,
// sharing the same Redis backend so rate limits are enforced consistently
// across all server instances (horizontal scaling).

const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('./logger');

// ── Module-level state ──────────────────────────────────────────────────
let redisClient = null;
let redisAvailable = false;
let initializationAttempted = false;

// ── Rate limiter instances (lazily created) ─────────────────────────────
// Keyed by a unique name so we can have multiple limiters with different
// points/duration settings while sharing the same Redis backend.
const limiterCache = new Map();

/**
 * Attempt to create a Redis connection. Called once at startup.
 * If Redis is unreachable, we silently fall back to in-memory limiters.
 */
function initializeRedis() {
  if (initializationAttempted) return;
  initializationAttempted = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.info('RateLimiter: REDIS_URL not set — using in-memory rate limiting');
    return;
  }

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(redisUrl, {
      enableOfflineQueue: false,    // Don't queue commands when disconnected
      lazyConnect: true,            // Connect on first command
      maxRetriesPerRequest: 1,      // Fail fast rather than retrying
      retryStrategy: () => null,    // Don't auto-reconnect — use memory fallback
    });

    // Check connectivity
    redisClient.on('connect', () => {
      redisAvailable = true;
      logger.info('RateLimiter: Redis connected — using distributed rate limiting');
    });

    redisClient.on('error', (err) => {
      if (redisAvailable) {
        logger.warn('RateLimiter: Redis connection lost — falling back to in-memory', err.message);
        redisAvailable = false;
      }
    });

    redisClient.on('close', () => {
      if (redisAvailable) {
        logger.warn('RateLimiter: Redis connection closed — falling back to in-memory');
        redisAvailable = false;
      }
    });
  } catch (err) {
    logger.warn(`RateLimiter: Failed to initialize Redis (${err.message}) — using in-memory`);
    redisClient = null;
  }
}

/**
 * Create (or retrieve from cache) a rate limiter instance with the given config.
 * Returns a RateLimiterRedis if Redis is available, RateLimiterMemory otherwise.
 *
 * @param {string} name - Unique name for this limiter (e.g., 'auth', 'api', 'login')
 * @param {Object} options
 * @param {number} options.points - Max requests in the window
 * @param {number} options.duration - Window duration in seconds
 * @param {number} [options.blockDuration] - Block duration in seconds (0 = no block)
 * @returns {Object} Rate limiter instance with .consume(key) method
 */
function getLimiter(name, { points, duration, blockDuration = 0 }) {
  const cacheKey = `${name}:${points}:${duration}:${blockDuration}`;

  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey);
  }

  // Initialize Redis on first call (safe to call multiple times)
  initializeRedis();

  let limiter;

  if (redisAvailable && redisClient) {
    const { RateLimiterRedis } = require('rate-limiter-flexible');
    limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: `rl:${name}`,
      points,
      duration,
      blockDuration,
      // Use memory fallback when Redis is down mid-operation
      insuranceLimiter: new RateLimiterMemory({
        keyPrefix: `rl-mem:${name}`,
        points,
        duration,
        blockDuration,
      }),
    });
    logger.debug(`RateLimiter: Created Redis limiter "${name}" (${points} req/${duration}s)`);
  } else {
    limiter = new RateLimiterMemory({
      keyPrefix: `rl-mem:${name}`,
      points,
      duration,
      blockDuration,
    });
    logger.debug(`RateLimiter: Created Memory limiter "${name}" (${points} req/${duration}s)`);
  }

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Express middleware factory — rate limits requests by IP.
 *
 * @param {string} name - Unique limiter name
 * @param {Object} options - Same as getLimiter options
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.post('/login', rateLimit('login', { points: 10, duration: 60, blockDuration: 120 }), handler)
 */
function rateLimit(name, options = {}) {
  const {
    points = 100,
    duration = 60,
    blockDuration = 0,
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const limiter = getLimiter(name, { points, duration, blockDuration });

    limiter.consume(key)
      .then((rateLimitRes) => {
        // Set headers for client awareness
        // Use the resolved remainingPoints from consume() — this works for
        // both RateLimiterRedis (which doesn't expose remainingPoints on the
        // instance) and RateLimiterMemory (which does).
        const remaining = rateLimitRes && rateLimitRes.remainingPoints !== undefined
          ? Math.max(0, rateLimitRes.remainingPoints)
          : points;
        res.set('X-RateLimit-Limit', String(points));
        res.set('X-RateLimit-Remaining', String(remaining));
        next();
      })
      .catch((err) => {
        if (err instanceof Error) {
          // Internal error (e.g., Redis down with no memory fallback)
          logger.warn(`RateLimiter: Error for "${name}" key "${key}":`, err.message);
          return next(); // Fail open to avoid blocking all traffic on infrastructure failure
        }

        // Rate limit exceeded — err is an object with msBeforeNext
        const retryAfter = Math.ceil((err.msBeforeNext || blockDuration * 1000) / 1000);
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(points));
        res.set('X-RateLimit-Remaining', '0');

        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter,
        });
      });
  };
}

/**
 * Graceful shutdown — close Redis connection.
 */
async function shutdown() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('RateLimiter: Redis connection closed');
    } catch (err) {
      logger.warn('RateLimiter: Error closing Redis:', err.message);
    }
    redisClient = null;
    redisAvailable = false;
  }
}

// Initialize Redis eagerly at module load
initializeRedis();

module.exports = {
  rateLimit,
  getLimiter,
  initializeRedis,
  shutdown,
};
