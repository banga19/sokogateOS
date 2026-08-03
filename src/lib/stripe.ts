// Stripe wrapper
import Stripe from 'stripe';
import { env } from '../env';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY env var');
}

export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-31' });

export async function createCheckoutSession(opts: {customerEmail: string; priceId: string; successUrl?: string; cancelUrl?: string;}) {
  const session = await stripeClient.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{price: opts.priceId, quantity: 1}],
    customer_email: opts.customerEmail,
    success_url: opts.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: opts.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/cancel`,
  });
  return session;
}

// Usage:
// const session = await createCheckoutSession({customerEmail: 'user@example.com', priceId: 'price_123'});