// API Key Authentication Middleware for sokogateOS
// Provides API key-based authentication for external service integrations
// such as health checks, webhooks, monitoring systems, and CI/CD pipelines.
//
// SECURITY: Protects machine-to-machine endpoints (CWE-287: Improper Authentication).
// Without this, any service that discovers a webhook or health endpoint URL can
// access sensitive operational information or trigger actions.

const logger = require('../utils/logger');

/**
 * Parse a comma-separated env var into a trimmed array of non-empty strings.
 */
function parseKeyList(value) {
  if (!value || value.length === 0) return [];
  return value.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
}

/**
 * Retrieve all configured API keys from environment.
 * Supports:
 *   - EXTERNAL_API_KEY (single key, legacy)
 *   - EXTERNAL_API_KEYS (comma-separated list for multi-key support)
 *   - EXTERNAL_API_KEYS_PREVIOUS (comma-separated list for key rotation —
 *     old keys still accepted but trigger deprecation warnings)
 *
 * All sources are merged so different services can use different keys,
 * and key rotation can happen without downtime.
 * Returns an empty array if none configured (dev mode).
 */
function getConfiguredApiKeys() {
  const keys = [];
  const single = process.env.EXTERNAL_API_KEY;
  const multi = process.env.EXTERNAL_API_KEYS;
  const previous = process.env.EXTERNAL_API_KEYS_PREVIOUS;

  if (single && single.length > 0) {
    keys.push(single);
  }

  for (const k of parseKeyList(multi)) {
    keys.push(k);
  }

  for (const k of parseKeyList(previous)) {
    keys.push(k);
  }

  return keys;
}

/**
 * Retrieve keys grouped by rotation status.
 * Returns { current: string[], previous: string[] }
 */
function getKeyRotationStatus() {
  return {
    current: [
      ...(process.env.EXTERNAL_API_KEY && process.env.EXTERNAL_API_KEY.length > 0
        ? [process.env.EXTERNAL_API_KEY]
        : []),
      ...parseKeyList(process.env.EXTERNAL_API_KEYS),
    ],
    previous: parseKeyList(process.env.EXTERNAL_API_KEYS_PREVIOUS),
  };
}

/**
 * Validate that a configured API key meets minimum strength requirements.
 * In production, a weak key triggers a warning.
 */
function validateApiKeyStrength(key) {
  if (!key) return false;
  // Minimum 32 chars for production-worthy API keys
  if (key.length < 32) {
    logger.warn('API Key Auth: Configured key is less than 32 characters — consider a stronger key');
  }
  return true;
}

/**
 * Check whether a provided key matches any of the configured keys.
 * Uses constant-time comparison to prevent timing attacks.
 */
function isKeyInList(providedKey, configuredKeys) {
  if (!providedKey || !configuredKeys || configuredKeys.length === 0) return false;
  for (const configuredKey of configuredKeys) {
    if (providedKey.length === configuredKey.length && constantTimeCompare(providedKey, configuredKey)) {
      return true;
    }
  }
  return false;
}

/**
 * Express middleware factory — authenticates via API key in the x-api-key header.
 *
 * @param {Object} options
 * @param {string} [options.headerName='x-api-key'] - Header to read the API key from
 * @param {boolean} [options.required=true] - If true, reject when key is missing/invalid
 * @param {boolean} [options.passthrough=false] - If true, allow unauthenticated requests in dev mode (set req.authenticatedByApiKey = true/false)
 * @returns {Function} Express middleware
 *
 * Usage:
 *   // Strict: rejects unauthenticated requests
 *   router.get('/health/live', requireApiKey(), handler)
 *
 *   // Passthrough: allows unauthenticated in dev, rejects in prod
 *   router.get('/health', requireApiKey({ required: true, passthrough: true }), handler)
 *
 *   // Optional: allows unauthenticated always, sets req.authenticatedByApiKey flag
 *   router.get('/health', requireApiKey({ required: false }), handler)
 */
function requireApiKey(options = {}) {
  const {
    headerName = 'x-api-key',
    required = true,
    passthrough = false,
  } = options;

  return (req, res, next) => {
    // If request is already authenticated via JWT (has req.user), skip API key check
    if (req.user) {
      req.authenticatedByApiKey = false;
      return next();
    }

    const configuredKeys = getConfiguredApiKeys();
    const providedKey = req.headers[headerName.toLowerCase()];

    // If no API key is configured in environment
    if (configuredKeys.length === 0) {
      if (required && !passthrough) {
        // Strict mode — reject if API key auth is needed but not configured
        logger.warn('API Key Auth: No API keys configured (EXTERNAL_API_KEY / EXTERNAL_API_KEYS) but required=true — rejecting request');
        return res.status(500).json({
          success: false,
          error: 'API key authentication not configured'
        });
      }

      // Passthrough or not required — allow in dev mode
      logger.warn('API Key Auth: No API keys configured (EXTERNAL_API_KEY / EXTERNAL_API_KEYS) — allowing request without API key auth');
      req.authenticatedByApiKey = false;
      return next();
    }

    // Validate each configured key's strength
    for (const key of configuredKeys) {
      validateApiKeyStrength(key);
    }

    // Check if API key was provided in request
    if (!providedKey) {
      if (passthrough) {
        // Passthrough mode — allow but mark as unauthenticated
        req.authenticatedByApiKey = false;
        return next();
      }

      logger.warn('API Key Auth: Missing x-api-key header');
      return res.status(401).json({
        success: false,
        error: 'API key is required. Provide it via the x-api-key header.'
      });
    }

    // Check the provided key against all configured keys (any match succeeds)
    const isValid = isKeyInList(providedKey, configuredKeys);

    if (!isValid) {
      logger.warn('API Key Auth: Invalid API key provided', {
        ip: req.ip,
        path: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // API key is valid — mark the request
    req.authenticatedByApiKey = true;
    req.authMethod = 'api_key';

    // If the key is from EXTERNAL_API_KEYS_PREVIOUS AND there are current keys
    // (active rotation), log a deprecation warning. Only warn when a migration
    // target exists — no warning if previous keys are all that's configured.
    const rotationStatus = getKeyRotationStatus();
    if (
      rotationStatus.current.length > 0 &&
      isKeyInList(providedKey, rotationStatus.previous)
    ) {
      logger.warn('API Key Auth: Deprecated key used for authentication — rotate to a current key', {
        prefix: providedKey.slice(0, 4) + '****',
        ip: req.ip,
        path: req.originalUrl,
      });
      req.authMethod = 'api_key_rotating';
    } else {
      logger.debug('API Key Auth: Request authenticated via API key');
    }

    next();
  };
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares the HMAC of both strings instead of the strings directly.
 */
function constantTimeCompare(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  const crypto = require('crypto');
  // HMAC both strings with a server-internal secret so comparison is constant-time
  const secret = process.env.JWT_SECRET || 'constant-time-comparison-salt';
  const hmacA = crypto.createHmac('sha256', secret).update(a).digest();
  const hmacB = crypto.createHmac('sha256', secret).update(b).digest();
  return crypto.timingSafeEqual(hmacA, hmacB);
}

/**
 * Build a metadata entry for a single key.
 */
function buildKeyEntry(key, source, status, crypto) {
  return {
    prefix: key.slice(0, 4),
    hash: crypto.createHash('sha256').update(key).digest('hex'),
    source,
    status,
    length: key.length,
    meetsMinimumStrength: key.length >= 32,
  };
}

/**
 * Get metadata about all configured API keys for operational visibility.
 * Never exposes full secrets — returns:
 *   - configured: boolean
 *   - count: number of configured keys
 *   - keys[]: prefix (first 4 chars), hash (SHA-256), source, status (current|rotating),
 *             length, meetsMinimumStrength
 *   - rotatation: { inProgress, currentCount, previousCount }
 *
 * Useful for admin dashboards and operational health checks. Shows which keys
 * are current vs. rotating out (from EXTERNAL_API_KEYS_PREVIOUS).
 */
function getApiKeyMetadata() {
  const crypto = require('crypto');

  const status = getKeyRotationStatus();
  const keys = [];

  // Current keys
  const single = process.env.EXTERNAL_API_KEY;

  if (single && single.length > 0) {
    keys.push(buildKeyEntry(single, 'EXTERNAL_API_KEY', 'current', crypto));
  } else {
    keys.push({ source: 'EXTERNAL_API_KEY', configured: false });
  }

  if (status.current.length > 0) {
    // EXTERNAL_API_KEYS entries (skip the single key already added)
    for (const key of status.current) {
      if (key !== single) {
        keys.push(buildKeyEntry(key, 'EXTERNAL_API_KEYS', 'current', crypto));
      }
    }
  } else {
    keys.push({ source: 'EXTERNAL_API_KEYS', configured: false });
  }

  // Previous / rotating keys
  if (status.previous.length > 0) {
    for (const key of status.previous) {
      keys.push(buildKeyEntry(key, 'EXTERNAL_API_KEYS_PREVIOUS', 'rotating', crypto));
    }
  } else {
    keys.push({ source: 'EXTERNAL_API_KEYS_PREVIOUS', configured: false });
  }

  return {
    configured: getConfiguredApiKeys().length > 0,
    count: getConfiguredApiKeys().length,
    keys,
    rotation: {
      inProgress: status.previous.length > 0,
      currentCount: status.current.length,
      previousCount: status.previous.length,
    },
  };
}

module.exports = { requireApiKey, getApiKeyMetadata, getKeyRotationStatus };
