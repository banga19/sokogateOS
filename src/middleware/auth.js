// Authentication & Authorization Middleware for sokogateOS
// Provides JWT verification, role-based access control, and company scoping

const { verifyAccessToken } = require('../services/authService');
const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * Middleware: Authenticate JWT token
 * Extracts and verifies the Bearer token from Authorization header
 * Attaches decoded user to request.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid access token.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Contact your administrator.'
      });
    }

    // Check if password was changed after token was issued
    if (user.isPasswordChangedAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        error: 'Token is no longer valid. Please login again.'
      });
    }

    // Attach user info to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      termsAccepted: user.termsAccepted,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion
    };

    // Redirect to terms acceptance if terms not accepted (except for auth routes and terms acceptance page itself)
    const originalUrl = req.originalUrl || req.url;
    if (!user.termsAccepted &&
        !originalUrl.startsWith('/api/auth') &&
        !originalUrl.includes('/terms-acceptance') &&
        !originalUrl.includes('/terms-of-service') &&
        !originalUrl.includes('/privacy-policy')) {
      // For API requests, return unauthorized
      if (originalUrl.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          error: 'Terms & Conditions acceptance required. Please accept the terms to continue.'
        });
      }
      // For web requests, redirect to terms acceptance page
      return res.redirect('/terms-acceptance');
    }

    next();
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }

    logger.error('Auth Middleware: Authentication failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.'
    });
  }
}

/**
 * Middleware: Optional authentication
 * Attaches user info if token is present, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        companyId: decoded.companyId
      };
    }
    next();
  } catch (error) {
    // Token invalid or expired - continue without auth
    next();
  }
}

/**
 * Middleware: Role-based authorization
 * @param  {...string} allowedRoles - Roles that are allowed access
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.get('/sourcing', authenticate, authorize('procurement_manager', 'company_admin'), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    // Super admin bypasses role checks
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Auth Middleware: Access denied for user ${req.user.email} (${req.user.role}). Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. You do not have access to this resource.'
      });
    }

    next();
  };
}

/**
 * Middleware: Company scoping
 * Ensures user can only access data belonging to their company
 * Unless they're a super_admin
 */
function scopeToCompany(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  // Super admin can access any company's data
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Add companyId filter to request for downstream handlers
  req.companyId = req.user.companyId;

  // If requesting a specific company's data, verify ownership
  if (req.params.companyId && req.params.companyId !== req.user.companyId.toString()) {
    return res.status(403).json({
      success: false,
      error: 'You can only access data belonging to your company.'
    });
  }

  next();
}

/**
 * Middleware: Permission-based authorization
 * Checks if user has a specific permission for a domain action
 * @param {string} domain - Permission domain (sourcing, customization, logistics, analytics, admin)
 * @param {string} action - Action within domain (create, read, update, approve, delete)
 * @returns {Function} Express middleware
 */
function requirePermission(domain, action) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.'
        });
      }

      // Fetch user with permissions
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found.'
        });
      }

      if (!user.hasPermission(domain, action)) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions. You need '${action}' access to '${domain}'.`
        });
      }

      next();
    } catch (error) {
      logger.error('Auth Middleware: Permission check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed.'
      });
    }
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  scopeToCompany,
  requirePermission
};
