// Subscription & Hermes Access Middleware for sokogateOS
// Provides subscription-based access control and Hermes agent access gating

const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * Middleware: Subscription tier authorization
 * Checks if user's subscription tier is in the allowed tiers
 * @param  {...string} allowedTiers - Subscription tiers that are allowed access
 * @returns {Function} Express middleware
 */
function requireSubscription(...allowedTiers) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }

      // Fetch user with subscription details
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found.',
        });
      }

      // Super admin bypasses subscription checks
      if (user.role === 'super_admin') {
        return next();
      }

      // Check if user's subscription tier is allowed
      if (!allowedTiers.includes(user.subscription_tier)) {
        logger.warn(
          `Subscription Middleware: Access denied for user ${user.email} (tier: ${user.subscription_tier}). Required: ${allowedTiers.join(', ')}`
        );
        return res.status(403).json({
          success: false,
          error: `Insufficient subscription level. Required: ${allowedTiers.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      logger.error('Subscription Middleware: Subscription check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Subscription verification failed.',
      });
    }
  };
}

/**
 * Middleware: Active subscription check
 * Ensures user has an active subscription (not cancelled/past due/unpaid)
 * @returns {Function} Express middleware
 */
function requireActiveSubscription() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }

      // Fetch user with subscription details
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found.',
        });
      }

      // Super admin bypasses subscription checks
      if (user.role === 'super_admin') {
        return next();
      }

      // Check if subscription is active
      if (user.subscriptionStatus !== 'active') {
        logger.warn(
          `Subscription Middleware: Inactive subscription for user ${user.email} (status: ${user.subscriptionStatus})`
        );
        return res.status(403).json({
          success: false,
          error: 'Active subscription required.',
        });
      }

      next();
    } catch (error) {
      logger.error('Subscription Middleware: Active subscription check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Subscription verification failed.',
      });
    }
  };
}

/**
 * Middleware: Hermes agent access control
 * Combines subscription and role checks:
 * - Super admin always allowed
 * - Otherwise requires active subscription AND tier in ['pro', 'enterprise']
 * @returns {Function} Express middleware
 */
function hermesAccess() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }

      // Fetch user with subscription details
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found.',
        });
      }

      // Super admin always has access
      if (user.role === 'super_admin') {
        return next();
      }

      // Check for active subscription and allowed tiers
      const allowedTiers = ['pro', 'enterprise'];
      if (user.subscriptionStatus !== 'active' || !allowedTiers.includes(user.subscription_tier)) {
        logger.warn(
          `Hermes Access: Denied for user ${user.email} (role: ${user.role}, tier: ${user.subscription_tier}, status: ${user.subscriptionStatus})`
        );
        return res.status(403).json({
          success: false,
          error: 'Hermes agent access requires active Pro or Enterprise subscription.',
        });
      }

      next();
    } catch (error) {
      logger.error('Hermes Access Middleware: Access check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Access verification failed.',
      });
    }
  };
}

module.exports = {
  requireSubscription,
  requireActiveSubscription,
  hermesAccess,
};
