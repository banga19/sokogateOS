// Billing routes for sokogateOS
// Subscription management — integrated with Stripe

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { stripeService } = require('../services/stripeService');
const User = require('../models/user');

/**
 * @route GET /api/billing/plans
 * @description Get available subscription plans
 * @access Public
 */
router.get('/plans', (req, res) => {
  const plans = stripeService.getPlans();
  res.json({ success: true, data: plans });
});

/**
 * @route GET /api/billing/subscription
 * @description Get current user's subscription details from Stripe / DB
 * @access Private
 */
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('stripeCustomerId subscriptionStatus subscription_tier subscriptionStartDate subscriptionEndDate');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // If Stripe is enabled and we have a customerId, fetch live subscription details
    let stripeSubscription = null;
    if (stripeService.enabled && user.stripeCustomerId) {
      const appUser = req.user; // auth middleware may have attached app-level fields
      if (appUser?.subscriptionId) {
        stripeSubscription = await stripeService.getSubscription(appUser.subscriptionId);
      }
    }

    res.json({
      success: true,
      data: {
        tier: user.subscription_tier || 'free',
        status: user.subscriptionStatus || 'free',
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        customerId: user.stripeCustomerId || null,
        subscriptionId: appUser?.subscriptionId || null,
        stripe: stripeSubscription,
      },
    });
  } catch (error) {
    logger.error('Billing: Get subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

/**
 * @route POST /api/billing/subscription
 * @description Create or update the user's subscription via Stripe Checkout
 * @access Private
 */
router.post('/subscription', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tier, priceId } = req.body;

    if (!['free', 'pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Invalid subscription tier' });
    }

    if (tier === 'free') {
      // Downgrade to free — cancel any existing subscription
      const user = await User.findById(userId).select('stripeCustomerId subscriptionId');
      if (user?.subscriptionId && stripeService.enabled) {
        await stripeService.cancelSubscription(user.subscriptionId);
      }
      await User.findByIdAndUpdate(userId, {
        subscription_tier: 'free',
        subscriptionStatus: 'free',
        subscriptionEndDate: null,
      });
      return res.json({ success: true, message: 'Subscription downgraded to Free', data: { tier: 'free', status: 'free' } });
    }

    if (!stripeService.enabled) {
      return res.status(503).json({ success: false, error: 'Payments are not currently configured' });
    }

    // Find or create Stripe customer
    const user = await User.findById(userId).select('stripeCustomerId email name');
    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      customerId = await stripeService.getOrCreateCustomer({
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
      });
      await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    // Resolve priceId from tier if not provided
    const resolvedPriceId = priceId || stripeService.getPriceIdForTier(tier);
    if (!resolvedPriceId) {
      return res.status(400).json({ success: false, error: `No price configured for tier: ${tier}` });
    }

    // Create a Stripe Checkout session
    const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripeService.createCheckoutSession({
      customerId,
      priceId: resolvedPriceId,
      mode: 'subscription',
      successUrl: `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/billing?cancelled=true`,
      metadata: { userId: user._id.toString(), tier },
    });

    return res.json({
      success: true,
      message: 'Checkout session created',
      data: { checkoutUrl: session.url, sessionId: session.id },
    });
  } catch (error) {
    logger.error('Billing: Create/update subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

/**
 * @route POST /api/billing/cancel
 * @description Cancel the user's active subscription via Stripe
 * @access Private
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('stripeCustomerId subscriptionId');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!stripeService.enabled) {
      return res.status(503).json({ success: false, error: 'Payments are not currently configured' });
    }

    if (!user.subscriptionId) {
      return res.status(400).json({ success: false, error: 'No active subscription found' });
    }

    const subscription = await stripeService.cancelSubscription(user.subscriptionId);
    await User.findByIdAndUpdate(req.user.id, {
      subscriptionStatus: 'cancelling',
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    });

    res.json({ success: true, message: 'Subscription cancelled — access remains until period end', data: { status: 'cancelling', endsAt: subscription.current_period_end } });
  } catch (error) {
    logger.error('Billing: Cancel subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

/**
 * @route POST /api/billing/webhook
 * @description Handle Stripe webhooks (signature-verified)
 * @access Public (Stripe will call this — must use raw body)
 */
// IMPORTANT: express.json() global middleware mangles the body.
// Mount this route BEFORE JSON parsing, or use express.raw({ type: 'application/json' })
// on this specific path.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripeService.enabled || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook handler not configured' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;
  try {
    event = stripeService.verifyWebhookSignature(signature, req.body);
  } catch (err) {
    logger.warn('Billing: Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await stripeService.handleWebhookEvent(event, async (payload) => {
      // Map Stripe event data to user record updates
      switch (payload.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = payload.data.object;
          const status = sub.status;
          const userId = payload.data?.previous_values?.metadata?.userId || sub.metadata?.userId;
          const tier = sub.metadata?.tier || 'pro';

          const update = {
            subscriptionStatus: status,
            subscription_tier: tier,
            subscriptionId: sub.id,
            subscriptionStartDate: new Date(sub.current_period_start * 1000),
            subscriptionEndDate: new Date(sub.current_period_end * 1000),
          };

          if (userId) {
            await User.findByIdAndUpdate(userId, update);
            logger.info(`Billing: Subscription updated for user ${userId} → ${tier}/${status}`);
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = payload.data.object;
          const userId = sub.metadata?.userId;
          if (userId) {
            await User.findByIdAndUpdate(userId, {
              subscriptionStatus: 'cancelled',
              subscription_tier: 'free',
              subscriptionEndDate: new Date(sub.current_period_end * 1000),
            });
            logger.info(`Billing: Subscription cancelled for user ${userId}`);
          }
          break;
        }
        case 'checkout.session.completed': {
          const session = payload.data.object;
          const userId = session.metadata?.userId;
          if (userId && session.subscription) {
            await User.findByIdAndUpdate(userId, {
              stripeCustomerId: session.customer,
              subscriptionId: session.subscription,
            });
            logger.info(`Billing: Checkout completed for user ${userId}`);
          }
          break;
        }
        default:
          logger.debug(`Billing: Unhandled webhook event type: ${payload.type}`);
      }
    });

    res.json({ received: true, type: event.type });
  } catch (err) {
    logger.error('Billing: Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
