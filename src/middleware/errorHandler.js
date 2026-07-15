// Centralized error handling middleware for Express
// Catches all errors thrown or passed via next(err) in route handlers.

const logger = require('../utils/logger');

/**
 * Custom application error with HTTP status code.
 */
class AppError extends Error {
  /**
   * @param {string} message  - Human-readable error description
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {Object} [details] - Optional structured error details
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // distinguishes expected errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 handler — attach at the end of your route definitions.
 * Catches all unmatched routes and returns a standard 404 JSON response.
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global error handler — attach as the LAST middleware.
 *
 * Express identifies error-handling middleware by its 4-parameter signature.
 * Any error passed to `next(err)` or thrown in an async handler (when wrapped
 * with the asyncWrapper) will land here.
 */
function globalErrorHandler(err, req, res, _next) {
  // Log the full error for diagnostics
  logger.error(`[${req.method} ${req.originalUrl}] ${err.name}: ${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode || 500,
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build the response payload
  // SECURITY: Never leak internal error details to clients in production
  // In development/test, we still limit exposure to operational errors only
  const body = {
    success: false,
    error: err.isOperational ? err.message : 'Internal server error',
  };

  // Attach validation details when present (e.g. Joi errors)
  // Only for operational errors — never leak internals
  if (err.isOperational && err.details) {
    body.details = err.details;
  }

  // Include stack trace ONLY in development mode, never in production or test
  if (process.env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

/**
 * Wraps an async route handler so thrown errors are forwarded to the
 * global error handler via next(err).
 *
 * Usage:
 *   router.get('/path', asyncWrapper(async (req, res, next) => { ... }));
 */
function asyncWrapper(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  notFoundHandler,
  globalErrorHandler,
  asyncWrapper,
};
