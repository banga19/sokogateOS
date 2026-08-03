// Neon wrapper tests
import { neonPool } from '../../src/lib/neon';
import { env } from '../../src/env';

// Mock neon serverless
jest.mock('@neondatabase/serverless', () => {
  return {
    createPool: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [] }),
          release: jest.fn(),
        }),
      };
    }),
  };
});

describe('Neon Wrapper', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('Environment Validation', () => {
    it('should throw error when NEON_DATABASE_URL is missing', () => {
      process.env.NEON_DATABASE_URL = '';

      expect(() => {
        // We need to reset the module cache to get a fresh copy
        jest.resetModules();
        require('../../src/lib/neon');
      }).toThrow('Missing NEON_DATABASE_URL env var');
    });
  });

  describe('neonPool Initialization', () => {
    beforeEach(() => {
      process.env.NEON_DATABASE_URL = 'postgres://user:pass@localhost/db';
      jest.resetModules();
    });

    it('should create a connection pool', () => {
      const neonModule = require('../../src/lib/neon');
      expect(neonModule.neonPool).toBeDefined();
      // Optionally, we can check that createPool was called with the correct URL
      // but we don't have access to the mock here because we reset the modules.
      // We'll just check that the pool is defined.
    });
  });
});