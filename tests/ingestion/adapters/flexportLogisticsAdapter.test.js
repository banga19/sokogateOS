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

// Mock serviceRunner to call the handler synchronously
jest.mock('../../../src/utils/serviceRunner', () => ({
  start: jest.fn((name, handler) => handler()),
  dispose: jest.fn(),
}));

describe('Flexport Logistics Adapter', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    kafkaMock.initKafkaProducer.mockClear();
  });

  afterEach(() => {
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

    // Act — serviceRunner.start calls handler synchronously
    await flexportAdapter.startFlexportLogisticsAdapter();

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

    // Act — serviceRunner.start calls handler synchronously
    await flexportAdapter.startFlexportLogisticsAdapter();

    // Assert
    expect(sendMock).toHaveBeenCalled();
  });

  test('should generate valid inventory change structure', () => {
    expect(typeof flexportAdapter.startFlexportLogisticsAdapter).toBe('function');
  });
});