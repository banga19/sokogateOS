// PostHog wrapper
import posthog from 'posthog-js';
import { env } from '../env';

if (!env.POSTHOG_API_KEY) {
  throw new Error('Missing POSTHOG_API_KEY env var');
}

posthog.init(env.POSTHOG_API_KEY, {
  api_host: env.POSTHOG_HOST || 'https://app.posthog.com',
  capture_pageview: false,
});

export function track(event: string, props?: Record<string, any>) {
  posthog.capture(event, props);
}

// Usage: track('button_clicked', {button: 'save'});