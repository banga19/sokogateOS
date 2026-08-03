// Sentry wrapper tests
import { Sentry } from '../../src/lib/sentry';
import { env } from '../../src/env';

// Mock Sentry
jest.mock('@sentry/node', () => {
  return {
    init: jest.fn(),
    captureException: jest.fn(),
  };
});

describe('Sentry Wrapper', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('Environment Validation', () => {
    it('should throw error when SENTRY_DSN is missing', () => {
      process.env.SENTRY_DSN = '';

      expect(() => {
        // We need to reset the module cache to get a fresh copy
        jest.resetModules();
        require('../../src/lib/sentry');
      }).toThrow('Missing SENTRY_DSN env var');
    });
  });

  describe('Sentry Initialization', () => {
    beforeEach(() => {
      process.env.SENTRY_DSN = 'https://test@test.ing/123';
      jest.resetModules();
    });

    it('should initialize Sentry with correct DSN', () => {
      const sentryModule = require('../../src/lib/sentry');
      expect(sentryModule.Sentry.init).toHaveBeenCalledWith({
        dsn: 'https://test@test.ing/123',
        tracesSampleRate: 1.0,
      });
    });
  });
});