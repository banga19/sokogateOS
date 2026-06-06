// Sentry Error Tracking Service for sokogateOS
// Integrates with Sentry for error monitoring and performance tracking

const logger = require('../../utils/logger');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

/**
 * Sentry service for error tracking and performance monitoring
 */
class SentryService {
  constructor() {
    this.isInitialized = false;
    this.dsn = process.env.SENTRY_DSN || '';
    this.environment = process.env.NODE_ENV || 'development';
    this.release = process.env.SENTRY_RELEASE || `sokogateos@${require('../../package.json').version}`;

    // Initialize Sentry if DSN is provided
    if (this.dsn) {
      this.initialize();
    }
  }

  /**
   * Initialize Sentry with tracing and error tracking
   */
  initialize() {
    try {
      Sentry.init({
        dsn: this.dsn,
        environment: this.environment,
        release: this.release,
        integrations: [
          // Enable HTTP request tracing
          new Sentry.Integrations.Http({ tracing: true }),
          // Enable Express.js middleware tracing
          new Tracing.Integrations.Express({ app: require('../../index') })
        ],
        // Performance monitoring
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
        // Error sampling
        sampleRate: parseFloat(process.env.SENTRY_ERROR_SAMPLE_RATE) || 1.0,
        // Attach stacktraces
        attachStacktrace: true,
        // Breadcrumbs
        breadcrumbs: {
          // Capture console logs
          console: true,
          // Capture DOM events (if applicable)
          dom: true,
          // Capture network requests
          xhr: true,
          // Capture fetch API calls
          fetch: true,
          // Capture history (if applicable)
          history: true
        }
      });

      // Set up automatic performance monitoring
      Sentry.startScope();

      this.isInitialized = true;
      logger.info('Sentry initialized successfully', {
        environment: this.environment,
        release: this.release,
        tracesSampleRate: Sentry.getCurrentHub().getClient().getOptions().tracesSampleRate
      });
    } catch (error) {
      logger.error('Failed to initialize Sentry:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Capture an exception and send to Sentry
   * @param {Error} error - The error to capture
   * @param {Object} context - Additional context information
   * @param {string} level - Error level (fatal, error, warning, info, debug)
   * @returns {string} Event ID
   */
  captureException(error, context = {}, level = 'error') {
    if (!this.isInitialized) {
      logger.warn('Sentry not initialized, skipping error capture:', error.message);
      return null;
    }

    try {
      const eventId = Sentry.captureException(error, {
        contexts: {
          ...context
        },
        level: level
      });

      logger.info(`Error captured by Sentry: ${eventId}`, {
        error: error.message,
        level: level
      });

      return eventId;
    } catch (captureError) {
      logger.error('Failed to capture exception with Sentry:', captureError);
      return null;
    }
  }

  /**
   * Capture a message and send to Sentry
   * @param {string} message - The message to capture
   * @param {Object} context - Additional context information
   * @param {string} level - Message level (fatal, error, warning, info, debug)
   * @returns {string} Event ID
   */
  captureMessage(message, context = {}, level = 'info') {
    if (!this.isInitialized) {
      logger.warn('Sentry not initialized, skipping message capture:', message);
      return null;
    }

    try {
      const eventId = Sentry.captureMessage(message, {
        contexts: {
          ...context
        },
        level: level
      });

      logger.info(`Message captured by Sentry: ${eventId}`, {
        message: message,
        level: level
      });

      return eventId;
    } catch (captureError) {
      logger.error('Failed to capture message with Sentry:', captureError);
      return null;
    }
  }

  /**
   * Add breadcrumb for tracking user actions and system events
   * @param {Object} breadcrumb - Breadcrumb data
   */
  addBreadcrumb(breadcrumb) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.addBreadcrumb({
        type: breadcrumb.type || 'custom',
        category: breadcrumb.category || 'sokogateos',
        message: breadcrumb.message,
        data: breadcrumb.data || {},
        level: breadcrumb.level || 'info'
      });
    } catch (error) {
      logger.error('Failed to add breadcrumb:', error);
    }
  }

  /**
   * Set user context for error tracking
   * @param {Object} user - User information
   */
  setUserContext(user) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setUser(user);
    } catch (error) {
      logger.error('Failed to set user context:', error);
    }
  }

  /**
   * Set tag for filtering and searching errors
   * @param {string} key - Tag key
   * @param {string|number|boolean} value - Tag value
   */
  setTag(key, value) {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setTag(key, value);
    } catch (error) {
      logger.error('Failed to set tag:', error);
    }
  }

  /**
   * Start a performance monitoring transaction
   * @param {string} name - Transaction name
   * @param {string} operation - Operation type
   * @returns {Object} Transaction object
   */
  startTransaction(name, operation) {
    if (!this.isInitialized) {
      return null;
    }

    return Sentry.startTransaction({
      name: name,
      operation: operation
    });
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
    if (!this.isInitialized) {
      return {
        initialized: false,
        error: 'Sentry not initialized'
      };
    }

    const client = Sentry.getCurrentHub().getClient();
    const options = client ? client.getOptions() : {};

    return {
      initialized: true,
      dsn: !!this.dsn,
      environment: this.environment,
      release: this.release,
      tracesSampleRate: options.tracesSampleRate,
      sampleRate: options.sampleRate,
      hasIntegrations: !!options.integrations && options.integrations.length > 0
    };
  }
}

/**
 * Express middleware for Sentry error handling
 * Should be placed after all other middleware and routes
 */
function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Express middleware for Sentry tracing
 * Should be placed as early as possible in middleware stack
 */
function sentryTracingHandler() {
  return Sentry.Handlers.requestHandler();
}

module.exports = {
  SentryService: new SentryService(),
  sentryErrorHandler,
  sentryTracingHandler
};