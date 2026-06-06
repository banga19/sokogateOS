// ABAC (Attribute-Based Access Control) Policy Engine for sokogateOS
// Implements fine-grained access control based on user, resource, and environmental attributes

const logger = require('../utils/logger');

/**
 * ABAC Policy Engine
 * Evaluates access requests based on attributes of:
 * - Subject (user making the request)
 * - Resource (object being accessed)
 * - Action (operation being performed)
 * - Environment (context of the request)
 */
class ABACPolicyEngine {
  constructor() {
    this.policies = [];
    this.logger = logger;
  }

  /**
   * Add a policy to the engine
   * @param {Object} policy - Policy definition
   * @param {string} policy.name - Policy name
   * @param {Function} policy.condition - Function that returns true/false for access
   * @param {string} policy.type - Policy type: 'allow' or 'deny' (default: 'allow')
   * @param {string} policy.description - Human-readable description
   */
  addPolicy(policy) {
    if (!policy.name || typeof policy.condition !== 'function') {
      throw new Error('Policy must have a name and condition function');
    }

    // Set default type if not provided
    if (!policy.type) {
      policy.type = 'allow';
    }

    this.policies.push(policy);
    this.logger.info(`ABAC Policy Engine: Added policy "${policy.name}" (type: ${policy.type})`);
  }

  /**
   * Evaluate if access should be granted based on policies
   * @param {Object} request - Access request context
   * @param {Object} request.subject - User attributes
   * @param {Object} request.resource - Resource attributes
   * @param {string} request.action - Action being performed
   * @param {Object} request.environment - Environmental attributes
   * @returns {boolean} - True if access granted, false otherwise
   */
  evaluate(request) {
    try {
      // Check if any policy explicitly denies access (deny policies override allow)
      for (const policy of this.policies) {
        if (policy.type === 'deny' && policy.condition(request)) {
          this.logger.warn(`ABAC Policy Engine: Access denied by policy "${policy.name}"`, {
            userId: request.subject.id,
            action: request.action,
            resource: request.resource && request.resource.id ? request.resource.id : 'unknown'
          });
          return false;
        }
      }

      // Check if any policy explicitly allows access
      for (const policy of this.policies) {
        if (policy.type === 'allow' && policy.condition(request)) {
          this.logger.info(`ABAC Policy Engine: Access granted by policy "${policy.name}"`, {
            userId: request.subject.id,
            action: request.action,
            resource: request.resource && request.resource.id ? request.resource.id : 'unknown'
          });
          return true;
        }
      }

      // Default deny if no policy matches
      this.logger.warn(`ABAC Policy Engine: Access denied - no matching policy`, {
        userId: request.subject.id,
        action: request.action,
        resource: request.resource && request.resource.id ? request.resource.id : 'unknown'
      });
      return false;
    } catch (error) {
      this.logger.error('ABAC Policy Engine: Evaluation error:', error);
      // Fail closed - deny access on error
      return false;
    }
  }

  /**
   * Clear all policies
   */
  clearPolicies() {
    this.policies = [];
    this.logger.info('ABAC Policy Engine: All policies cleared');
  }

  /**
   * Get all policies (for debugging/inspection)
   * @returns {Array} - Array of policies
   */
  getPolicies() {
    return [...this.policies];
  }
}

// Predefined attribute helpers
const ABACAttributes = {
  /**
   * Check if user has a specific role
   * @param {string} role - Required role
   * @returns {Function} - Condition function
   */
  hasRole: (role) => (request) => {
    return request.subject.role === role;
  },

  /**
   * Check if user belongs to a specific company
   * @param {string|ObjectId} companyId - Required company ID
   * @returns {Function} - Condition function
   */
  belongsToCompany: (companyId) => (request) => {
    return request.subject.companyId &&
           request.subject.companyId.toString() === companyId.toString();
  },

  /**
   * Check if user has a specific permission
   * @param {string} domain - Permission domain
   * @param {string} action - Action within domain
   * @returns {Function} - Condition function
   */
  hasPermission: (domain, action) => (request) => {
    // If user has permissions object, check it
    if (request.subject.permissions &&
        request.subject.permissions[domain] &&
        request.subject.permissions[domain][action] !== undefined) {
      return request.subject.permissions[domain][action] === true;
    }

    // Fallback to role-based defaults
    const rolePermissions = {
      company_admin: {
        sourcing: { approve: true },
        customization: { approve: true },
        analytics: { export: true },
        admin: { manageUsers: true, manageSettings: true }
      },
      procurement_manager: {
        sourcing: { approve: false },
        analytics: { export: false },
        admin: { manageUsers: false, manageSettings: false, manageBilling: false }
      },
      logistics_coordinator: {
        sourcing: { create: false, approve: false },
        customization: { create: false, approve: false },
        analytics: { export: false },
        admin: { manageUsers: false, manageSettings: false, manageBilling: false }
      },
      sales_team: {
        sourcing: { create: false, approve: false },
        logistics: { create: false, update: false },
        analytics: { export: false },
        admin: { manageUsers: false, manageSettings: false, manageBilling: false }
      },
      executive: {
        sourcing: { create: false, update: false, approve: false },
        customization: { create: false, update: false, approve: false },
        logistics: { create: false, update: false },
        admin: { manageUsers: false, manageSettings: false, manageBilling: false }
      },
      finance: {
        sourcing: { create: false, update: false, approve: false },
        customization: { create: false, update: false, approve: false },
        logistics: { create: false, update: false },
        admin: { manageUsers: false, manageSettings: false, manageBilling: false }
      }
    };

    const roleDefault = rolePermissions[request.subject.role]?.[domain]?.[action];
    if (roleDefault === true) return true;

    return false;
  },

  /**
   * Check if resource belongs to user's company
   * @returns {Function} - Condition function
   */
  resourceBelongsToUserCompany: (request) => {
    // Assuming resource has a companyId field
    if (!request.resource || !request.resource.companyId) return true; // No company restriction

    return request.subject.companyId &&
           request.resource.companyId.equals(request.subject.companyId);
  },

  /**
   * Check if action is allowed during business hours
   * @param {number} startHour - Start hour (0-23)
   * @param {number} endHour - End hour (0-23)
   * @returns {Function} - Condition function
   */
  duringBusinessHours: (startHour = 8, endHour = 18) => (request) => {
    const hour = new Date().getUTCHour(); // Using UTC for consistency
    return hour >= startHour && hour < endHour;
  },

  /**
   * Check if request comes from allowed IP range
   * @param {string[]} allowedIPs - Array of allowed IP addresses/ranges
   * @returns {Function} - Condition function
   */
  fromAllowedIP: (allowedIPs = []) => (request) => {
    if (!allowedIPs || allowedIPs.length === 0) return true; // No restriction
    const clientIP = request.environment?.ip;
    if (!clientIP) return false;
    return allowedIPs.some(ip => {
      if (ip.includes('/')) {
        // CIDR notation — basic prefix check
        const [range, bits] = ip.split('/');
        return clientIP.startsWith(range.substring(0, range.lastIndexOf('.') + 1));
      }
      return clientIP === ip;
    });
  }
};

module.exports = { ABACPolicyEngine, ABACAttributes };
