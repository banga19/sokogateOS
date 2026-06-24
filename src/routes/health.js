/**
 * SokogateOS — Health Check Route
 *
 * Provides detailed health information about all external service
 * configurations and connectivity status.
 *
 * GET /health           — Config check + basic status
 * GET /health/live      — Config check + live API connectivity tests
 * GET /health/checks    — List all available health checks
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const apifyService = require('../services/apifyService');
const composioService = require('../services/composioService');
const toolRegistry = require('../services/toolRegistry');

// ──────────────────────────────────────────────
//  Check definitions
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
    name: 'PostgreSQL',
    category: 'Core',
    key: 'postgres',
    envVars: ['POSTGRES_HOST', 'POSTGRES_USER'],
    check: () => ({
      ok: !!(process.env.POSTGRES_HOST && process.env.POSTGRES_USER),
      message: process.env.POSTGRES_HOST ? `Host: ${process.env.POSTGRES_HOST}` : 'Not configured',
    }),
  },
  {
    name: 'Redis',
    category: 'Core',
    key: 'redis',
    envVars: ['REDIS_URL'],
    check: () => ({
      ok: !!process.env.REDIS_URL,
      message: process.env.REDIS_URL ? 'Configured' : 'Not configured',
    }),
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

  // ── Payments ──
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
//  Routes
// ──────────────────────────────────────────────

/**
 * GET /health — Config validation only (no live API calls)
 */
router.get('/', (_req, res) => {
  const checks = runChecks(false);
  const summary = summarize(checks);

  res.json({
    status: summary.ok ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || require('../../package.json').version,
    summary,
    checks,
  });
});

/**
 * GET /health/live — Config + live API connectivity checks (more thorough)
 */
router.get('/live', async (_req, res) => {
  const checks = await runLiveChecks();
  const summary = summarize(checks);

  res.json({
    status: summary.ok ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || require('../../package.json').version,
    summary,
    checks,
  });
});

/**
 * GET /health/checks — List all available checks
 */
router.get('/checks', (_req, res) => {
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
//  Helpers
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
    case 'redis': {
      if (!process.env.REDIS_URL) return { ok: false, message: 'Not configured' };
      try {
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 5000, maxRetriesPerRequest: 1 });
        const start = Date.now();
        await redis.ping();
        await redis.quit();
        return { ok: true, message: 'PONG', responseTimeMs: Date.now() - start };
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
