// Clerk wrapper tests
import { env } from '../../src/env';

// Mock @clerk/clerk-react before importing the clerk module
jest.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }) => children,
}));

describe('Clerk Wrapper', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CLERK_PUBLISHABLE_KEY = 'test-publishable-key';
    process.env.CLERK_SECRET_KEY = 'test-secret-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('Environment Validation', () => {
    it('should throw error when CLERK_PUBLISHABLE_KEY is missing', () => {
      process.env.CLERK_PUBLISHABLE_KEY = '';

      expect(() => {
        // We need to reset the module cache to get a fresh copy
        jest.resetModules();
        require('../../src/lib/clerk');
      }).toThrow('Missing Clerk env vars');
    });

    it('should throw error when CLERK_SECRET_KEY is missing', () => {
      process.env.CLERK_SECRET_KEY = '';

      expect(() => {
        require('../../src/lib/clerk');
      }).toThrow('Missing Clerk env vars');
    });
  });

  describe('initClerk Function', () => {
    it('should return an object with publishableKey and secretKey', () => {
      const clerkModule = require('../../src/lib/clerk');
      const result = clerkModule.initClerk();

      expect(result).toHaveProperty('publishableKey', 'test-publishable-key');
      expect(result).toHaveProperty('secretKey', 'test-secret-key');
    });
  });

  describe('ClerkProvider Export', () => {
    it('should export ClerkProvider', () => {
      jest.resetModules();
      const clerkModule = require('../../src/lib/clerk');
      // Just check that it exports something - the actual value doesn't matter due to mocking
      expect(clerkModule.ClerkProvider).toBeDefined();
    });
  });
});