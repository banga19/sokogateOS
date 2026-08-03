// PostHog wrapper tests
import { track } from '../../src/lib/posthog';
import { env } from '../../src/env';

describe('PostHog Wrapper', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('Environment Validation', () => {
    it('should throw error when POSTHOG_API_KEY is missing', () => {
      process.env.POSTHOG_API_KEY = '';

      expect(() => {
        // We need to reset the module cache to get a fresh copy
        jest.resetModules();
        require('../../src/lib/posthog');
      }).toThrow('Missing POSTHOG_API_KEY env var');
    });
  });

  describe('posthog Initialization', () => {
    beforeEach(() => {
      process.env.POSTHOG_API_KEY = 'test-posthog-key';
      process.env.POSTHOG_HOST = 'https://test.posthog.com';
    });

    it('should initialize posthog with correct config', () => {
      // Reset module cache and mock posthog-js before requiring
      jest.resetModules();
      const mockPosthogInit = jest.fn();
      const mockPosthogCapture = jest.fn();

      jest.mock('posthog-js', () => ({
        __esModule: true,
        default: {
          init: mockPosthogInit,
          capture: mockPosthogCapture,
        },
      }));

      const posthogModule = require('../../src/lib/posthog');

      expect(mockPosthogInit).toHaveBeenCalledWith(
        'test-posthog-key',
        expect.objectContaining({
          api_host: 'https://test.posthog.com',
          capture_pageview: false,
        }),
      );
    });
  });

  describe('track Function', () => {
    beforeEach(() => {
      process.env.POSTHOG_API_KEY = 'test-posthog-key';
    });

    it('should call posthog.capture with correct parameters', () => {
      // Reset module cache and mock posthog-js before requiring
      jest.resetModules();
      const mockPosthogInit = jest.fn();
      const mockPosthogCapture = jest.fn();

      jest.mock('posthog-js', () => ({
        __esModule: true,
        default: {
          init: mockPosthogInit,
          capture: mockPosthogCapture,
        },
      }));

      const posthogModule = require('../../src/lib/posthog');

      posthogModule.track('test_event', { key: 'value' });

      expect(mockPosthogCapture).toHaveBeenCalledWith(
        'test_event',
        { key: 'value' },
      );
    });
  });
});