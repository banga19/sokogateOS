// CORS middleware — configured via FRONTEND_URL environment variable.
// In production, FRONTEND_URL is required and must list allowed origins
// as a comma-separated list. Falls back to restrictive behaviour when unset.

const logger = require('../utils/logger');

/**
 * Build the allowed-origins list once at startup.
 * Returns an Array of origin strings (or ['*'] only in development).
 */
function buildAllowedOrigins() {
  const url = process.env.FRONTEND_URL;

  if (url) {
    // Comma-separated list of allowed origins
    return url.split(',').map((s) => s.trim());
  }

  if (process.env.NODE_ENV === 'production') {
    logger.warn(
      '[CORS] FRONTEND_URL not set. CORS will be restrictive — ' +
        'no cross-origin requests will be allowed. Set FRONTEND_URL in production.'
    );
    return [];
  }

  logger.warn(
    '[CORS] FRONTEND_URL not set. Allowing all origins for development. ' +
      'SET THIS IN PRODUCTION.'
  );
  return ['*'];
}

const allowedOrigins = buildAllowedOrigins();

/**
 * Express middleware that sets CORS headers based on the request origin.
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  } else if (origin) {
    // Origin not in allowed list — still set Vary header for proper caching
    res.header('Vary', 'Origin');
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

module.exports = corsMiddleware;
