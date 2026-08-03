// Sentry wrapper
import * as Sentry from '@sentry/node';
import { env } from '../env';

if (!env.SENTRY_DSN) {
  throw new Error('Missing SENTRY_DSN env var');
}

// Initialize Sentry with Node.js backend
Sentry.init({
  dsn: env.SENTRY_DSN,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

export { Sentry };

// Usage:
// import { Sentry } from '../../src/lib/sentry';
// Sentry.captureException(new Error('Something went wrong'));