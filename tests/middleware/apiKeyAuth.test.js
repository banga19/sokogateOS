// API Key Auth Middleware Tests for SokogateOS
// Tests constant-time comparison, key validation, passthrough modes, and JWT bypass

jest.mock('../../src/utils/logger');

const logger = require('../../src/utils/logger');
const { requireApiKey } = require('../../src/middleware/apiKeyAuth');

const VALID_API_KEY = 'test-api-key-that-is-at-least-32-chars!!';

function setupRequest(overrides = {}) {
  return {
    headers: {},
    ip: '127.0.0.1',
    originalUrl: '/api/tools',
    get: jest.fn().mockReturnValue('test-agent/1.0'),
    ...overrides,
  };
}

function setupResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('requireApiKey', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXTERNAL_API_KEY;
    delete process.env.EXTERNAL_API_KEYS;
    delete process.env.EXTERNAL_API_KEYS_PREVIOUS;
    req = setupRequest();
    res = setupResponse();
    next = jest.fn();
  });

  // ──────────────────────────────────────────────
  //  Valid Key
  // ──────────────────────────────────────────────

  describe('valid key', () => {
    test('should authenticate when valid API key is provided (default: required=true)', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = VALID_API_KEY;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
      expect(req.authMethod).toBe('api_key');
    });

    test('should authenticate with custom header name', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-custom-key'] = VALID_API_KEY;

      requireApiKey({ headerName: 'x-custom-key' })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should authenticate when valid key provided in optional mode', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = VALID_API_KEY;

      requireApiKey({ required: false })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should authenticate when valid key provided in passthrough mode', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = VALID_API_KEY;

      requireApiKey({ required: true, passthrough: true })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  //  Invalid Key
  // ──────────────────────────────────────────────

  describe('invalid key', () => {
    test('should reject when invalid API key is provided (default: required=true)', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = 'invalid-key';

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid API key',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when key length differs even with same prefix', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = VALID_API_KEY.slice(0, -1); // One char shorter

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid key even in optional mode', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = 'wrong-key';

      requireApiKey({ required: false })(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should log spoofing attempt details on invalid key', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = 'wrong-key';

      requireApiKey()(req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        'API Key Auth: Invalid API key provided',
        expect.objectContaining({
          ip: '127.0.0.1',
          path: '/api/tools',
        })
      );
    });
  });

  // ──────────────────────────────────────────────
  //  Missing Key Header
  // ──────────────────────────────────────────────

  describe('missing key header', () => {
    test('should reject when required=true and no key header provided', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key is required. Provide it via the x-api-key header.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow through in passthrough mode when no key header provided', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;

      requireApiKey({ required: true, passthrough: true })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });

    test('should allow through in optional mode when no key header provided and no key configured', () => {
      // EXTERNAL_API_KEY is not set — optional mode means no auth needed
      requireApiKey({ required: false })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });

    test('should reject in optional mode when key IS configured but no header provided', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;

      requireApiKey({ required: false })(req, res, next);

      // required=false only affects behavior when no key is configured;
      // when a key IS configured, validation still requires the header
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  //  Dev Mode (No EXTERNAL_API_KEY configured)
  // ──────────────────────────────────────────────

  describe('dev mode — no API keys configured', () => {
    test('should reject when required=true, no passthrough, and no key configured', () => {
      // Neither EXTERNAL_API_KEY nor EXTERNAL_API_KEYS is set

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key authentication not configured',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow through in passthrough mode when no key configured', () => {
      requireApiKey({ required: true, passthrough: true })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No API keys configured')
      );
    });

    test('should allow through in optional mode when no key configured', () => {
      requireApiKey({ required: false })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  //  JWT-Authenticated Bypass
  // ──────────────────────────────────────────────

  describe('JWT-authenticated request bypass', () => {
    test('should skip API key check when req.user is present', () => {
      req.user = { id: 'user-1', role: 'procurement_manager' };

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });

    test('should skip API key check regardless of key config when req.user present', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.user = { id: 'user-1' };
      // No API key header — but JWT auth takes precedence

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });

    test('should skip API key check even with invalid key header when req.user present', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.user = { id: 'user-1' };
      req.headers['x-api-key'] = 'wrong-key';

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  //  Constant-Time Comparison
  // ──────────────────────────────────────────────

  describe('constant-time comparison', () => {
    test('should correctly match identical keys', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = VALID_API_KEY;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should reject identical-length keys that differ in content', () => {
      const differentKey = 'XXXX-api-key-that-is-at-least-32-chars!!'; // Same length, different content
      expect(differentKey.length).toBe(VALID_API_KEY.length);

      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = differentKey;

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject empty key', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = '';

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject null header', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      // No x-api-key header set

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  //  Strength Validation Warning
  // ──────────────────────────────────────────────

  describe('key strength validation', () => {
    test('should warn when configured key is shorter than 32 characters', () => {
      process.env.EXTERNAL_API_KEY = 'short-key';
      req.headers['x-api-key'] = 'short-key';

      requireApiKey()(req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        'API Key Auth: Configured key is less than 32 characters — consider a stronger key'
      );
      // Should still authenticate (warning only)
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should warn for each short key in multi-key list', () => {
      process.env.EXTERNAL_API_KEYS = 'short-key,wxyz'; // both < 32 chars
      req.headers['x-api-key'] = 'short-key';

      requireApiKey()(req, res, next);

      const strengthWarnings = logger.warn.mock.calls.filter(
        ([msg]) => msg && msg.includes('less than 32 characters')
      );
      expect(strengthWarnings).toHaveLength(2); // one warning per short key
    });

    test('should not warn when key is 32+ characters', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = VALID_API_KEY;

      requireApiKey()(req, res, next);

      // Should not contain the strength warning
      const warnCalls = logger.warn.mock.calls.filter(
        ([msg]) => msg && msg.includes('less than 32 characters')
      );
      expect(warnCalls).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────
  //  Multi-Key Support (EXTERNAL_API_KEYS)
  // ──────────────────────────────────────────────

  describe('multi-key support — EXTERNAL_API_KEYS', () => {
    const KEY_A = 'multi-key-a-that-is-at-least-32-chars!!';
    const KEY_B = 'multi-key-b-that-is-at-least-32-chars!!';
    const KEY_C = 'multi-key-c-that-is-at-least-32-chars!!';

    test('should authenticate with first key in list', () => {
      process.env.EXTERNAL_API_KEYS = `${KEY_A},${KEY_B},${KEY_C}`;
      req.headers['x-api-key'] = KEY_A;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should authenticate with middle key in list', () => {
      process.env.EXTERNAL_API_KEYS = `${KEY_A},${KEY_B},${KEY_C}`;
      req.headers['x-api-key'] = KEY_B;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should authenticate with last key in list', () => {
      process.env.EXTERNAL_API_KEYS = `${KEY_A},${KEY_B},${KEY_C}`;
      req.headers['x-api-key'] = KEY_C;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should reject key not in the list', () => {
      process.env.EXTERNAL_API_KEYS = `${KEY_A},${KEY_B}`;
      req.headers['x-api-key'] = 'unknown-key-that-is-at-least-32-chars-long!!';

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject key that partially matches a list entry', () => {
      process.env.EXTERNAL_API_KEYS = `${KEY_A},${KEY_B}`;
      req.headers['x-api-key'] = KEY_A.slice(0, -2) + 'XX'; // Same length, different content

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should trim whitespace around comma-separated keys', () => {
      process.env.EXTERNAL_API_KEYS = `  ${KEY_A}  ,  ${KEY_B}  `;
      req.headers['x-api-key'] = KEY_B;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should merge EXTERNAL_API_KEY and EXTERNAL_API_KEYS together', () => {
      process.env.EXTERNAL_API_KEY = KEY_A;
      process.env.EXTERNAL_API_KEYS = `${KEY_B},${KEY_C}`;
      req.headers['x-api-key'] = KEY_C;

      requireApiKey()(req, res, next);

      // KEY_C is in EXTERNAL_API_KEYS — should authenticate
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should merge and match against EXTERNAL_API_KEY entry', () => {
      process.env.EXTERNAL_API_KEY = KEY_A;
      process.env.EXTERNAL_API_KEYS = `${KEY_B},${KEY_C}`;
      req.headers['x-api-key'] = KEY_A;

      requireApiKey()(req, res, next);

      // KEY_A is the legacy single key — should authenticate
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should be treated as not configured when EXTERNAL_API_KEYS is empty string', () => {
      process.env.EXTERNAL_API_KEYS = '';

      requireApiKey({ required: false })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });

    test('should treat comma-only EXTERNAL_API_KEYS as not configured', () => {
      process.env.EXTERNAL_API_KEYS = ',,';

      requireApiKey({ required: false })(req, res, next);

      // No non-empty entries after splitting and trimming
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });

    test('should authenticate with single key in EXTERNAL_API_KEYS (backward compat)', () => {
      process.env.EXTERNAL_API_KEYS = KEY_A;
      req.headers['x-api-key'] = KEY_A;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  //  Key Rotation (EXTERNAL_API_KEYS_PREVIOUS)
  // ──────────────────────────────────────────────

  describe('key rotation — EXTERNAL_API_KEYS_PREVIOUS', () => {
    const OLD_KEY = 'old-rotated-key-that-was-32-chars-long!!';
    const NEW_KEY = 'new-current-key-that-is-also-32-chars!!';

    test('should authenticate with previous key during rotation', () => {
      process.env.EXTERNAL_API_KEYS = NEW_KEY;
      process.env.EXTERNAL_API_KEYS_PREVIOUS = OLD_KEY;
      req.headers['x-api-key'] = OLD_KEY;

      requireApiKey()(req, res, next);

      // Previous key is still accepted
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });

    test('should log deprecation warning when previous key is used', () => {
      process.env.EXTERNAL_API_KEYS = NEW_KEY;
      process.env.EXTERNAL_API_KEYS_PREVIOUS = OLD_KEY;
      req.headers['x-api-key'] = OLD_KEY;

      requireApiKey()(req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        'API Key Auth: Deprecated key used for authentication — rotate to a current key',
        expect.objectContaining({
          prefix: expect.stringMatching(/^.{4}\*\*\*\*$/),
        })
      );
      expect(req.authMethod).toBe('api_key_rotating');
    });

    test('should not log deprecation warning when current key is used', () => {
      process.env.EXTERNAL_API_KEYS = NEW_KEY;
      process.env.EXTERNAL_API_KEYS_PREVIOUS = OLD_KEY;
      req.headers['x-api-key'] = NEW_KEY;

      requireApiKey()(req, res, next);

      const deprecationWarnings = logger.warn.mock.calls.filter(
        ([msg]) => msg && msg.includes('Deprecated key')
      );
      expect(deprecationWarnings).toHaveLength(0);
      expect(req.authMethod).toBe('api_key');
    });

    test('should support rotating from EXTERNAL_API_KEY to EXTERNAL_API_KEYS', () => {
      // Old key was in EXTERNAL_API_KEY, new key is in EXTERNAL_API_KEYS
      process.env.EXTERNAL_API_KEYS_PREVIOUS = OLD_KEY;
      process.env.EXTERNAL_API_KEYS = NEW_KEY;
      req.headers['x-api-key'] = NEW_KEY;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
      expect(req.authMethod).toBe('api_key');
    });

    test('should reject key not in any list during rotation', () => {
      process.env.EXTERNAL_API_KEYS = NEW_KEY;
      process.env.EXTERNAL_API_KEYS_PREVIOUS = OLD_KEY;
      req.headers['x-api-key'] = 'unknown-key-during-rotation-that-is-long!!';

      requireApiKey()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should treat EXTERNAL_API_KEYS_PREVIOUS alone as valid keys (no rotation flag)', () => {
      // If only previous keys are set, there's no active rotation (no current keys to rotate to)
      process.env.EXTERNAL_API_KEYS_PREVIOUS = OLD_KEY;
      req.headers['x-api-key'] = OLD_KEY;

      requireApiKey()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
      // No rotation flag since there are no current keys to migrate to
      expect(req.authMethod).toBe('api_key');
    });

    test('should not log deprecation when only EXTERNAL_API_KEYS_PREVIOUS is set (no active rotation)', () => {
      process.env.EXTERNAL_API_KEYS_PREVIOUS = OLD_KEY;
      req.headers['x-api-key'] = OLD_KEY;

      requireApiKey()(req, res, next);

      // No current keys means this isn't an active rotation — still accepted, no warning
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
      const deprecationWarnings = logger.warn.mock.calls.filter(
        ([msg]) => msg && msg.includes('Deprecated key')
      );
      expect(deprecationWarnings).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────
  //  Edge Cases
  // ──────────────────────────────────────────────

  describe('edge cases', () => {
    test('should handle undefined options gracefully', () => {
      process.env.EXTERNAL_API_KEY = VALID_API_KEY;
      req.headers['x-api-key'] = VALID_API_KEY;

      // No options passed at all
      expect(() => requireApiKey()(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    test('should handle EXTERNAL_API_KEY being empty string', () => {
      process.env.EXTERNAL_API_KEY = '';

      requireApiKey({ required: false })(req, res, next);

      // Treated as not configured (falsy)
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(false);
    });

    test('should handle whitespace-only EXTERNAL_API_KEY', () => {
      process.env.EXTERNAL_API_KEY = '   ';
      req.headers['x-api-key'] = '   ';

      requireApiKey()(req, res, next);

      // Whitespace is a valid string, so it IS configured
      // Authentication succeeds because both sides have same whitespace
      expect(next).toHaveBeenCalled();
      expect(req.authenticatedByApiKey).toBe(true);
    });
  });
});
