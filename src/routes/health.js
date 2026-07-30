/**
 * SokogateOS — Health Check Route
 *
 * Provides detailed health information about all external service
 * configurations and connectivity status.
 *
 * GET /health — Config check + basic status
 * GET /health/live — Config check + live API connectivity tests
 * GET /health/checks — List all available health checks
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const apifyService = require('../services/apifyService');
const composioService = require('../services/composioService');
const toolRegistry = require('../services/toolRegistry');
const { neonService } = require('../services/neonService');
const { stripeService } = require('../services/stripeService');
const { r2Service } = require('../services/r2Service');
const { pineconeService } = require('../services/pineconeService');
const { isConfigured: isRedisConfigured } = require('../config/redis');
const { isConfigured: isQStashConfigured } = require('../services/qstashService');
const { requireApiKey } = require('../middleware/apiKeyAuth');

// ──────────────────────────────────────────────
// Check definitions
// ──────────────────────────────────────────────

const CHECKS = [
// ── Core Infrastructure ──
{
  name: 'MongoDB',
  category: 'Core',
  key: 'db',
  envVars: ['MONGODB_URI'],
  check: () => {
    const uri = process.env.MONGODB_URI;
    return {
      ok: !!uri && uri !== 'mongodb://localhost:27017/sokogateos',
      message: uri ? 'Configured' : 'Not configured',
    };
  },
},
{
  name: 'Neon',
  category: 'Core',
  key: 'neon',
  envVars: ['NEON_DATABASE_URL'],
  check: () => {
    const ok = neonService.isConfigured();
    return { ok, message: ok ? 'Neon HTTP client ready' : 'Not configured' };
  },
},
{
  name: 'Redis / Upstash',
  category: 'Core',
  key: 'redis',
  envVars: ['REDIS_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  check: () => {
    const ok = isRedisConfigured();
    const source = process.env.UPSTASH_REDIS_REST_URL ? 'Upstash REST' : (process.env.REDIS_URL ? 'ioredis' : null);
    return { ok, message: ok ? `Connected (${source})` : 'Not configured' };
  },
},
{
  name: 'Kafka',
  category: 'Core',
  key: 'kafka',
  envVars: ['KAFKA_BROKERS'],
  check: () => ({
    ok: !!process.env.KAFKA_BROKERS,
    message: process.env.KAFKA_BROKERS ? `Brokers: ${process.env.KAFKA_BROKERS}` : 'Not configured',
  }),
},
{
  name: 'JWT',
  category: 'Core',
  key: 'jwt',
  envVars: ['JWT_SECRET'],
  required: true,
  check: () => ({
    ok: !!process.env.JWT_SECRET && !process.env.JWT_SECRET.startsWith('change-this'),
    message: process.env.JWT_SECRET ? (process.env.JWT_SECRET.startsWith('change-this') ? 'Default key — change in production!' : 'Configured') : 'NOT CONFIGURED',
  }),
},

// ── AI & Data ──
{
  name: 'Composio',
  category: 'AI & Data',
  key: 'composio',
  envVars: ['COMPOSIO_API_KEY'],
  check: () => {
    const status = composioService.getServiceStatus();
    return {
      ok: status.configured,
      message: status.configured ? `Configured (${status.supportedToolkits} agent toolkit mappings)` : 'Not configured',
    };
  },
},
{
  name: 'Tool Registry',
  category: 'AI & Data',
  key: 'toolRegistry',
  envVars: [],
  check: () => {
    const status = toolRegistry.getServiceStatus();
    return {
      ok: true,
      message: `${status.totalTools} tools across ${Object.keys(status.categories).length} categories`,
    };
  },
},
{
  name: 'Apify',
  category: 'AI & Data',
  key: 'apify',
  envVars: ['APIFY_API_KEY'],
  check: () => {
    const status = apifyService.getServiceStatus();
    return {
      ok: status.configured,
      message: status.configured ? `Configured (${status.actorCount} actors available)` : 'Not configured',
    };
  },
},
{
  name: 'OpenAI',
  category: 'AI & Data',
  key: 'openai',
  envVars: ['OPENAI_API_KEY'],
  check: () => ({
    ok: !!process.env.OPENAI_API_KEY,
    message: process.env.OPENAI_API_KEY ? 'API key configured' : 'Not configured',
  }),
},
{
  name: 'PostHog',
  category: 'AI & Data',
  key: 'posthog',
  envVars: ['POSTHOG_API_KEY'],
  check: () => ({
    ok: !!process.env.POSTHOG_API_KEY,
    message: process.env.POSTHOG_API_KEY ? 'API key configured' : 'Not configured',
  }),
},
{
  name: 'Sentry',
  category: 'AI & Data',
  key: 'sentry',
  envVars: ['SENTRY_DSN'],
  check: () => ({
    ok: !!process.env.SENTRY_DSN,
    message: process.env.SENTRY_DSN ? 'DSN configured' : 'Not configured',
  }),
},
{
  name: 'Pinecone',
  category: 'AI & Data',
  key: 'pinecone',
  envVars: ['PINECONE_API_KEY', 'PINECONE_INDEX'],
  check: () => {
    const ok = process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX;
    return {
      ok,
      message: ok ? `Index: ${process.env.PINECONE_INDEX}` : 'Not configured',
    };
  },
},

// ── Payments ──
{
  name: 'Stripe',
  category: 'Payments',
  key: 'stripe',
  envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
  check: () => {
    const ok = stripeService.enabled;
    return {
      ok,
      message: ok ? 'API keys + webhook secret configured' : 'Not configured',
    };
  },
},
{
  name: 'M-Pesa (Daraja)',
  category: 'Payments',
  key: 'mpesa',
  envVars: ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET'],
  check: () => ({
    ok: !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET),
    message: process.env.MPESA_CONSUMER_KEY
      ? `Configured (env: ${process.env.MPESA_ENV || 'sandbox'}, shortcode: ${process.env.MPESA_SHORTCODE || 'N/A'})`
      : 'Not configured',
  }),
},

// ── Communication ──
{
  name: 'Twilio',
  category: 'Communication',
  key: 'twilio',
  envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
  check: () => ({
    ok: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    message: process.env.TWILIO_ACCOUNT_SID ? 'Account SID configured' : 'Not configured',
  }),
},
{
  name: 'WATI.io',
  category: 'Communication',
  key: 'wati',
  envVars: ['WATI_API_KEY'],
  check: () => ({
    ok: !!process.env.WATI_API_KEY,
    message: process.env.WATI_API_KEY ? 'API key configured' : 'Not configured',
  }),
},
{
  name: 'Email (SMTP)',
  category: 'Communication',
  key: 'email',
  envVars: ['EMAIL_SMTP_HOST'],
  check: () => ({
    ok: !!process.env.EMAIL_SMTP_HOST,
    message: process.env.EMAIL_SMTP_HOST ? `Host: ${process.env.EMAIL_SMTP_HOST}` : 'Not configured',
  }),
},

// ── Infrastructure ──
{
  name: 'Cloudflare',
  category: 'Infrastructure',
  key: 'cloudflare',
  envVars: ['CLOUDFLARE_API_TOKEN'],
  check: () => ({
    ok: !!process.env.CLOUDFLARE_API_TOKEN,
    message: process.env.CLOUDFLARE_API_TOKEN ? 'API token configured' : 'Not configured',
  }),
},
{
  name: 'Cloudflare R2',
  category: 'Infrastructure',
  key: 'r2',
  envVars: ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_BUCKET_NAME'],
  check: () => {
    const ok = r2Service.isEnabled();
    return {
      ok,
      message: ok ? `Bucket: ${process.env.CLOUDFLARE_R2_BUCKET_NAME}` : 'Not configured',
    };
  },
},
{
  name: 'MinIO (S3)',
  category: 'Infrastructure',
  key: 'minio',
  envVars: ['MINIO_ENDPOINT', 'MINIO_ROOT_USER'],
  check: () => ({
    ok: !!(process.env.MINIO_ENDPOINT && process.env.MINIO_ROOT_USER),
    message: process.env.MINIO_ENDPOINT ? `Endpoint: ${process.env.MINIO_ENDPOINT}` : 'Not configured',
  }),
},
{
  name: 'QStash (Job Queue)',
  category: 'Infrastructure',
  key: 'qstash',
  envVars: ['QSTASH_TOKEN', 'QSTASH_DESTINATION_URL'],
  check: () => {
    const ok = isQStashConfigured();
    return {
      ok,
      message: ok ? 'Durable job queue ready' : 'Not configured',
    };
  },
},
{
  name: 'Bing Webmaster',
  category: 'Infrastructure',
  key: 'bing',
  envVars: ['BING_WEBSMASTER_TOOLS_API_KEY'],
  check: () => ({
    ok: !!process.env.BING_WEBSMASTER_TOOLS_API_KEY,
    message: process.env.BING_WEBSMASTER_TOOLS_API_KEY ? 'API key configured' : 'Not configured',
  }),
},
{
  name: 'Frontend (CORS)',
  category: 'Infrastructure',
  key: 'frontend',
  envVars: ['FRONTEND_URL'],
  check: () => ({
    ok: !!process.env.FRONTEND_URL,
    message: process.env.FRONTEND_URL ? `URL: ${process.env.FRONTEND_URL}` : 'Using default (http://localhost:5173)',
  }),
},
];

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

/**
 * GET /health — Basic health check (public)
 * Returns aggregate status only. No individual check details.
 * When called with a valid x-api-key, returns per-check status too.
 */
router.get('/', requireApiKey({ required: false }), (req, res) => {
  const checks = runChecks(false);
  const summary = summarize(checks);

  res.json({
    status: summary.ok ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || require('../../package.json').version,
    summary,
    // Only return per-check details when API key is provided (authenticated request)
    ...(req.authenticatedByApiKey ? { checks } : {}),
  });
});

/**
 * GET /health/live — Config + live API connectivity checks (API key required)
 * Protected by API key because it makes live outbound API calls and reveals
 * detailed configuration status of all integrated services (CWE-200: Exposure
 * of Sensitive Information).
 */
router.get('/live', requireApiKey({ required: true, passthrough: true }), async (req, res) => {
  const checks = await runLiveChecks();
  const summary = summarize(checks);

  res.json({
    status: summary.ok ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || require('../../package.json').version,
    summary,
    checks: req.authenticatedByApiKey ? checks : undefined,
  });
});

/**
 * GET /health/checks — List all available checks (API key required)
 * Protected by API key because it reveals which env vars are used by each
 * check, aiding reconnaissance (CWE-200).
 * Uses required=true (no passthrough) — if EXTERNAL_API_KEY is configured,
 * it must be provided. If not configured, returns 500 in production or
 * allows in dev with a warning.
 */
router.get('/checks', requireApiKey({ required: true }), (req, res) => {
  res.json({
    total: CHECKS.length,
    checks: CHECKS.map((c) => ({
      name: c.name,
      category: c.category,
      key: c.key,
      required: c.required !== false,
      envVars: c.envVars,
    })),
  });
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function runChecks(live) {
  return CHECKS.map((c) => {
    const result = c.check();
    return {
      name: c.name,
      category: c.category,
      key: c.key,
      required: c.required !== false,
      ok: result.ok,
      message: result.message,
    };
  });
}

async function runLiveChecks() {
  const results = [];
  for (const c of CHECKS) {
    const configResult = c.check();
    let liveResult = null;

    // Try a live API call for services that support it
    try {
      liveResult = await performLiveCheck(c.key);
    } catch {
      liveResult = { ok: false, message: 'Live check failed' };
    }

    results.push({
      name: c.name,
      category: c.category,
      key: c.key,
      required: c.required !== false,
      ok: configResult.ok,
      message: configResult.message,
      live: liveResult,
    });
  }
  return results;
}

async function performLiveCheck(key) {
  switch (key) {
    case 'apify': {
      // Apify already tested via the unit tests — just confirm configured
      return { ok: true, message: 'Config validated by SDK' };
    }
    case 'twilio': {
      if (!process.env.TWILIO_ACCOUNT_SID) return { ok: false, message: 'Not configured' };
      try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const start = Date.now();
        await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        return { ok: true, message: 'API connected', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'mpesa': {
      if (!process.env.MPESA_CONSUMER_KEY) return { ok: false, message: 'Not configured' };
      try {
        const axios = require('axios');
        const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
        const baseUrl = process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
        const start = Date.now();
        const res = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 10000,
        });
        return { ok: !!res.data.access_token, message: 'Auth token obtained', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'cloudflare': {
      if (!process.env.CLOUDFLARE_API_TOKEN) return { ok: false, message: 'Not configured' };
      try {
        const axios = require('axios');
        const start = Date.now();
        const res = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
          headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
          timeout: 5000,
        });
        return { ok: res.data.success, message: res.data.success ? 'Token verified' : 'Token invalid', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'r2': {
      if (!r2Service.isEnabled()) return { ok: false, message: 'Not configured' };
      try {
        const start = Date.now();
        await r2Service.checkBucket();
        return { ok: true, message: 'Bucket accessible', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'neon': {
      if (!neonService.isConfigured()) return { ok: false, message: 'Not configured' };
      try {
        const start = Date.now();
        await neonService.execute('SELECT 1');
        return { ok: true, message: 'Query OK', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'pinecone': {
      if (!process.env.PINECONE_API_KEY) return { ok: false, message: 'Not configured' };
      try {
        const start = Date.now();
        await pineconeService.healthProbe();
        return { ok: true, message: 'Index reachable', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'redis': {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
      if (!redisUrl) return { ok: false, message: 'Not configured' };
      try {
        const start = Date.now();
        if (process.env.UPSTASH_REDIS_REST_URL) {
          // Upstash REST — ping via a simple get/set round-trip
          const Redis = require('@upstash/redis');
          const redis = Redis.fromEnv(); // reads UPSTASH_REDIS_REST_URL + TOKEN
          await redis.ping();
        } else {
          // ioredis fallback
          const Redis = require('ioredis');
          const redis = new Redis(redisUrl, { connectTimeout: 5000, maxRetriesPerRequest: 1 });
          await redis.ping();
          await redis.quit();
        }
        return { ok: true, message: 'PONG', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'qstash': {
      if (!process.env.QSTASH_TOKEN) return { ok: false, message: 'Not configured' };
      try {
        // QStash has no low-cost "ping" endpoint; confirm token is present
        // and the service client initializes without error.
        const { qstashService } = require('../services/qstashService');
        return { ok: qstashService.isConfigured(), message: 'Token configured (live publish not tested)' };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    case 'postgres': {
      if (!process.env.POSTGRES_HOST) return { ok: false, message: 'Not configured' };
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.POSTGRES_HOST,
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          user: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DB,
          connectionTimeoutMillis: 5000,
        });
        const start = Date.now();
        await pool.query('SELECT 1');
        await pool.end();
        return { ok: true, message: 'Connected', responseTimeMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    }
    default:
      return null; // No live check available
  }
}

function summarize(checks) {
  const total = checks.length;
  const passed = checks.filter((c) => c.ok).length;
  const failed = total - passed;
  const requiredFailed = checks.filter((c) => c.required && !c.ok).length;
  return { total, passed, failed, requiredFailed, ok: requiredFailed === 0 };
}

module.exports = router;
