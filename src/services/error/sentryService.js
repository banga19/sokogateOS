// Sentry Error Tracking Service for sokogateOS
// Integrates with Sentry for error monitoring and performance tracking
// Target: @sentry/node ^10.60.0 (v10 API — removed Handlers, uses setupExpressErrorHandler)

const logger = require('../../utils/logger');
let Sentry;

try {
  Sentry = require('@sentry/node');
} catch (e) {
  Sentry = null;
  logger.warn('Sentry package not available, error tracking disabled');
}

/**
 * Sentry service for error tracking and performance monitoring
 */
class SentryService {
  constructor() {
    this.isInitialized = false;
    this.dsn = process.env.SENTRY_DSN || '';
    this.environment = process.env.NODE_ENV || 'development';
    let release = 'sokogateos@dev';
    try {
      release = `sokogateos@${require('../../../package.json').version}`;
    } catch { /* fallback */ }
    this.release = process.env.SENTRY_RELEASE || release;

    // Initialize Sentry if DSN is provided and Sentry loaded
    if (this.dsn && Sentry) {
      this.initialize();
    }
  }

  /**
   * Initialize Sentry with tracing and error tracking
   * NOTE: Express error handler is NOT set up here to avoid circular dependency.
   * Call setupExpressIntegration(app) after routes are registered.
   */
  initialize() {
    if (!Sentry) return;
    try {
      Sentry.init({
        dsn: this.dsn,
        environment: this.environment,
        release: this.release,
        integrations: [
          // Enable HTTP request tracing (v10 built-in)
          new Sentry.Integrations.Http({ tracing: true }),
          // Express integration is added lazily via setupExpressIntegration(app)
          // to avoid requiring index.js (circular dependency)
        ],
        // Performance monitoring — traces 10% of transactions by default
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
        // Error sampling — capture all errors
        sampleRate: parseFloat(process.env.SENTRY_ERROR_SAMPLE_RATE) || 1.0,
        attachStacktrace: true,
        breadcrumbs: {
          console: true,
          dom: true,
          xhr: true,
          fetch: true,
          history: true,
        },
      });

      this.isInitialized = true;
      logger.info('Sentry initialized successfully', {
        environment: this.environment,
        release: this.release,
      });
    } catch (error) {
      logger.error('Failed to initialize Sentry:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Set up Express error handler lazily after app is fully built.
   * Avoids circular dependency: sentryService.js -> index.js -> ... -> sentryService.js
   * Uses @sentry/node v10+ setupExpressErrorHandler API.
   * @param {Object} app - The Express application instance
   */
  setupExpressIntegration(app) {
    if (!this.isInitialized || !app || !Sentry) return;
    try {
      // @sentry/node v10+ uses setupExpressErrorHandler instead of Handlers.errorHandler()
      if (typeof Sentry.setupExpressErrorHandler === 'function') {
        Sentry.setupExpressErrorHandler(app);
        logger.info('Sentry: Express error handler initialized via setupExpressErrorHandler');
      } else {
        logger.warn('Sentry: setupExpressErrorHandler not available');
      }
    } catch (error) {
      logger.warn('Sentry: Failed to setup Express integration:', error.message);
    }
  }

  /**
   * Capture an exception and send to Sentry
   * @param {Error} error - The error to capture
   * @param {Object} context - Additional context information
   * @param {string} level - Error level (fatal, error, warning, info, debug)
   * @returns {string|null} Event ID
   */
  captureException(error, context = {}, level = 'error') {
    if (!this.isInitialized || !Sentry) return null;

    try {
      const eventId = Sentry.captureException(error, {
        contexts: { ...context },
        level,
      });
      logger.info(`Error captured by Sentry: ${eventId}`, { error: error.message, level });
      return eventId;
    } catch (captureError) {
      logger.error('Failed to capture exception with Sentry:', captureError.message);
      return null;
    }
  }

  /**
   * Capture a message and send to Sentry
   * @param {string} message - The message to capture
   * @param {Object} context - Additional context information
   * @param {string} level - Message level (fatal, error, warning, info, debug)
   * @returns {string|null} Event ID
   */
  captureMessage(message, context = {}, level = 'info') {
    if (!this.isInitialized || !Sentry) return null;

    try {
      const eventId = Sentry.captureMessage(message, {
        contexts: { ...context },
        level,
      });
      logger.info(`Message captured by Sentry: ${eventId}`, { message, level });
      return eventId;
    } catch (captureError) {
      logger.error('Failed to capture message with Sentry:', captureError.message);
      return null;
    }
  }

  /**
   * Add breadcrumb for tracking user actions and system events
   * @param {Object} breadcrumb - Breadcrumb data
   */
  addBreadcrumb(breadcrumb) {
    if (!this.isInitialized || !Sentry) return;
    try {
      Sentry.addBreadcrumb({
        type: breadcrumb.type || 'custom',
        category: breadcrumb.category || 'sokogateos',
        message: breadcrumb.message,
        data: breadcrumb.data || {},
        level: breadcrumb.level || 'info',
      });
    } catch (error) {
      logger.error('Failed to add breadcrumb:', error.message);
    }
  }

  /**
   * Set user context for error tracking
   * @param {Object} user - User information
   */
  setUserContext(user) {
    if (!this.isInitialized || !Sentry) return;
    try {
      Sentry.setUser(user);
    } catch (error) {
      logger.error('Failed to set user context:', error.message);
    }
  }

  /**
   * Set tag for filtering and searching errors
   * @param {string} key - Tag key
   * @param {string|number|boolean} value - Tag value
   */
  setTag(key, value) {
    if (!this.isInitialized || !Sentry) return;
    try {
      Sentry.setTag(key, value);
    } catch (error) {
      logger.error('Failed to set tag:', error.message);
    }
  }

  /**
   * Start a performance monitoring transaction
   * @param {string} name - Transaction name
   * @param {string} operation - Operation type
   * @returns {Object|null} Transaction object
   */
  startTransaction(name, operation) {
    if (!this.isInitialized || !Sentry) return null;
    return Sentry.startTransaction({ name, operation });
  }

  /**
   * Check if Sentry is initialized and ready
   * @returns {boolean} Initialization status
   */
  isReady() {
    return this.isInitialized && !!this.dsn;
  }

  /**
   * Get current Sentry status and configuration
   * @returns {Object} Sentry status
   */
  getStatus() {
    if (!this.isInitialized || !Sentry) {
      return { initialized: false, error: 'Sentry not initialized' };
    }

    let options = {};
    try {
      const client = Sentry.getClient ? Sentry.getClient() : null;
      if (client && typeof client.getOptions === 'function') {
        options = client.getOptions();
      }
    } catch { /* ignore */ }

    return {
      initialized: true,
      dsn: !!this.dsn,
      environment: this.environment,
      release: this.release,
      tracesSampleRate: options.tracesSampleRate,
      sampleRate: options.sampleRate,
      hasIntegrations: !!options.integrations && typeof options.integrations === 'object',
    };
  }
}

/**
 * Express middleware for tracing (early in stack).
 * @sentry/node v10+ handles request tracing via Http integration,
 * so this is a no-op unless custom transaction creation is needed.
 * Kept as a pass-through to avoid changing the middleware signature.
 */
function sentryTracingHandler() {
  return (req, res, next) => next();
}

/**
 * Express middleware for Sentry error handling.
 * Error handling is set up via setupExpressIntegration(app) which calls
 * Sentry.setupExpressErrorHandler(app) — the @sentry/node v10+ recommended API.
 * This middleware is a pass-through; the real handler is attached at the app level.
 */
function sentryErrorHandler() {
  return (err, req, res, next) => next(err);
}

module.exports = {
  SentryService: new SentryService(),
  sentryErrorHandler,
  sentryTracingHandler,
};
