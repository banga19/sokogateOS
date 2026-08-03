// Pinecone wrapper tests
import { pineconeClient, initPinecone, queryIndex } from '../../src/lib/pinecone';
import { env } from '../../src/env';

// Mock Pinecone client
jest.mock('@pinecone-database/pinecone', () => {
  return {
    PineconeClient: jest.fn().mockImplementation(() => {
      return {
        init: jest.fn().mockResolvedValue(undefined),
        Index: jest.fn().mockReturnValue({
          query: jest.fn().mockResolvedValue({
            matches: [],
            namespace: '',
          }),
        }),
      };
    }),
  };
});

describe('Pinecone Wrapper', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Environment Validation', () => {
    it('should throw error when PINECONE_API_KEY is missing', () => {
      process.env.PINECONE_API_KEY = '';
      process.env.PINECONE_ENVIRONMENT = 'test-env';

      expect(() => {
        require('../../src/lib/pinecone');
      }).toThrow('Missing Pinecone env vars (PINECONE_API_KEY or PINECONE_ENVIRONMENT)');
    });

    it('should throw error when PINECONE_ENVIRONMENT is missing', () => {
      process.env.PINECONE_API_KEY = 'test-key';
      process.env.PINECONE_ENVIRONMENT = '';

      expect(() => {
        require('../../src/lib/pinecone');
      }).toThrow('Missing Pinecone env vars (PINECONE_API_KEY or PINECONE_ENVIRONMENT)');
    });
  });

  describe('pineconeClient Initialization', () => {
    beforeEach(() => {
      process.env.PINECONE_API_KEY = 'test-pinecone-key';
      process.env.PINECONE_ENVIRONMENT = 'test-env';
      jest.resetModules();
    });

    it('should create a PineconeClient instance', () => {
      const pineconeModule = require('../../src/lib/pinecone');
      expect(pineconeModule.pineconeClient).toBeDefined();
    });
  });

  describe('initPinecone Function', () => {
    beforeEach(() => {
      process.env.PINECONE_API_KEY = 'test-pinecone-key';
      process.env.PINECONE_ENVIRONMENT = 'test-env';
      jest.resetModules();
    });

    it('should call pineconeClient.init with correct parameters', async () => {
      const pineconeModule = require('../../src/lib/pinecone');
      await pineconeModule.initPinecone();

      expect(pineconeModule.pineconeClient.init).toHaveBeenCalledTimes(1);
      expect(pineconeModule.pineconeClient.init).toHaveBeenCalledWith({
        apiKey: 'test-pinecone-key',
        environment: 'test-env',
      });
    });
  });

  describe('queryIndex Function', () => {
    beforeEach(() => {
      process.env.PINECONE_API_KEY = 'test-pinecone-key';
      process.env.PINECONE_ENVIRONMENT = 'test-env';
      jest.resetModules();
    });

    it('should query an index with correct parameters', async () => {
      const pineconeModule = require('../../src/lib/pinecone');
      await pineconeModule.initPinecone(); // Initialize first

      const vector = [0.1, 0.2, 0.3];
      const indexName = 'test-index';
      const topK = 10;

      const result = await pineconeModule.queryIndex(indexName, vector, topK);

      expect(pineconeModule.pineconeClient.Index).toHaveBeenCalledWith(indexName);
      expect(pineconeModule.pineconeClient.Index(indexName).query).toHaveBeenCalledWith({
        vector,
        topK,
        includeMetadata: true,
      });
      expect(result).toHaveProperty('matches');
    });
  });
});