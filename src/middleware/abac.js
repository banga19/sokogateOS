// ABAC Middleware for sokogateOS
// Integrates Attribute-Based Access Control with existing authentication system

const { ABACPolicyEngine } = require('../abac/policyEngine');
const logger = require('../utils/logger');

// Initialize ABAC policy engine
const abacEngine = new ABACPolicyEngine();

// Load default policies
function loadDefaultPolicies() {
  // Policy: Super admins can do anything
  abacEngine.addPolicy({
    name: 'super_admin_full_access',
    type: 'allow',
    condition: (request) => request.subject.role === 'super_admin',
    description: 'Super admins have full access to all resources'
  });

  // Policy: Users must accept terms to access most resources
  abacEngine.addPolicy({
    name: 'terms_required',
    type: 'allow',
    condition: (request) => request.subject.termsAccepted === true,
    description: 'Users must accept Terms & Conditions to access system'
  });

  // Policy: Users must be active
  abacEngine.addPolicy({
    name: 'active_user_required',
    type: 'allow',
    condition: (request) => request.subject.isActive === true,
    description: 'Only active users can access the system'
  });

  // Policy: Company scoping - users can only access their own company's data
  abacEngine.addPolicy({
    name: 'company_scoping',
    type: 'allow',
    condition: (request) => {
      // Super admins bypass company scoping
      if (request.subject.role === 'super_admin') return true;

      // If no company restriction on resource, allow
      if (!request.resource || !request.resource.companyId) return true;

      // Check if resource belongs to user's company
      // Safely compare regardless of string vs ObjectId type
      if (!request.subject.companyId) return false;
      const resCompany = request.resource.companyId;
      const subCompany = request.subject.companyId;
      // Handle both ObjectId (.equals) and string comparison
      if (typeof resCompany === 'object' && typeof resCompany.equals === 'function') {
        return resCompany.equals(subCompany);
      }
      return resCompany.toString() === subCompany.toString();
    },
    description: 'Users can only access data belonging to their company'
  });

  // Policy: Permission-based access for specific domains
  abacEngine.addPolicy({
    name: 'sourcing_create',
    type: 'allow',
    condition: (request) => {
      return request.subject.role === 'super_admin' ||
             request.subject.role === 'company_admin' ||
             (request.subject.role === 'procurement_manager' &&
              request.subject.permissions?.sourcing?.create === true);
    },
    description: 'Allow sourcing creation for appropriate roles'
  });

  abacEngine.addPolicy({
    name: 'sourcing_approve',
    type: 'allow',
    condition: (request) => {
      return request.subject.role === 'super_admin' ||
             request.subject.role === 'company_admin' ||
             (request.subject.role === 'procurement_manager' &&
              request.subject.permissions?.sourcing?.approve === true);
    },
    description: 'Allow sourcing approval for appropriate roles'
  });

  abacEngine.addPolicy({
    name: 'logistics_track',
    type: 'allow',
    condition: (request) => {
      return request.subject.role === 'super_admin' ||
             request.subject.role === 'company_admin' ||
             request.subject.role === 'logistics_coordinator' ||
             request.subject.role === 'procurement_manager' ||
             (request.subject.permissions?.logistics?.track === true);
    },
    description: 'Allow logistics tracking for appropriate roles'
  });

  abacEngine.addPolicy({
    name: 'analytics_export',
    type: 'allow',
    condition: (request) => {
      return request.subject.role === 'super_admin' ||
             request.subject.role === 'company_admin' ||
             (request.subject.role === 'procurement_manager' &&
              request.subject.permissions?.analytics?.export === true) ||
             (request.subject.permissions?.admin?.manageSettings === true);
    },
    description: 'Allow analytics export for appropriate roles'
  });

  logger.info('ABAC Middleware: Default policies loaded');
}

// Load policies on module initialization
loadDefaultPolicies();

/**
 * Middleware: ABAC authorization
 * Evaluates access requests using Attribute-Based Access Control
 * @param {Object} options - Configuration options
 * @param {string} options.action - Action being performed (required)
 * @param {string} options.domain - Permission domain (optional)
 * @param {boolean} options.allowSuperAdminBypass - Whether to allow super admin bypass (default: true)
 * @returns {Function} Express middleware
 */
function abacAuthorize(options = {}) {
  const { action, domain, allowSuperAdminBypass = true } = options;

  if (!action) {
    throw new Error('ABAC authorization requires an action parameter');
  }

  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.'
        });
      }

      // Super admin bypass (if enabled)
      if (allowSuperAdminBypass && req.user.role === 'super_admin') {
        return next();
      }

      // Build ABAC request context — explicitly pick attributes, never spread raw headers
      // SECURITY: companyId is taken from URL params ONLY, never from body/query params
      // to prevent company spoofing attacks (CWE-285: Improper Authorization)
      const trustedCompanyId = req.params.companyId || null;

      const abacRequest = {
        subject: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          companyId: req.user.companyId,
          isActive: req.user.isActive || true,
          termsAccepted: req.user.termsAccepted || false,
          permissions: req.user.permissions || {}
        },
        resource: {
          id: req.params.id || null,
          companyId: trustedCompanyId
        },
        action: action,
        environment: {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      };

      // Add known safe, non-sensitive body fields if present
      if (req.body && typeof req.body === 'object') {
        const safeResourceFields = ['name', 'description', 'businessType', 'productCategory', 'area'];
        for (const field of safeResourceFields) {
          if (req.body[field] !== undefined) {
            abacRequest.resource[field] = req.body[field];
          }
        }
      }

      // Evaluate access using ABAC engine
      const accessGranted = abacEngine.evaluate(abacRequest);

      if (!accessGranted) {
        logger.warn(`ABAC Middleware: Access denied for user ${req.user.email}`, {
          userId: req.user.id,
          action: action,
          domain: domain,
          resourceId: abacRequest.resource.id
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions. You do not have access to perform this action.'
        });
      }

      logger.info(`ABAC Middleware: Access granted for user ${req.user.email}`, {
        userId: req.user.id,
        action: action,
        domain: domain,
        resourceId: abacRequest.resource.id
      });

      next();
    } catch (error) {
      logger.error('ABAC Middleware: Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed.'
      });
    }
  };
}

/**
 * Middleware: ABAC permission checker
 * Checks if user has specific permission for domain/action combination
 * @param {string} domain - Permission domain
 * @param {string} action - Action within domain
 * @returns {Function} Express middleware
 */
function abacRequirePermission(domain, action) {
  if (!domain || !action) {
    throw new Error('ABAC permission checker requires domain and action parameters');
  }

  return abacAuthorize({
    action: action,
    domain: domain
  });
}

/**
 * Get ABAC policy engine instance (for testing/debugging)
 * @returns {ABACPolicyEngine} - The ABAC policy engine instance
 */
function getABACEngine() {
  return abacEngine;
}

module.exports = {
  abacAuthorize,
  abacRequirePermission,
  getABACEngine
};
