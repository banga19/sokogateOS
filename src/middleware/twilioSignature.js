// Twilio X-Twilio-Signature Verification Middleware for sokogateOS
// Validates that incoming webhook requests are genuinely from Twilio
// by verifying the X-Twilio-Signature header using the Twilio Auth Token.
//
// SECURITY: Prevents spoofed webhook requests (CWE-345: Insufficient
// Verification of Data Authenticity). Without this, an attacker who
// discovers the webhook URL can impersonate Twilio and inject fake
// WhatsApp messages, status updates, or trigger unauthorized actions.

const logger = require('../utils/logger');

/**
 * Twilio request validation result.
 * When auth token is not configured, validation is skipped (dev mode).
 */
function getTwilioAuthToken() {
  return process.env.TWILIO_AUTH_TOKEN;
}

/**
 * Reconstruct the full URL of the webhook endpoint as Twilio sees it.
 * Twilio sends requests to the publicly-accessible URL, which may differ
 * from what Express sees (e.g. behind a reverse proxy).
 *
 * Uses X-Forwarded-Proto and X-Forwarded-Host headers when behind a proxy.
 */
function getRequestUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}${req.originalUrl || req.url}`;
}

/**
 * Middleware: Verify X-Twilio-Signature header on incoming webhook requests.
 *
 * Twilio's signature is computed as:
 *   HMAC-SHA1(authToken, url + sorted_post_params)
 *
 * We use the `twilio` package's built-in `validateRequest` method for
 * an accurate, maintained implementation.
 *
 * @param {Object} options
 * @param {boolean} [options.required=false] - If true, reject requests when
 *   Twilio credentials are configured but signature is missing/invalid.
 *   If false (default), signature validation is best-effort — valid when
 *   credentials exist, skipped otherwise.
 * @returns {Function} Express middleware
 */
function validateTwilioSignature(options = {}) {
  const { required = false } = options;

  return (req, res, next) => {
    // Skip validation for non-POST requests
    if (req.method !== 'POST') {
      return next();
    }

    const authToken = getTwilioAuthToken();
    const signature = req.headers['x-twilio-signature'];

    // If Twilio is not configured, skip validation in development
    if (!authToken) {
      if (required) {
        logger.warn('Twilio Signature: TWILIO_AUTH_TOKEN not set — cannot verify webhook signature');
        return res.status(500).json({
          success: false,
          error: 'Webhook verification not configured'
        });
      }
      // Dev mode: log warning but allow request through
      logger.warn('Twilio Signature: TWILIO_AUTH_TOKEN not set — skipping signature validation (DEV MODE)');
      req.twilioVerified = false;
      return next();
    }

    // If no signature header present
    if (!signature) {
      if (required) {
        logger.warn('Twilio Signature: Missing X-Twilio-Signature header');
        return res.status(403).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }
      logger.warn('Twilio Signature: Missing X-Twilio-Signature header — rejecting request');
      return res.status(403).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    // Reconstruct the full URL
    const url = getRequestUrl(req);

    // Twilio sends POST params as URL-encoded form data.
    // Express parses these into req.body when urlencoded middleware is active.
    // The validateRequest function expects params as an object.
    const params = req.body || {};

    try {
      const twilio = require('twilio');
      const isValid = twilio.validateRequest(authToken, signature, url, params);

      if (!isValid) {
        logger.warn('Twilio Signature: Invalid X-Twilio-Signature — possible spoofing attempt', {
          url,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(403).json({
          success: false,
          error: 'Invalid webhook signature'
        });
      }

      req.twilioVerified = true;
      logger.debug('Twilio Signature: Webhook request verified');
      next();
    } catch (error) {
      logger.error('Twilio Signature: Validation error:', error.message);
      if (required) {
        return res.status(500).json({
          success: false,
          error: 'Webhook verification failed'
        });
      }
      // In non-required mode, allow through on error
      req.twilioVerified = false;
      next();
    }
  };
}

module.exports = { validateTwilioSignature };
