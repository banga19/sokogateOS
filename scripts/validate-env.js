#!/usr/bin/env node
/**
 * SokogateOS — Environment Validator
 *
 * Compares your .env file(s) against .env.example to catch:
 *   - Missing required env vars (placeholder values that weren't replaced)
 *   - Empty env vars that are needed for optional services
 *   - Weak JWT secrets (too short or still using placeholder)
 *   - New vars added to .env.example that are missing from your .env
 *   - Deprecated/unknown vars in your .env that aren't in the template
 *
 * Usage:
 *   node scripts/validate-env.js                    # Check .env (default)
 *   node scripts/validate-env.js --env .env.production  # Check specific file
 *   node scripts/validate-env.js --self              # Self-consistency check of .env.example (for CI)
 *   node scripts/validate-env.js --json              # JSON output
 *   node scripts/validate-env.js --strict            # Exit 1 on any warning
 *   node scripts/validate-env.js --help              # Show help
 */

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
//  Placeholder patterns (values that should never reach production)
// ──────────────────────────────────────────────

const PLACEHOLDER_PATTERNS = [
  /^change-this-to/i,
  /^your-/i,
  /^sk_test_/,
  /^test-/i,
  /^sokogate_secret_key/i,
  /^sokogate$/i,
  /^changeme$/i,
  /^TODO/i,
  /^<.*>$/,
];

function isPlaceholder(value) {
  if (!value) return false;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

// ──────────────────────────────────────────────
//  Parse a .env file into structured entries
// ──────────────────────────────────────────────

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  const entries = [];
  const lines = content.split('\n');

  let currentSection = 'General';

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Track section headers like "# ---- Server ----"
    const sectionMatch = line.match(/^#+\s*-+\s*(.+?)\s*-+\s*#*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    // Skip comments and blank lines
    if (!line || line.startsWith('#')) continue;

    // Parse KEY=VALUE
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value, section: currentSection, line: rawLine });
  }

  return { entries, path: filePath };
}

// ──────────────────────────────────────────────
//  Classification helpers
// ──────────────────────────────────────────────

const JWT_KEYS = new Set(['JWT_SECRET', 'JWT_REFRESH_SECRET']);
const EMPTY_OK_KEYS = new Set([
  // These are legitimately empty by default in .env.example (service keys the user fills in)
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_SMS_NUMBER',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_PASSKEY',
  'MPESA_SHORTCODE',
  'WATI_API_KEY',
  'POSTHOG_API_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'CLOUDFLARE_ACCOUNT_ID',
  'APIFY_API_KEY',
  'COMPOSIO_API_KEY',
  'OPENAI_API_KEY',
  'SENTRY_DSN',
  'SENTRY_RELEASE',
  'EMAIL_SMTP_HOST',
  'EMAIL_USER',
  'EMAIL_PASS',
  'BING_WEBSMASTER_TOOLS_API_KEY',
  'BING_SITE_URL',
  'CLERK_SECRET_KEY',
  'EXTERNAL_API_KEY',
]);

// ──────────────────────────────────────────────
//  Self-Consistency Check (for CI)
// ──────────────────────────────────────────────

/**
 * Validate .env.example for internal consistency — catches template corruption
 * or formatting issues. Runs in CI where there's no user .env file.
 *
 * Checks:
 *   - Duplicate keys
 *   - Keys with empty values that should have defaults
 *   - Keys with placeholder values in the template itself
 *   - Malformed lines
 */
function validateSelf(templateEnv) {
  const errors = [];
  const warnings = [];
  const info = [];
  const seen = new Map();

  for (const entry of templateEnv.entries) {
    // Duplicate key check
    if (seen.has(entry.key)) {
      errors.push({ key: entry.key, message: `Duplicate key — appears ${seen.get(entry.key) + 1} times`, section: entry.section });
      seen.set(entry.key, 2);
    } else {
      seen.set(entry.key, 1);
    }
  }

  // Check each distinct key
  for (const entry of templateEnv.entries) {
    // Skip duplicates (already reported as error)
    if (seen.get(entry.key) === 2) continue;

    // Empty value warning (should this key have a default?)
    if (entry.value === '' && !JWT_KEYS.has(entry.key)) {
      warnings.push({ key: entry.key, message: `Empty value in template — users must provide this`, section: entry.section });
    }

    // Placeholder in template
    if (entry.value !== '' && isPlaceholder(entry.value)) {
      info.push({ key: entry.key, message: `Placeholder value "${entry.value}" — OK for template`, section: entry.section });
    }
  }

  return { errors, warnings, info };
}

// ──────────────────────────────────────────────
//  Validators
// ──────────────────────────────────────────────

/**
 * Run all validation checks comparing user env against template.
 * Returns { errors: [], warnings: [], info: [] }
 */
function validate(userEnv, templateEnv) {
  const errors = [];
  const warnings = [];
  const info = [];

  const userMap = new Map();
  for (const e of userEnv.entries) {
    userMap.set(e.key, e);
  }

  const templateMap = new Map();
  for (const e of templateEnv.entries) {
    templateMap.set(e.key, e);
  }

  // ── Check each template var against user's env ──

  for (const [key, template] of templateMap) {
    const user = userMap.get(key);

    if (!user) {
      // Var exists in template but not in user's env
      const isServiceKey = EMPTY_OK_KEYS.has(key);
      if (template.value === '' || template.value.startsWith('#')) {
        info.push({ key, message: `Not set (optional)`, section: template.section });
      } else if (isServiceKey) {
        warnings.push({ key, message: `Missing from your .env — add it if you need this service`, section: template.section });
      } else if (JWT_KEYS.has(key)) {
        errors.push({ key, message: `MISSING — required for authentication`, section: template.section });
      } else if (template.value) {
        warnings.push({ key, message: `Missing from your .env — has default "${template.value}"`, section: template.section });
      }
      continue;
    }

    // Var exists — check its value
    const userValue = user.value;

    if (userValue === '' || userValue === undefined) {
      if (JWT_KEYS.has(key)) {
        errors.push({ key, message: `Empty — required for authentication`, section: template.section });
      } else if (template.value === '') {
        info.push({ key, message: `Empty (opt-in service, not configured)`, section: template.section });
      } else if (EMPTY_OK_KEYS.has(key)) {
        info.push({ key, message: `Empty — service not configured`, section: template.section });
      } else {
        warnings.push({ key, message: `Empty — has default "${template.value}"`, section: template.section });
      }
      continue;
    }

    // Check for placeholder values
    if (isPlaceholder(userValue)) {
      if (JWT_KEYS.has(key)) {
        errors.push({ key, message: `Still using placeholder — generate a real secret`, section: template.section });
      } else {
        warnings.push({ key, message: `Still using placeholder value "${userValue}"`, section: template.section });
      }
      continue;
    }

    // Check JWT secret strength
    if (JWT_KEYS.has(key) && userValue.length < 32) {
      errors.push({ key, message: `Too short (${userValue.length} chars) — minimum 32 characters`, section: template.section });
    }

    // Check NODE_ENV
    if (key === 'NODE_ENV' && userValue === 'development') {
      info.push({ key, message: `Set to "development" — change to "production" for deployment`, section: template.section });
    }
  }

  // ── Check for vars in user's env that aren't in template ──

  for (const [key, user] of userMap) {
    if (!templateMap.has(key)) {
      warnings.push({ key, message: `Not in .env.example — might be deprecated or misspelled`, section: user.section });
    }
  }

  return { errors, warnings, info };
}

// ──────────────────────────────────────────────
//  Output
// ──────────────────────────────────────────────

function formatOutput(results, envFile) {
  const { errors, warnings, info } = results;

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     SokogateOS — Environment Configuration Check     ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`Template: .env.example`);
  console.log(`Your env: ${envFile}`);
  console.log('');

  if (errors.length === 0 && warnings.length === 0 && info.length === 0) {
    console.log('  ✅ Everything looks good!');
    console.log('');
    return;
  }

  // ── Errors ──
  if (errors.length > 0) {
    console.log(`  🔴 ERRORS (${errors.length}) — must fix before deployment`);
    console.log(`  ${'─'.repeat(50)}`);
    for (const e of errors) {
      console.log(`  🔴 ${e.key}: ${e.message}`);
    }
    console.log('');
  }

  // ── Warnings ──
  if (warnings.length > 0) {
    console.log(`  🟡 WARNINGS (${warnings.length}) — review recommended`);
    console.log(`  ${'─'.repeat(50)}`);
    for (const w of warnings) {
      console.log(`  🟡 ${w.key}: ${w.message}`);
    }
    console.log('');
  }

  // ── Info ──
  if (info.length > 0) {
    console.log(`  ℹ️  INFO (${info.length})`);
    console.log(`  ${'─'.repeat(50)}`);
    for (const i of info) {
      console.log(`  ℹ️  ${i.key}: ${i.message}`);
    }
    console.log('');
  }

  // ── Summary ──
  const total = errors.length + warnings.length + info.length;
  console.log('─────────────────────────────────────────────────────');
  console.log(`Total: ${total} | 🔴 ${errors.length} errors | 🟡 ${warnings.length} warnings | ℹ️  ${info.length} info`);
  if (errors.length > 0) {
    console.log('\n  ❌ Fix the errors above before deploying to production.');
  } else if (warnings.length > 0) {
    console.log('\n  ⚠️  Review warnings before deploying to production.');
  } else {
    console.log('\n  ✅ No issues found.');
  }
  console.log('');
}

// ──────────────────────────────────────────────
//  Main
// ──────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let envFile = '.env';
  let json = false;
  let strict = false;
  let selfCheck = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--env':
        envFile = args[++i] || '.env';
        break;
      case '--self':
        selfCheck = true;
        break;
      case '--json':
        json = true;
        break;
      case '--strict':
        strict = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return { envFile, json, strict, selfCheck };
}

function printHelp() {
  console.log(`
SokogateOS — Environment Validator
===================================
Compares your .env file against .env.example to catch common mistakes.

Usage:
  node scripts/validate-env.js                        Check .env (default)
  node scripts/validate-env.js --env .env.production   Check specific file
  node scripts/validate-env.js --self                  Self-consistency check of .env.example (for CI)
  node scripts/validate-env.js --json                  JSON output
  node scripts/validate-env.js --strict                Exit 1 on any warning
  node scripts/validate-env.js --help                  This help
`);
}

function main() {
  const args = parseArgs();

  // Find the project root (where .env.example lives)
  const searchPaths = [
    path.resolve(process.cwd(), '.env.example'),
    path.resolve(__dirname, '..', '.env.example'),
  ];

  let templatePath = searchPaths.find((p) => fs.existsSync(p));
  if (!templatePath) {
    console.error('❌ .env.example not found — run this script from the project root.');
    process.exit(1);
  }

  const templateEnv = parseEnvFile(templatePath);

  if (!templateEnv) {
    console.error('❌ Failed to parse .env.example');
    process.exit(1);
  }

  let results;
  let envPath = templatePath;

  if (args.selfCheck) {
    results = validateSelf(templateEnv);
  } else {
    envPath = path.resolve(process.cwd(), args.envFile);

    if (!fs.existsSync(envPath)) {
      console.error(`❌ Environment file not found: ${args.envFile}`);
      console.error('   Create it by copying .env.example: cp .env.example .env');
      process.exit(1);
    }

    const userEnv = parseEnvFile(envPath);
    if (!userEnv) {
      console.error(`❌ Failed to parse ${args.envFile}`);
      process.exit(1);
    }

    results = validate(userEnv, templateEnv);
  }

  if (args.json) {
    console.log(JSON.stringify({
      template: templatePath,
      envFile: envPath,
      timestamp: new Date().toISOString(),
      mode: args.selfCheck ? 'self' : 'compare',
      summary: {
        errors: results.errors.length,
        warnings: results.warnings.length,
        info: results.info.length,
      },
      errors: results.errors,
      warnings: results.warnings,
      info: results.info,
    }, null, 2));
  } else {
    formatOutput(results, envPath);
  }

  const exitCode = results.errors.length > 0 ? 1 : (args.strict && results.warnings.length > 0 ? 1 : 0);
  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = {
  validate,
  validateSelf,
  isPlaceholder,
  parseEnvFile,
  formatOutput,
  PLACEHOLDER_PATTERNS,
  JWT_KEYS,
  EMPTY_OK_KEYS,
};
