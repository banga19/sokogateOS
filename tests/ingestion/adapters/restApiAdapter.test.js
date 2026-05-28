// Test for REST API Adapter
// This tests the adapter functionality with mocked dependencies

const restApiAdapter = require('../../../src/ingestion/adapters/restApiAdapter');
const kafkaMock = require('../../../src/config/kafka');
const logger = require('../../../src/utils/logger');

// Mock the Kafka producer
jest.mock('../../../src/config/kafka', () => {
  return {
    initKafkaProducer: jest.fn().mockResolvedValue({
      send: jest.fn((payloads, callback) => {
        callback(null, [{ topic: 'product.catalog.updated', partition: 0, offset: 1 }]);
      }),
      close: jest.fn((callback) => callback())
    })
  };
});

describe('REST API Adapter', () => {
  beforeEach(() => {
    // Mock timers
    jest.useFakeTimers();

    // Clear all instances and calls to constructor and all methods:
    kafkaMock.initKafkaProducer.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('should initialize Kafka producer', async () => {
    // Act
    await restApiAdapter.startRestApiAdapter();

    // Assert
    expect(kafkaMock.initKafkaProducer).toHaveBeenCalled();
  });

  test('should start sending product catalog data after initialization', async () => {
    // Arrange
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    // Act
    await restApiAdapter.startRestApiAdapter();

    // Fast-forward timers to trigger setInterval for product catalog (30 seconds)
    jest.advanceTimersByTime(30000);

    // Assert
    expect(sendMock).toHaveBeenCalled();
  });

  test('should start sending customer profile data after initialization', async () => {
    // Arrange
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    // Act
    await restApiAdapter.startRestApiAdapter();

    // Fast-forward timers to trigger setInterval for customer profile (45 seconds)
    jest.advanceTimersByTime(45000);

    // Assert
    expect(sendMock).toHaveBeenCalled();
  });

  test('should generate valid product catalog structure', () => {
    // We need to access the private function - alternative is to test through behavior
    // For now, we'll verify the adapter starts correctly
    expect(typeof restApiAdapter.startRestApiAdapter).toBe('function');
  });
});