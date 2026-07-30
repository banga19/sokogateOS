// Distributed Rate Limiter for sokogateOS
// Uses the shared Redis client from src/config/redis (Upstash REST or ioredis),
// falls back to in-memory RateLimiterMemory when Redis is unavailable.
//
// Centralising the Redis client means:
//  - health checks, rate limits, and any other Redis consumer all share one connection
//  - Upstash REST and ioredis are selected in one place (redis.js)
//  - graceful shutdown happens in one place

const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const logger = require('./logger');
const { getRedisClient, isConfigured, shutdown: redisShutdown } = require('../config/redis');

// ── Module-level state ──────────────────────────────────────────────────
let pooledRedisAvailable = false;

// ── Rate limiter instances (lazily created) ─────────────────────────────
// Keyed by a unique name so we can have multiple limiters with different
// points/duration settings while sharing the same Redis backend.
const limiterCache = new Map();

// Eager init so isConfigured() is accurate on first call.
pooledRedisAvailable = isConfigured();

/**
 * Create (or retrieve from cache) a rate limiter instance with the given config.
 * Returns a RateLimiterRedis when Redis is available, RateLimiterMemory otherwise.
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

  const redisClient = pooledRedisAvailable ? getRedisClient() : null;
  let limiter;

  if (redisClient) {
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
    logger.debug(`RateLimiter: Created Memory limiter "${name}" (${points} req/${duration}s) — Redis unavailable`);
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
 * Usage: router.post('/login', rateLimit('login', { points: 10, duration: 60, blockDuration: 120 }), handler)
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
 * Graceful shutdown — delegates to the centralised Redis shutdown.
 */
async function shutdown() {
  await redisShutdown();
  logger.info('RateLimiter: Shutdown delegated to redis config');
  limiterCache.clear();
}

module.exports = {
  rateLimit,
  getLimiter,
  shutdown,
};
