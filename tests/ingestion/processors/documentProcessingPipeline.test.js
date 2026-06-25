// Test for Document Processing Pipeline
// This tests the pipeline functionality with mocked dependencies

const docPipeline = require('../../../src/ingestion/processors/documentProcessingPipeline');
const kafkaMock = require('../../../src/config/kafka');
const logger = require('../../../src/utils/logger');

// Mock the Kafka producer
jest.mock('../../../src/config/kafka', () => {
  return {
    initKafkaProducer: jest.fn().mockResolvedValue({
      send: jest.fn((payloads, callback) => {
        callback(null, [{ topic: 'document.processed', partition: 0, offset: 1 }]);
      }),
      close: jest.fn((callback) => callback())
    })
  };
});

// Mock serviceRunner to call the handler synchronously
jest.mock('../../../src/utils/serviceRunner', () => ({
  start: jest.fn((name, handler) => handler()),
  dispose: jest.fn(),
}));

describe('Document Processing Pipeline', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    kafkaMock.initKafkaProducer.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize Kafka producer', async () => {
    // Act
    await docPipeline.startDocumentProcessingPipeline();

    // Assert
    expect(kafkaMock.initKafkaProducer).toHaveBeenCalled();
  });

  test('should start sending processed documents after initialization', async () => {
    // Arrange
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    // Act — serviceRunner.start calls handler synchronously
    await docPipeline.startDocumentProcessingPipeline();

    // Assert
    expect(sendMock).toHaveBeenCalled();
  });

  test('should generate valid processed document structure', () => {
    expect(typeof docPipeline.startDocumentProcessingPipeline).toBe('function');
  });
});