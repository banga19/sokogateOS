// Validate-Env Script Tests for SokogateOS
// Tests the validate(), validateSelf(), and isPlaceholder() functions
// using constructed mock env data — no filesystem access needed.

const {
  validate,
  validateSelf,
  isPlaceholder,
  JWT_KEYS,
  EMPTY_OK_KEYS,
} = require('../../scripts/validate-env');

// ──────────────────────────────────────────────
//  Helpers — build mock env structures
// ──────────────────────────────────────────────

function envEntry(key, value, section = 'Test') {
  return { key, value, section, line: `${key}=${value}` };
}

function buildEnv(entries) {
  return { entries, path: '/mock/.env' };
}

function envFromObj(obj, section = 'Test') {
  return buildEnv(Object.entries(obj).map(([key, value]) => envEntry(key, value, section)));
}

const VALID_JWT = 'a-really-long-jwt-secret-that-is-32-chars!!';

// ──────────────────────────────────────────────
//  isPlaceholder
// ──────────────────────────────────────────────

describe('isPlaceholder', () => {
  test('detects change-this-to prefix', () => {
    expect(isPlaceholder('change-this-to-a-random-string')).toBe(true);
  });

  test('detects your- prefix', () => {
    expect(isPlaceholder('your-project-id')).toBe(true);
    expect(isPlaceholder('your-clerk-secret-key')).toBe(true);
  });

  test('detects sk_test_ prefix (Clerk)', () => {
    expect(isPlaceholder('sk_test_your-clerk-secret-key')).toBe(true);
  });

  test('detects test- prefix as placeholder', () => {
    expect(isPlaceholder('test-value-here')).toBe(true);
  });

  test('detects sokogate_secret_key', () => {
    expect(isPlaceholder('sokogate_secret_key_change_in_production')).toBe(true);
  });

  test('detects changeme', () => {
    expect(isPlaceholder('changeme')).toBe(true);
  });

  test('detects TODO', () => {
    expect(isPlaceholder('TODO-REPLACE-ME')).toBe(true);
  });

  test('detects angle-bracket patterns', () => {
    expect(isPlaceholder('<your-key-here>')).toBe(true);
  });

  test('returns false for real-looking values', () => {
    expect(isPlaceholder('sk_live_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6')).toBe(false);
    expect(isPlaceholder(VALID_JWT)).toBe(false);
    expect(isPlaceholder('')).toBe(false);
    expect(isPlaceholder(null)).toBe(false);
    expect(isPlaceholder(undefined)).toBe(false);
  });
});

// ──────────────────────────────────────────────
//  validate
// ──────────────────────────────────────────────

describe('validate', () => {
  // ── Missing vars ──

  describe('missing vars in user env', () => {
    test('flags missing JWT keys as errors', () => {
      const template = envFromObj({
        JWT_SECRET: 'change-this-to-a-random-string',
        JWT_REFRESH_SECRET: 'change-this-to-another-random-string',
        PORT: '3000',
      });
      const user = envFromObj({ PORT: '4000' });

      const result = validate(user, template);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].key).toBe('JWT_SECRET');
      expect(result.errors[0].message).toContain('MISSING');
      expect(result.errors[1].key).toBe('JWT_REFRESH_SECRET');
      expect(result.errors[1].message).toContain('MISSING');
    });

    test('flags missing service keys with non-empty defaults as warnings', () => {
      const template = envFromObj({
        OPENAI_API_KEY: 'sk-...',
        TWILIO_ACCOUNT_SID: 'AC...',
        POSTGRES_HOST: 'localhost',
      });
      const user = envFromObj({ POSTGRES_HOST: 'prod.example.com' });

      const result = validate(user, template);

      const missingServiceWarnings = result.warnings.filter(
        (w) => w.message.includes('add it if you need')
      );
      expect(missingServiceWarnings).toHaveLength(2);
      expect(missingServiceWarnings[0].key).toBe('OPENAI_API_KEY');
      expect(missingServiceWarnings[1].key).toBe('TWILIO_ACCOUNT_SID');
    });

    test('flags missing service keys with empty template value as info', () => {
      const template = envFromObj({ TWILIO_AUTH_TOKEN: '' });
      const user = envFromObj({});

      const result = validate(user, template);

      const missingInfo = result.info.filter((i) => i.key === 'TWILIO_AUTH_TOKEN');
      expect(missingInfo).toHaveLength(1);
      expect(missingInfo[0].message).toContain('optional');
    });

    test('flags missing vars with defaults as warnings', () => {
      const template = envFromObj({ BCRYPT_ROUNDS: '12', PORT: '3000' });
      const user = envFromObj({ PORT: '4000' });

      const result = validate(user, template);

      const defaultWarnings = result.warnings.filter((w) => w.message.includes('has default'));
      expect(defaultWarnings).toHaveLength(1);
      expect(defaultWarnings[0].key).toBe('BCRYPT_ROUNDS');
    });

    test('treats missing vars with empty template value as info', () => {
      const template = envFromObj({ SOME_OPTIONAL_KEY: '' });
      const user = envFromObj({});

      const result = validate(user, template);

      expect(result.info).toHaveLength(1);
      expect(result.info[0].key).toBe('SOME_OPTIONAL_KEY');
      expect(result.info[0].message).toContain('optional');
    });
  });

  // ── Empty values ──

  describe('empty values in user env', () => {
    test('flags empty JWT keys as errors', () => {
      const template = envFromObj({ JWT_SECRET: 'change-this-to-a-random-string' });
      const user = envFromObj({ JWT_SECRET: '' });

      const result = validate(user, template);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Empty');
    });

    test('treats empty optional service key as info', () => {
      const template = envFromObj({ TWILIO_AUTH_TOKEN: '' });
      const user = envFromObj({ TWILIO_AUTH_TOKEN: '' });

      const result = validate(user, template);

      expect(result.errors).toHaveLength(0);
      expect(result.info.some((i) => i.key === 'TWILIO_AUTH_TOKEN')).toBe(true);
    });

    test('flags empty var with non-empty template default as warning', () => {
      const template = envFromObj({ POSTGRES_DB: 'sokogate' });
      const user = envFromObj({ POSTGRES_DB: '' });

      const result = validate(user, template);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Empty');
    });
  });

  // ── Placeholder values ──

  describe('placeholder values in user env', () => {
    test('flags placeholder JWT secrets as errors', () => {
      const template = envFromObj({ JWT_SECRET: 'change-this-to-a-random-string' });
      const user = envFromObj({ JWT_SECRET: 'change-this-to-a-random-64-char-string' });

      const result = validate(user, template);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('placeholder');
    });

    test('flags placeholder values in non-JWT keys as warnings', () => {
      const template = envFromObj({ CLERK_SECRET_KEY: 'sk_test_your-clerk-secret-key' });
      const user = envFromObj({ CLERK_SECRET_KEY: 'sk_test_my-test-key' });

      const result = validate(user, template);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('placeholder');
    });
  });

  // ── JWT strength ──

  describe('JWT secret strength', () => {
    test('flags JWT secrets shorter than 32 chars as errors', () => {
      const template = envFromObj({ JWT_SECRET: 'change-this-to-a-random-string' });
      const user = envFromObj({ JWT_SECRET: 'short-secret' });

      const result = validate(user, template);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Too short');
      expect(result.errors[0].message).toContain('12 chars');
    });

    test('passes JWT secrets of 32+ chars', () => {
      const template = envFromObj({ JWT_SECRET: 'change-this-to-a-random-string' });
      const user = envFromObj({ JWT_SECRET: VALID_JWT });

      const result = validate(user, template);

      const jwtErrors = result.errors.filter((e) => e.key === 'JWT_SECRET');
      expect(jwtErrors).toHaveLength(0);
    });
  });

  // ── NODE_ENV ──

  describe('NODE_ENV check', () => {
    test('flags development NODE_ENV as info', () => {
      const template = envFromObj({ NODE_ENV: 'development' });
      const user = envFromObj({ NODE_ENV: 'development' });

      const result = validate(user, template);

      expect(result.info.some((i) => i.key === 'NODE_ENV')).toBe(true);
      expect(result.info.find((i) => i.key === 'NODE_ENV').message).toContain('development');
    });

    test('does not flag production NODE_ENV', () => {
      const template = envFromObj({ NODE_ENV: 'development' });
      const user = envFromObj({ NODE_ENV: 'production' });

      const result = validate(user, template);

      const nodeEnvInfo = result.info.filter((i) => i.key === 'NODE_ENV');
      expect(nodeEnvInfo).toHaveLength(0);
    });
  });

  // ── Unknown vars ──

  describe('unknown vars in user env', () => {
    test('warns on vars in user env not in template', () => {
      const template = envFromObj({ KNOWN_VAR: 'value' });
      const user = envFromObj({ KNOWN_VAR: 'value', TYPO_VAR: 'value', OBSOLETE_KEY: '' });

      const result = validate(user, template);

      const unknownWarnings = result.warnings.filter((w) => w.message.includes('Not in .env.example'));
      expect(unknownWarnings).toHaveLength(2);
      expect(unknownWarnings[0].key).toBe('TYPO_VAR');
      expect(unknownWarnings[1].key).toBe('OBSOLETE_KEY');
    });
  });

  // ── Combined scenario ──

  describe('combined scenario', () => {
    test('correctly classifies a realistic env comparison', () => {
      const template = envFromObj({
        NODE_ENV: 'development',
        JWT_SECRET: 'change-this-to-a-random-64-char-string',
        JWT_REFRESH_SECRET: 'change-this-to-another-random-64-char-string',
        PORT: '3000',
        MONGODB_URI: 'mongodb://localhost:27017/sokogateos',
        REDIS_URL: 'redis://localhost:6379',
        TWILIO_AUTH_TOKEN: '',
        OPENAI_API_KEY: '',
        BCRYPT_ROUNDS: '12',
      });

      const user = envFromObj({
        NODE_ENV: 'development',
        JWT_SECRET: VALID_JWT,
        JWT_REFRESH_SECRET: 'another-valid-secret-long-enough-for-prod!!',
        PORT: '4000',
        MONGODB_URI: 'mongodb://prod:27017/sokogateos',
        REDIS_URL: 'redis://prod:6379',
        // TWILIO_AUTH_TOKEN and OPENAI_API_KEY have empty template values → info, not warnings
        BCRYPT_ROUNDS: '12',
      });

      const result = validate(user, template);

      // Errors: none (JWT is valid)
      expect(result.errors).toHaveLength(0);

      // Warnings: none — missing optional keys with empty template defaults are info, not warnings
      expect(result.warnings).toHaveLength(0);

      // Info: NODE_ENV=development note + 2 optional keys not set
      expect(result.info.some((i) => i.key === 'NODE_ENV')).toBe(true);
      expect(result.info.some((i) => i.key === 'TWILIO_AUTH_TOKEN')).toBe(true);
      expect(result.info.some((i) => i.key === 'OPENAI_API_KEY')).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────
//  validateSelf
// ──────────────────────────────────────────────

describe('validateSelf', () => {
  test('detects duplicate keys as errors', () => {
    const env = buildEnv([
      envEntry('DUPLICATE', 'value1'),
      envEntry('DUPLICATE', 'value2'),
      envEntry('OTHER', 'value'),
    ]);

    const result = validateSelf(env);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].key).toBe('DUPLICATE');
    expect(result.errors[0].message).toContain('Duplicate');
  });

  test('flags empty non-JWT values as warnings', () => {
    const env = buildEnv([
      envEntry('SERVICE_KEY', ''),
      envEntry('CONFIGURED_KEY', 'real-value'),
    ]);

    const result = validateSelf(env);

    const emptyWarnings = result.warnings.filter((w) => w.message.includes('Empty value'));
    expect(emptyWarnings).toHaveLength(1);
    expect(emptyWarnings[0].key).toBe('SERVICE_KEY');
  });

  test('does not flag empty JWT keys as warnings', () => {
    const env = buildEnv([
      envEntry('JWT_SECRET', ''),
      envEntry('JWT_REFRESH_SECRET', ''),
    ]);

    const result = validateSelf(env);

    const jwtWarnings = result.warnings.filter((w) => JWT_KEYS.has(w.key));
    expect(jwtWarnings).toHaveLength(0);
  });

  test('reports placeholder values as info', () => {
    const env = buildEnv([
      envEntry('SOME_KEY', 'change-this-to-actual-value'),
    ]);

    const result = validateSelf(env);

    expect(result.info).toHaveLength(1);
    expect(result.info[0].message).toContain('Placeholder');
  });

  test('handles clean template with no issues', () => {
    const env = buildEnv([
      envEntry('PORT', '3000'),
      envEntry('JWT_SECRET', 'change-this-to-a-random-string'),
    ]);

    const result = validateSelf(env);

    // PORT has a value (not empty, not placeholder) — no issues
    // JWT_SECRET has a placeholder — info
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.info).toHaveLength(1);
  });
});
