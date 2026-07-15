// Input Sanitization Middleware for sokogateOS
// Prevents NoSQL injection, prototype pollution, and other injection attacks
//
// SECURITY NOTE: MongoDB injection occurs when $ operators appear as OBJECT KEYS
// (e.g., { "$gt": "" }, { "$where": "1==1" }), not as string values.
// We only block $ prefixed keys and prototype pollution patterns.

const logger = require('../utils/logger');

/**
 * Checks if an object's keys contain MongoDB operators or prototype pollution patterns.
 * Only checks keys — never blocks string values (which can legitimately start with $ like "$100").
 */
function hasMaliciousKeys(obj) {
  const blockedKeyPatterns = [
    /^\$/,              // Any key starting with $: $where, $ne, $gt, $regex, etc.
    /^__proto__$/,      // Prototype pollution
    /^constructor$/,    // Constructor pollution
    /^prototype$/,      // Prototype pollution
  ];

  for (const key of Object.keys(obj)) {
    if (blockedKeyPatterns.some(pattern => pattern.test(key))) {
      return true;
    }
    // Recursively check nested objects
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      if (hasMaliciousKeys(obj[key])) return true;
    }
  }
  return false;
}

/**
 * Recursively remove MongoDB operators ($ prefixed keys) and prototype pollution from objects
 */
function sanitizeMongoOperators(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeMongoOperators);
  }
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip keys that contain $ operators or prototype pollution patterns
      if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        logger.warn(`Sanitize: Blocked suspicious key "${key}" in user input`);
        continue;
      }
      sanitized[key] = sanitizeMongoOperators(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Middleware: Sanitize request body against NoSQL injection and prototype pollution
 */
function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    if (hasMaliciousKeys(req.body)) {
      logger.warn('Sanitize: NoSQL injection/prototype pollution detected in request body');
      return _res.status(400).json({
        success: false,
        error: 'Invalid input detected in request body'
      });
    }
    req.body = sanitizeMongoOperators(req.body);
  }
  next();
}

/**
 * Middleware: Sanitize query parameters against NoSQL injection
 */
function sanitizeQuery(req, _res, next) {
  if (req.query && typeof req.query === 'object') {
    if (hasMaliciousKeys(req.query)) {
      logger.warn('Sanitize: NoSQL injection/prototype pollution detected in query parameters');
      return _res.status(400).json({
        success: false,
        error: 'Invalid input detected in URL parameters'
      });
    }
    req.query = sanitizeMongoOperators(req.query);
  }
  next();
}

/**
 * Middleware: Sanitize route params against NoSQL injection
 */
function sanitizeParams(req, _res, next) {
  if (req.params && typeof req.params === 'object') {
    if (hasMaliciousKeys(req.params)) {
      logger.warn('Sanitize: NoSQL injection/prototype pollution detected in route parameters');
      return _res.status(400).json({
        success: false,
        error: 'Invalid input detected in route parameters'
      });
    }
    req.params = sanitizeMongoOperators(req.params);
  }
  next();
}

module.exports = {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeMongoOperators
};
