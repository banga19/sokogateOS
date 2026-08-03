// Coderabbit widget tests
import { env } from '../../src/env';

describe('CoderabbitWidget', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('Environment Validation', () => {
    it('should throw error when CODERABBIT_API_KEY is missing', () => {
      process.env.CODERABBIT_API_KEY = '';
      expect(() => {
        require('../../src/lib/coderabbit.tsx');
      }).toThrow('Missing CODERABBIT_API_KEY env var');
    });
  });

  describe('Component Export', () => {
    it('should export CoderabbitWidget component', () => {
      process.env.CODERABBIT_API_KEY = 'test-key';
      const module = require('../../src/lib/coderabbit.tsx');
      expect(module.CoderabbitWidget).toBeDefined();
      expect(typeof module.CoderabbitWidget).toBe('function');
    });
  });
});