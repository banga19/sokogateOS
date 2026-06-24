#!/usr/bin/env node
/**
 * SokogateOS — Health Check Script
 *
 * Usage:
 *   node scripts/health-check.js            # Config-only check (no API calls)
 *   node scripts/health-check.js --live      # Config check + live API calls
 *   node scripts/health-check.js --json      # Output as JSON
 *   node scripts/health-check.js --help      # Show help
 *
 * Checks all external service configurations and optionally verifies
 * connectivity by making live API calls.
 */

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
//  Bootstrap .env
// ──────────────────────────────────────────────
function loadEnv() {
  // Try loading .env from the project root or CWD
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// ──────────────────────────────────────────────
//  Check definitions
// ──────────────────────────────────────────────

/**
 * A check is an object:
 *   { name, category, envVars, check(config) → status, liveCheck(config) → status }
 *   status: { ok, required, message, responseTime? }
 */
const CHECKS = [
  // ── Core Infrastructure ──
  {
    name: 'MongoDB',
    category: 'Core',
    envVars: ['MONGODB_URI'],
    check: (cfg) => ({
      ok: !!cfg.MONGODB_URI && cfg.MONGODB_URI !== 'mongodb://localhost:27017/sokogateos',
      required: false, // App can start without DB
      message: cfg.MONGODB_URI ? `Configured: ${maskUri(cfg.MONGODB_URI)}` : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.MONGODB_URI) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const mongoose = require('mongoose');
        await mongoose.connect(cfg.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        await mongoose.connection.close();
        return { ok: true, message: 'Connected', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'PostgreSQL',
    category: 'Core',
    envVars: ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'],
    check: (cfg) => ({
      ok: !!(cfg.POSTGRES_HOST && cfg.POSTGRES_USER),
      required: false,
      message: cfg.POSTGRES_HOST ? `Host: ${cfg.POSTGRES_HOST}:${cfg.POSTGRES_PORT || 5432}` : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.POSTGRES_HOST) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          host: cfg.POSTGRES_HOST,
          port: parseInt(cfg.POSTGRES_PORT || '5432'),
          user: cfg.POSTGRES_USER,
          password: cfg.POSTGRES_PASSWORD,
          database: cfg.POSTGRES_DB,
          connectionTimeoutMillis: 5000,
        });
        await pool.query('SELECT 1');
        await pool.end();
        return { ok: true, message: 'Connected', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'Redis',
    category: 'Core',
    envVars: ['REDIS_URL'],
    check: (cfg) => ({
      ok: !!cfg.REDIS_URL,
      required: false,
      message: cfg.REDIS_URL ? `Configured: ${maskUri(cfg.REDIS_URL)}` : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.REDIS_URL) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const Redis = require('ioredis');
        const redis = new Redis(cfg.REDIS_URL, { connectTimeout: 5000, maxRetriesPerRequest: 1 });
        await redis.ping();
        await redis.quit();
        return { ok: true, message: 'PONG', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'Kafka',
    category: 'Core',
    envVars: ['KAFKA_BROKERS'],
    check: (cfg) => ({
      ok: !!cfg.KAFKA_BROKERS,
      required: false,
      message: cfg.KAFKA_BROKERS ? `Brokers: ${cfg.KAFKA_BROKERS}` : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.KAFKA_BROKERS) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const { Kafka } = require('kafkajs');
        const kafka = new Kafka({ clientId: 'health-check', brokers: cfg.KAFKA_BROKERS.split(',') });
        const admin = kafka.admin();
        await admin.connect();
        await admin.listTopics();
        await admin.disconnect();
        return { ok: true, message: 'Connected', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'JWT',
    category: 'Core',
    envVars: ['JWT_SECRET'],
    check: (cfg) => ({
      ok: !!cfg.JWT_SECRET && cfg.JWT_SECRET !== 'change-this-to-a-random-64-char-string',
      required: true,
      message: cfg.JWT_SECRET ? 'Configured' : 'NOT CONFIGURED',
    }),
    liveCheck: null,
  },

  // ── AI / Data Services ──
  {
    name: 'Apify',
    category: 'AI & Data',
    envVars: ['APIFY_API_KEY'],
    check: (cfg) => ({
      ok: !!cfg.APIFY_API_KEY,
      required: false,
      message: cfg.APIFY_API_KEY ? `Key configured: ${cfg.APIFY_API_KEY.substring(0, 10)}...` : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.APIFY_API_KEY) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const { ApifyClient } = require('apify-client');
        const client = new ApifyClient({ token: cfg.APIFY_API_KEY });
        // List actors to verify API access (lightweight call)
        const store = client.actors();
        await store.list({ limit: 1 });
        return { ok: true, message: 'API connected', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'OpenAI / LangChain',
    category: 'AI & Data',
    envVars: ['OPENAI_API_KEY'],
    check: (cfg) => ({
      ok: !!cfg.OPENAI_API_KEY,
      required: false,
      message: cfg.OPENAI_API_KEY ? `Key configured: ${cfg.OPENAI_API_KEY.substring(0, 10)}...` : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.OPENAI_API_KEY) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: cfg.OPENAI_API_KEY });
        const models = await openai.models.list();
        return { ok: true, message: `API connected (${models.data.length} models available)`, responseTime: Date.now() - start };
      } catch (e) {
        // Models list may be restricted, try a simple completion
        try {
          const resp = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          });
          return { ok: true, message: 'API connected', responseTime: Date.now() - start };
        } catch (e2) {
          return { ok: false, message: e2.message };
        }
      }
    },
  },
  {
    name: 'PostHog',
    category: 'AI & Data',
    envVars: ['POSTHOG_API_KEY', 'POSTHOG_HOST'],
    check: (cfg) => ({
      ok: !!cfg.POSTHOG_API_KEY,
      required: false,
      message: cfg.POSTHOG_API_KEY ? `Key configured (host: ${cfg.POSTHOG_HOST || 'https://app.posthog.com'})` : 'Not configured',
    }),
    liveCheck: null, // PostHog client doesn't expose a simple health check
  },
  {
    name: 'Sentry',
    category: 'AI & Data',
    envVars: ['SENTRY_DSN'],
    check: (cfg) => ({
      ok: !!cfg.SENTRY_DSN,
      required: false,
      message: cfg.SENTRY_DSN ? `DSN configured: ${maskUri(cfg.SENTRY_DSN)}` : 'Not configured',
    }),
    liveCheck: null,
  },

  // ── Communication ──
  {
    name: 'Twilio (WhatsApp)',
    category: 'Communication',
    envVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
    check: (cfg) => ({
      ok: !!(cfg.TWILIO_ACCOUNT_SID && cfg.TWILIO_AUTH_TOKEN && cfg.TWILIO_WHATSAPP_NUMBER),
      required: false,
      message: cfg.TWILIO_ACCOUNT_SID
        ? `SID: ${cfg.TWILIO_ACCOUNT_SID.substring(0, 10)}..., Number: ${cfg.TWILIO_WHATSAPP_NUMBER || 'N/A'}`
        : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.TWILIO_ACCOUNT_SID) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const twilio = require('twilio');
        const client = twilio(cfg.TWILIO_ACCOUNT_SID, cfg.TWILIO_AUTH_TOKEN);
        await client.api.accounts(cfg.TWILIO_ACCOUNT_SID).fetch();
        return { ok: true, message: 'API connected', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'WATI.io',
    category: 'Communication',
    envVars: ['WATI_API_KEY'],
    check: (cfg) => ({
      ok: !!cfg.WATI_API_KEY,
      required: false,
      message: cfg.WATI_API_KEY ? `Key configured: ${cfg.WATI_API_KEY.substring(0, 10)}...` : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.WATI_API_KEY) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const axios = require('axios');
        const res = await axios.get(`${cfg.WATI_BASE_URL || 'https://app.wati.io/api/v1'}/ping`, {
          headers: { Authorization: `Bearer ${cfg.WATI_API_KEY}` },
          timeout: 5000,
        });
        return { ok: res.status === 200, message: `Status ${res.status}`, responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'Email (SMTP)',
    category: 'Communication',
    envVars: ['EMAIL_SMTP_HOST', 'EMAIL_USER'],
    check: (cfg) => ({
      ok: !!(cfg.EMAIL_SMTP_HOST && cfg.EMAIL_USER),
      required: false,
      message: cfg.EMAIL_SMTP_HOST ? `Host: ${cfg.EMAIL_SMTP_HOST}:${cfg.EMAIL_SMTP_PORT || 587}` : 'Not configured',
    }),
    liveCheck: null, // SMTP requires sending an actual email
  },

  // ── Payments ──
  {
    name: 'M-Pesa (Daraja)',
    category: 'Payments',
    envVars: ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE'],
    check: (cfg) => ({
      ok: !!(cfg.MPESA_CONSUMER_KEY && cfg.MPESA_CONSUMER_SECRET && cfg.MPESA_SHORTCODE),
      required: false,
      message: cfg.MPESA_CONSUMER_KEY
        ? `Key configured, Shortcode: ${cfg.MPESA_SHORTCODE}, Env: ${cfg.MPESA_ENV || 'sandbox'}`
        : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.MPESA_CONSUMER_KEY) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const axios = require('axios');
        const auth = Buffer.from(`${cfg.MPESA_CONSUMER_KEY}:${cfg.MPESA_CONSUMER_SECRET}`).toString('base64');
        const baseUrl = cfg.MPESA_ENV === 'production'
          ? 'https://api.safaricom.co.ke'
          : 'https://sandbox.safaricom.co.ke';
        const res = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 10000,
        });
        return { ok: !!res.data.access_token, message: 'Auth token obtained', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },

  // ── Infrastructure ──
  {
    name: 'Cloudflare',
    category: 'Infrastructure',
    envVars: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID'],
    check: (cfg) => ({
      ok: !!(cfg.CLOUDFLARE_API_TOKEN && cfg.CLOUDFLARE_ZONE_ID),
      required: false,
      message: cfg.CLOUDFLARE_API_TOKEN ? 'API token configured' : 'Not configured',
    }),
    liveCheck: async (cfg) => {
      if (!cfg.CLOUDFLARE_API_TOKEN) return { ok: false, message: 'Not configured' };
      const start = Date.now();
      try {
        const axios = require('axios');
        const res = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
          headers: { Authorization: `Bearer ${cfg.CLOUDFLARE_API_TOKEN}` },
          timeout: 5000,
        });
        return { ok: res.data.success, message: res.data.success ? 'Token verified' : 'Token invalid', responseTime: Date.now() - start };
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
  },
  {
    name: 'MinIO (S3)',
    category: 'Infrastructure',
    envVars: ['MINIO_ENDPOINT', 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD'],
    check: (cfg) => ({
      ok: !!(cfg.MINIO_ENDPOINT && cfg.MINIO_ROOT_USER),
      required: false,
      message: cfg.MINIO_ENDPOINT ? `Endpoint: ${cfg.MINIO_ENDPOINT}` : 'Not configured',
    }),
    liveCheck: null, // MinIO requires the full SDK with bucket operations
  },
  {
    name: 'Bing Webmaster Tools',
    category: 'Infrastructure',
    envVars: ['BING_WEBSMASTER_TOOLS_API_KEY'],
    check: (cfg) => ({
      ok: !!cfg.BING_WEBSMASTER_TOOLS_API_KEY,
      required: false,
      message: cfg.BING_WEBSMASTER_TOOLS_API_KEY ? 'API key configured' : 'Not configured',
    }),
    liveCheck: null,
  },
  {
    name: 'Frontend URL',
    category: 'Infrastructure',
    envVars: ['FRONTEND_URL'],
    check: (cfg) => ({
      ok: !!cfg.FRONTEND_URL,
      required: false,
      message: cfg.FRONTEND_URL ? `URL: ${cfg.FRONTEND_URL}` : 'Not configured (CORS uses default)',
    }),
    liveCheck: null,
  },
];

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function maskUri(uri) {
  if (!uri) return '';
  try {
    const u = new URL(uri);
    if (u.password) u.password = '***';
    if (u.username) u.username = u.username.substring(0, 4) + '***';
    return u.toString();
  } catch {
    // Not a URI, just truncate
    return uri.length > 20 ? uri.substring(0, 10) + '...' + uri.slice(-10) : uri;
  }
}

function formatDuration(ms) {
  if (!ms) return '-';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// ──────────────────────────────────────────────
//  Runner
// ──────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    live: args.includes('--live'),
    json: args.includes('--json'),
    help: args.includes('--help'),
  };
}

function printHelp() {
  console.log(`
SokogateOS — Health Check Script
=================================
Checks all external service configurations.

Usage:
  node scripts/health-check.js             Config-only check (no API calls)
  node scripts/health-check.js --live      Config check + live API connectivity tests
  node scripts/health-check.js --json      Output as JSON only
  node scripts/health-check.js --help      This help
`);
}

async function main() {
  const args = parseArgs();
  if (args.help) { printHelp(); return; }

  loadEnv();

  const results = [];
  let passed = 0;
  let failed = 0;
  let requiredFailed = 0;

  for (const check of CHECKS) {
    const checkResult = check.check(process.env);
    let liveResult = null;

    if (args.live && check.liveCheck) {
      liveResult = await check.liveCheck(process.env);
    }

    const ok = checkResult.ok && (!liveResult || liveResult.ok);
    if (ok) passed++; else { failed++; if (checkResult.required !== false) requiredFailed++; }

    results.push({
      name: check.name,
      category: check.category,
      required: check.required !== false,
      config: { ok: checkResult.ok, message: checkResult.message },
      live: liveResult ? { ok: liveResult.ok, message: liveResult.message, responseTime: liveResult.responseTime } : undefined,
      ok,
    });
  }

  // ── Output ──

  if (args.json) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total: results.length, passed, failed, requiredFailed },
      checks: results,
    }, null, 2));
    return;
  }

  // ── Table output ──
  const byCategory = {};
  for (const r of results) {
    (byCategory[r.category] ||= []).push(r);
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     SokogateOS — External Services Health Check     ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  if (args.live) console.log('Mode: Config + Live API calls');
  else console.log('Mode: Config only (add --live for API connectivity tests)');
  console.log('');

  for (const [category, checks] of Object.entries(byCategory)) {
    console.log(`  ${category}`);
    console.log('  ' + '─'.repeat(Math.max(category.length + 2, 40)));
    for (const c of checks) {
      const icon = c.ok ? '✅' : (c.required !== false ? '❌' : '⚠️');
      const requiredLabel = c.required !== false ? '' : ' [optional]';
      console.log(`  ${icon} ${c.name}${requiredLabel}`);
      console.log(`       Config: ${c.config.message}`);
      if (c.live) {
        const liveIcon = c.live.ok ? '✅' : '❌';
        console.log(`       Live:   ${liveIcon} ${c.live.message} ${c.live.responseTime ? `(${formatDuration(c.live.responseTime)})` : ''}`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('─────────────────────────────────────────────────────');
  console.log(`Total: ${results.length} | ✅ ${passed} passed | ❌ ${failed} failed | ⛔ ${requiredFailed} required failures`);
  if (requiredFailed > 0) {
    console.log('\n⚠️  WARNING: Some REQUIRED services are not configured.');
    console.log('   Set the missing env vars in your .env file.');
  }
  if (!args.live) {
    console.log('\n💡 Run with --live to test actual API connectivity.');
  }
  console.log('');

  process.exit(requiredFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Health check error:', err);
  process.exit(1);
});
