// Billing routes for sokogateOS
// Subscription management endpoints

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route GET /api/billing/plans
 * @description Get available subscription plans
 * @access Public
 */
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'free', name: 'Free', price: 0, features: ['basic access', 'community support'] },
      {
        id: 'pro',
        name: 'Pro',
        price: 29,
        features: ['Hermes agent access', 'advanced analytics', 'priority support'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99,
        features: ['all Pro features', 'dedicated support', 'custom integrations', 'SLA'],
      },
    ],
  });
});

/**
 * @route GET /api/billing/subscription
 * @description Get current user's subscription details
 * @access Private
 */
router.get('/subscription', authenticate, async (req, res) => {
  try {
    // In a real implementation, we would fetch from the user model
    // For now, we return data from the authenticated user (populated by auth middleware)
    const user = req.user; // This is populated by the authenticate middleware

    // If we need to fetch fresh data from DB, we could do:
    // const User = require('../models/user');
    // const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        tier: user.subscription_tier || 'free',
        status: user.subscriptionStatus || 'free',
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        customerId: user.stripeCustomerId || null,
      },
    });
  } catch (error) {
    logger.error('Billing: Get subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

/**
 * @route POST /api/billing/subscription
 * @description Update user's subscription (stub - would integrate with Stripe in production)
 * @access Private
 */
router.post('/subscription', authenticate, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier || !['free', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription tier' });
    }

    // In a real implementation:
    // 1. Validate the user's current subscription
    // 2. Create/update Stripe subscription
    // 3. Update user document with new tier/status/dates/customerId
    // 4. Handle proration, etc.

    // For now, we'll just update the user object in memory (not persisted)
    // TODO: Implement actual persistence

    req.user.subscription_tier = tier;
    req.user.subscriptionStatus = tier === 'free' ? 'free' : 'active';
    // In reality, we'd set proper dates and customerId from Stripe

    res.json({
      success: true,
      message: `Subscription updated to ${tier}`,
      data: {
        tier: tier,
        status: tier === 'free' ? 'free' : 'active',
      },
    });
  } catch (error) {
    logger.error('Billing: Update subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

/**
 * @route POST /api/billing/cancel
 * @description Cancel user's subscription (stub)
 * @access Private
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    // In a real implementation:
    // 1. Cancel Stripe subscription
    // 2. Update user document with cancellation date/status
    // 3. Handle proration/refunds if applicable

    // For now, just update in memory
    req.user.subscription_tier = 'free';
    req.user.subscriptionStatus = 'cancelled';
    // In reality, we'd set proper dates from Stripe

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        tier: 'free',
        status: 'cancelled',
      },
    });
  } catch (error) {
    logger.error('Billing: Cancel subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

/**
 * @route POST /api/billing/webhook
 * @description Handle Stripe webhooks (stub)
 * @access Public (Stripe will call this)
 */
router.post('/webhook', (req, res) => {
  // In production, we would:
  // 1. Verify the webhook signature
  // 2. Parse the event
  // 3. Handle subscription events (created, updated, deleted, etc.)
  // 4. Update user records accordingly

  // For now, just acknowledge receipt
  res.json({ received: true });
});

module.exports = router;
