// Input Validation Middleware for sokogateOS
// Validates and sanitizes API request data

const logger = require('../utils/logger');

/**
 * Validates that required fields exist in request body
 * @param {string[]} fields - Array of required field names
 */
function requireFields(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const value = req.body[f];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }
    next();
  };
}

/**
 * Validates that a field matches an expected type/format
 */
const validators = {
  isString: (v) => typeof v === 'string' && v.trim().length > 0,
  isNumber: (v) => typeof v === 'number' && !isNaN(v),
  isBoolean: (v) => typeof v === 'boolean',
  isEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  isObjectId: (v) => /^[0-9a-fA-F]{24}$/.test(v),
  isPhone: (v) => /^\+?[\d\s-]{7,15}$/.test(v),
  isUrl: (v) => /^https?:\/\/.+/.test(v),
  isIn: (allowed) => (v) => allowed.includes(v),
  minLength: (min) => (v) => typeof v === 'string' && v.length >= min,
  maxLength: (max) => (v) => typeof v === 'string' && v.length <= max,
  range: (min, max) => (v) => typeof v === 'number' && v >= min && v <= max
};

/**
 * Creates a validation middleware from a schema definition
 * @param {Object} schema - Field validation rules
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const errors = [];
    const data = req[source];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Skip optional fields that are not present
      if (value === undefined && rules.optional) continue;

      for (const rule of rules.rules) {
        if (typeof rule === 'function') {
          if (!rule(value)) {
            errors.push(`${field}: ${rules.message || 'validation failed'}`);
            break;
          }
        }
      }
    }

    if (errors.length > 0) {
      logger.warn(`Validation failed: ${errors.join('; ')}`);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Sanitizes request body to remove unexpected fields
 * @param {string[]} allowedFields - Fields that are allowed
 */
function sanitize(allowedFields) {
  return (req, res, next) => {
    const sanitized = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        sanitized[field] = req.body[field];
      }
    }
    req.body = sanitized;
    next();
  };
}

module.exports = {
  requireFields,
  validate,
  sanitize,
  validators
};
