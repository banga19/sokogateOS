const { PostHog } = require('posthog-node');

let posthogInstance = null;

/**
 * Initialize and get the PostHog client instance.
 * @returns {PostHog} The PostHog client.
 */
function getPostHogClient() {
  if (!posthogInstance) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

    if (!apiKey) {
      console.warn('PostHog API key not found. Analytics will be disabled.');
      // Return a disabled client that does nothing
      posthogInstance = {
        capture: () => {},
        identify: () => {},
        shutdown: () => {},
      };
    } else {
      posthogInstance = new PostHog(apiKey, {
        host,
        // Optional: enable debug logging
        // enableDebug: true,
      });
    }
  }
  return posthogInstance;
}

module.exports = { getPostHogClient };