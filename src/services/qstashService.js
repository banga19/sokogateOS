'use strict';

let qstashClient = null;
let isInitialized = false;

/**
 * Lazy initialise the QStash client when QSTASH_TOKEN is set.
 */
function initialize() {
  if (isInitialized) return;
  isInitialized = true;
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    logger.info('QStash: disabled (QSTASH_TOKEN not set)');
    return;
  }
  try {
    const { Client } = require('@upstash/qstash');
    qstashClient = new Client({ token });
    logger.info('QStash: client initialised');
  } catch (err) {
    logger.warn(`QStash: failed to initialise client (${err.message})`);
    qstashClient = null;
  }
}

/**
 * Publish a message to QStash.
 * @param {Object} payload
 * @param {{ url?: string, delay?: string|number, method?: string }} [opts]
 * @returns {Promise<Object>}
 */
async function publish(payload, opts = {}) {
  initialize();
  if (!qstashClient) {
    throw new Error('QStash is not configured — set QSTASH_TOKEN');
  }
  const url = opts.url || process.env.QSTASH_DESTINATION_URL;
  if (!url) {
    throw new Error('QStash destination URL required (provide opts.url or QSTASH_DESTINATION_URL)');
  }
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  const call = qstashClient.publishJSON({
    url,
    body,
    method: opts.method || 'POST',
    delay: opts.delay,
  });

  // SDK returns either a string messageId or { messageId } depending on version.
  return call;
}

/**
 * Verify an incoming QStash webhook signature.
 * @param {string} signature - Signature header value
 * @param {string} rawBody - Raw request body
 * @returns {boolean}
 */
function verifySignature(signature, rawBody) {
  initialize();
  if (!qstashClient) return false;

  try {
    const { verify } = require('@upstash/qstash');
    const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const next = process.env.QSTASH_NEXT_SIGNING_KEY;
    return verify({ signature, body: rawBody, currentSigningKey: current, nextSigningKey: next });
  } catch (err) {
    logger.warn(`QStash: signature verification error (${err.message})`);
    return false;
  }
}

/**
 * @returns {boolean}
 */
function isConfigured() {
  initialize();
  return !!qstashClient;
}

module.exports = {
  publish,
  verifySignature,
  isConfigured,
};
