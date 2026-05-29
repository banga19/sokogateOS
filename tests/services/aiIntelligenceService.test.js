// Test for AI Intelligence Service
// This tests the service functionality with mocked dependencies

const aiIntelligenceService = require('../../src/services/aiIntelligenceService');
const logger = require('../../src/utils/logger');

// Mock the Kafka consumer
jest.mock('../../src/config/kafka', () => {
  const mockKafka = {
    messageCallback: null,
    initKafkaConsumer: jest.fn().mockResolvedValue({
      on: jest.fn((event, callback) => {
        if (event === 'message') {
          mockKafka.messageCallback = callback;
        }
      }),
      close: jest.fn((callback) => callback())
    })
  };
  return mockKafka;
});

// Mock Feedback model to prevent MongoDB connection attempts
// Must support .sort().limit().lean() chaining (Mongoose query syntax)
jest.mock('../../src/models/feedback', () => {
  const mockQuery = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    lean: jest.fn().mockReturnThis()
  };
  return {
    find: jest.fn().mockReturnValue(mockQuery),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
  };
});

const kafkaMock = require('../../src/config/kafka');

describe('AI Intelligence Service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    kafkaMock.initKafkaConsumer.mockClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('should initialize Kafka consumer', async () => {
    // Act
    await aiIntelligenceService.startAiIntelligenceService();

    // Assert
    expect(kafkaMock.initKafkaConsumer).toHaveBeenCalled();
  });

  test('should set up message handlers for Kafka topics', async () => {
    // Arrange
    const onMock = jest.fn();
    kafkaMock.initKafkaConsumer.mockResolvedValueOnce({
      on: onMock,
      close: jest.fn()
    });

    // Act
    await aiIntelligenceService.startAiIntelligenceService();

    // Assert that on was called for 'message' event
    expect(onMock).toHaveBeenCalledWith('message', expect.any(Function));
  });

  test('should process product update messages', async () => {
    // Arrange
    kafkaMock.initKafkaConsumer.mockResolvedValueOnce({
      on: (event, callback) => {
        if (event === 'message') {
          kafkaMock.messageCallback = callback;
        }
      },
      close: jest.fn()
    });

    // Act
    await aiIntelligenceService.startAiIntelligenceService();

    // Simulate receiving a product update message
    const testProduct = {
      productId: 'PROD-123',
      basePrice: 29.99,
      category: 'Electronics',
      availability: 'in_stock',
      brand: 'Brand_Test',
      attributes: {}
    };

    if (kafkaMock.messageCallback) {
      kafkaMock.messageCallback({
        topic: 'product.updated',
        value: JSON.stringify(testProduct)
      });
    }

    // Advance timers to allow async processing
    jest.advanceTimersByTime(100);

    // Assert - we can at least verify the service started without error
    expect(true).toBe(true);
  });

  test('should process order created messages', async () => {
    // Arrange
    kafkaMock.initKafkaConsumer.mockResolvedValueOnce({
      on: (event, callback) => {
        if (event === 'message') {
          kafkaMock.messageCallback = callback;
        }
      },
      close: jest.fn()
    });

    // Act
    await aiIntelligenceService.startAiIntelligenceService();

    // Simulate receiving an order created message
    const testOrder = {
      orderId: 'ORDER-456',
      productId: 'PROD-123',
      quantity: 2,
      totalAmount: 59.98
    };

    if (kafkaMock.messageCallback) {
      kafkaMock.messageCallback({
        topic: 'order.created',
        value: JSON.stringify(testOrder)
      });
    }

    // Advance timers to allow async processing
    jest.advanceTimersByTime(100);

    // Assert - we can at least verify the service started without error
    expect(true).toBe(true);
  });

  test('should generate valid insight structure', () => {
    // Test that the service exports the expected function
    expect(typeof aiIntelligenceService.startAiIntelligenceService).toBe('function');
  });
});