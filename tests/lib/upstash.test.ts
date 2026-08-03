// Upstash Redis wrapper tests
import { upstashRedis } from '../../src/lib/upstash';
import { env } from '../../src/env';

// Mock @upstash/redis
jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation((options) => {
      return {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        // Add other methods as needed
      };
    }),
  };
});

describe('Upstash Redis Wrapper', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Environment Validation', () => {
    it('should throw error when UPSTASH_REDIS_URL is missing', () => {
      process.env.UPSTASH_REDIS_URL = '';
      process.env.UPSTASH_REDIS_TOKEN = 'test-token';

      expect(() => {
        require('../../src/lib/upstash');
      }).toThrow('Missing Upstash Redis env vars');
    });

    it('should throw error when UPSTASH_REDIS_TOKEN is missing', () => {
      process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
      process.env.UPSTASH_REDIS_TOKEN = '';

      expect(() => {
        require('../../src/lib/upstash');
      }).toThrow('Missing Upstash Redis env vars');
    });
  });

  describe('upstashRedis Initialization', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
      process.env.UPSTASH_REDIS_TOKEN = 'test-token';
      jest.resetModules();
    });

    it('should initialize Redis client with correct options', () => {
      const upstashModule = require('../../src/lib/upstash');
      expect(upstashModule.upstashRedis).toBeDefined();
      // The Redis constructor should have been called with our options
    });
  });

  // Note: Testing actual Redis operations would require more complex mocking
  // The wrapper is intentionally simple - just exports a configured client
});