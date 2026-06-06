// Analytics Tracking Middleware for sokogateOS
// Tracks user sign-ups, activations, and retention metrics

const logger = require('../../utils/logger');
const User = require('../../models/user');
const Feedback = require('../../models/feedback');

/**
 * Track user sign-up event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function trackSignUp(req, res, next) {
  try {
    // This middleware should be placed after user creation
    // It tracks when a new user signs up

    if (req.user && req.user.id) {
      // Track sign-up in analytics
      logger.info(`User sign-up tracked: ${req.user.email}`, {
        userId: req.user.id,
        email: req.user.email,
        timestamp: new Date().toISOString()
      });

      // Optionally store in analytics collection or send to external analytics service
      // For now, we'll log it and could extend to store in database later

      // Add sign-up tracking header for frontend consumption
      res.setHeader('X-Analytics-Signup', 'tracked');
    }

    next();
  } catch (error) {
    logger.error('Error tracking sign-up:', error);
    next(); // Continue even if tracking fails
  }
}

/**
 * Track user activation event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function trackActivation(req, res, next) {
  try {
    // This middleware should be placed after user activation (email verification, etc.)

    if (req.user && req.user.id && req.user.isEmailVerified) {
      // Track activation in analytics
      logger.info(`User activation tracked: ${req.user.email}`, {
        userId: req.user.id,
        email: req.user.email,
        timestamp: new Date().toISOString()
      });

      res.setHeader('X-Analytics-Activation', 'tracked');
    }

    next();
  } catch (error) {
    logger.error('Error tracking activation:', error);
    next();
  }
}

/**
 * Track user retention/engagement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function trackEngagement(req, res, next) {
  try {
    // Track general user engagement for retention metrics

    if (req.user && req.user.id) {
      // Log engagement with context about what endpoint/resource was accessed
      logger.debug(`User engagement tracked: ${req.user.email}`, {
        userId: req.user.id,
        email: req.user.email,
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      // In a production system, you might want to store this in a time-series database
      // or send to external analytics platforms like Google Analytics, Mixpanel, etc.
    }

    next();
  } catch (error) {
    logger.error('Error tracking engagement:', error);
    next();
  }
}

/**
 * Get retention metrics for a company
 * @param {string} companyId - Company ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Retention metrics
 */
async function getRetentionMetrics(companyId, options = {}) {
  try {
    const {
      startDate,
      endDate,
      period = 'monthly' // daily, weekly, monthly
    } = options;

    // In a real implementation, this would query analytics events stored in database
    // For now, we'll return mock data structure showing what should be tracked

    const metrics = {
      companyId,
      period: {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: endDate || new Date()
      },
      signUps: {
        total: 0, // Would be actual count from analytics table
        daily: [],
        weekly: [],
        monthly: []
      },
      activations: {
        total: 0, // Would be actual count of email-verified users
        rate: 0 // Percentage of sign-ups that activate
      },
      retention: {
        day1: 0, // Percentage of users active 1 day after sign-up
        day7: 0, // Percentage of users active 7 days after sign-up
        day30: 0 // Percentage of users active 30 days after sign-up
      },
      engagement: {
        avgSessionLength: 0, // Average session length in minutes
        sessionsPerUser: 0, // Average sessions per user
        featuresUsed: {} // Which features are being used
      }
    };

    return metrics;
  } catch (error) {
    logger.error('Error getting retention metrics:', error);
    throw error;
  }
}

module.exports = {
  trackSignUp,
  trackActivation,
  trackEngagement,
  getRetentionMetrics
};