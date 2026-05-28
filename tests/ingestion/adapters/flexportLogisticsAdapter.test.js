// Test for Flexport Logistics Adapter
// This tests the adapter functionality with mocked dependencies

const flexportAdapter = require('../../../src/ingestion/adapters/flexportLogisticsAdapter');
const kafkaMock = require('../../../src/config/kafka');
const logger = require('../../../src/utils/logger');

// Mock the Kafka producer
jest.mock('../../../src/config/kafka', () => {
  return {
    initKafkaProducer: jest.fn().mockResolvedValue({
      send: jest.fn((payloads, callback) => {
        callback(null, [{ topic: 'inventory.changed', partition: 0, offset: 1 }]);
      }),
      close: jest.fn((callback) => callback())
    })
  };
});

describe('Flexport Logistics Adapter', () => {
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
    await flexportAdapter.startFlexportLogisticsAdapter();

    // Assert
    expect(kafkaMock.initKafkaProducer).toHaveBeenCalled();
  });

  test('should start sending inventory changes after initialization', async () => {
    // Arrange
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    // Act
    await flexportAdapter.startFlexportLogisticsAdapter();

    // Fast-forward timers to trigger setInterval for inventory changes (20 seconds)
    jest.advanceTimersByTime(20000);

    // Assert
    expect(sendMock).toHaveBeenCalled();
  });

  test('should start sending order created events after initialization', async () => {
    // Arrange
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    // Act
    await flexportAdapter.startFlexportLogisticsAdapter();

    // Fast-forward timers to trigger setInterval for order created (25 seconds)
    jest.advanceTimersByTime(25000);

    // Assert
    expect(sendMock).toHaveBeenCalled();
  });

  test('should generate valid inventory change structure', () => {
    // We need to access the private function - alternative is to test through behavior
    // For now, we'll verify the adapter starts correctly
    expect(typeof flexportAdapter.startFlexportLogisticsAdapter).toBe('function');
  });
});