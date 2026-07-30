'use strict';

const Stripe = require('stripe');
const logger = require('../utils/logger');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const STRIPE_PRICE_PRO_ID = process.env.STRIPE_PRICE_PRO_ID;
const STRIPE_PRICE_ENTERPRISE_ID = process.env.STRIPE_PRICE_ENTERPRISE_ID;

class StripeService {
  constructor() {
    this.enabled =
      Boolean(STRIPE_SECRET_KEY) &&
      !STRIPE_SECRET_KEY.startsWith('sk_test_change') &&
      !STRIPE_SECRET_KEY.startsWith('sk_test_1234'); // placeholder guard
    this.client = null;
    this.webhookSecret = null;

    if (this.enabled) {
      try {
        this.client = Stripe(STRIPE_SECRET_KEY, {
          apiVersion: '2024-12-18.acacia',
        });
        this.webhookSecret = STRIPE_WEBHOOK_SECRET;
        logger.info('StripeService: Initialized (valid secret key detected)');
      } catch (err) {
        logger.error('StripeService: Failed to init Stripe client:', err.message);
        this.enabled = false;
      }
    } else {
      logger.info('StripeService: Not configured (missing or placeholder secret key)');
    }
  }

  // ── Status ──────────────────────────────────────────────────────

  getStatus() {
    return {
      enabled: this.enabled,
      secretKeyConfigured: Boolean(STRIPE_SECRET_KEY),
      webhookSecretConfigured: Boolean(this.webhookSecret),
      publishableKeyConfigured: Boolean(STRIPE_PUBLISHABLE_KEY),
    };
  }

  // ── Customers ───────────────────────────────────────────────────

  /**
   * Find or create a Stripe Customer by email.
   * @param {string} userId - Internal user ID (stored as metadata)
   * @param {string} email
   * @param {string} [name]
   * @returns {Promise<Object>} Stripe Customer
   */
  async getOrCreateCustomer(userId, email, name) {
    if (!this.enabled) throw new Error('Stripe service is not configured');
    const existing = await this.client.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) return existing.data[0];
    return this.client.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  /**
   * Patch a Stripe Customer's metadata.
   * @param {string} customerId
   * @param {Object} metadata
   * @returns {Promise<Object>} Updated Customer
   */
  async updateCustomerMetadata(customerId, metadata) {
    if (!this.enabled) throw new Error('Stripe service is not configured');
    return this.client.customers.update(customerId, { metadata });
  }

  // ── Checkout Sessions ───────────────────────────────────────────

  /**
   * Create a Stripe Checkout Session.
   * @param {Object} opts
   * @param {string} opts.userId
   * @param {string} opts.email
   * @param {string} [opts.name]
   * @param {string} opts.priceId
   * @param {'subscription'|'payment'} [opts.mode='subscription']
   * @param {string} [opts.successUrl]
   * @param {string} [opts.cancelUrl]
   * @returns {Promise<Object>} Checkout Session
   */
  async createCheckoutSession({
    userId,
    email,
    name,
    priceId,
    mode = 'subscription',
    successUrl,
    cancelUrl,
  }) {
    if (!this.enabled) throw new Error('Stripe service is not configured');
    const customer = await this.getOrCreateCustomer(userId, email, name);
    const baseSuccess =
      successUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const baseCancel =
      cancelUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/billing/cancel`;

    return this.client.checkout.sessions.create({
      customer: customer.id,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: baseSuccess,
      cancel_url: baseCancel,
      metadata: { userId },
    });
  }

  async getCheckoutSession(sessionId) {
    if (!this.enabled) throw new Error('Stripe service is not configured');
    return this.client.checkout.sessions.retrieve(sessionId);
  }

  // ── Subscriptions ───────────────────────────────────────────────

  async createSubscription(customerId, priceId) {
    if (!this.enabled) throw new Error('Stripe service is not configured');
    return this.client.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
    });
  }

  async cancelSubscription(subscriptionId, immediate = false) {
    if (!this.enabled) throw new Error('Stripe service is not configured');
    if (immediate) {
      return this.client.subscriptions.cancel(subscriptionId);
    }
    return this.client.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async getSubscription(subscriptionId) {
    if (!this.enabled) throw new Error('Stripe service is not configured');
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  // ── Webhooks ────────────────────────────────────────────────────

  /**
   * Verify a Stripe webhook signature.
   * IMPORTANT: The Express route must use `express.raw({ type: 'application/json' })`
   * before body-parser so the raw bytes reach this method.
   *
   * @param {Buffer} rawBody
   * @param {string} signatureHeader
   * @returns {import('stripe').Stripe.Event}
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.enabled || !this.webhookSecret) {
      throw new Error('Stripe webhook signature verification not configured');
    }
    return this.client.webhooks.constructEvent(
      rawBody,
      signatureHeader,
      this.webhookSecret,
    );
  }

  /**
   * Handle a verified Stripe webhook event.
   * @param {import('stripe').Stripe.Event} event
   */
  async handleWebhookEvent(event) {
    const type = event.type;
    const sub = event.data.object;

    switch (type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const userId = sub.metadata?.userId;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = this._priceIdToTier(priceId);
        const status = sub.status;
        logger.info(
          `Stripe webhook ${type}: userId=${userId} tier=${tier} status=${status}`,
        );
        // TODO: persist tier/status to user model
        break;
      }
      case 'customer.subscription.deleted': {
        const userId = sub.metadata?.userId;
        logger.info(`Stripe webhook subscription.deleted: userId=${userId}`);
        // TODO: downgrade user to free tier
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        logger.info(
          `Stripe webhook checkout.completed: sessionId=${session.id} customerId=${session.customer}`,
        );
        // TODO: persist stripeSubscriptionId to user model
        break;
      }
      default:
        logger.info(`Stripe webhook: unhandled event type ${type}`);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  getPublishableKey() {
    return STRIPE_PUBLISHABLE_KEY || null;
  }

  /**
   * Map a Stripe price ID to a tier slug.
   */
  _priceIdToTier(priceId) {
    if (!priceId) return 'free';
    const slug = priceId.toLowerCase();
    if (slug.includes('enterprise')) return 'enterprise';
    if (slug.includes('pro')) return 'pro';
    return 'free';
  }
}

const stripeService = new StripeService();

module.exports = { stripeService, StripeService };
