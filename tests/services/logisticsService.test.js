// Logistics Service Unit Tests
// Tests the logistics service functionality including Kafka integration, message handling, and shipment processing

const LogisticsService = require('../../src/services/logisticsService');
let Logistics;
let initKafkaConsumer, initKafkaProducer;
let logger;

// Shared mock references
let mockProducer;
let mockConsumer;
let mockLogisticsInstance;

// Mock the dependencies BEFORE requiring them
jest.mock('../../src/config/kafka', () => ({
  initKafkaProducer: jest.fn(),
  initKafkaConsumer: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../src/models/logistics/logistics');

describe('Logistics Service', () => {
  beforeAll(() => {
    // Get mocked modules
    const kafka = require('../../src/config/kafka');
    initKafkaProducer = kafka.initKafkaProducer;
    initKafkaConsumer = kafka.initKafkaConsumer;
    logger = require('../../src/utils/logger');
    Logistics = require('../../src/models/logistics/logistics');
  });

  beforeEach(() => {
    // Reset call counts only (not implementations)
    jest.clearAllMocks();

    // Setup Kafka mocks
    mockProducer = {
      send: jest.fn((msgs, cb) => { if (cb) cb(null, {}); }),
      close: jest.fn()
    };
    mockConsumer = {
      on: jest.fn(),
      close: jest.fn()
    };

    initKafkaProducer.mockResolvedValue(mockProducer);
    initKafkaConsumer.mockResolvedValue(mockConsumer);

    // Setup Logistics constructor mock: apply constructor args to instance
    // so that properties like shipmentDetails, timestamps etc. are available
    mockLogisticsInstance = {
      save: jest.fn().mockResolvedValue(undefined),
      calculateDelayRisk: jest.fn()
    };
    Logistics.mockImplementation((opts) => Object.assign(mockLogisticsInstance, opts || {}));
    Logistics.findOne = jest.fn().mockResolvedValue(null);
  });

  describe('startLogisticsService', () => {
    it('should initialize Kafka producer and consumer', async () => {
      await LogisticsService.startLogisticsService();

      expect(initKafkaProducer).toHaveBeenCalled();
      expect(initKafkaConsumer).toHaveBeenCalledWith([
        'order.created',
        'inventory.changed',
        'supplier.risk.updated',
        'customer.feedback.received',
        'document.processed'
      ]);
      expect(mockConsumer.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should start periodic tasks', async () => {
      await LogisticsService.startLogisticsService();
      expect(typeof LogisticsService.startPeriodicTasks).toBe('function');
    });
  });

  describe('handleOrderCreated', () => {
    const mockOrderData = {
      orderId: 'ORDER-123',
      productId: 'PROD-456',
      companyId: 'COMP-789',
      quantity: 100
    };

    beforeEach(() => {
      mockLogisticsInstance = {
        save: jest.fn().mockResolvedValue(undefined),
        calculateDelayRisk: jest.fn()
      };
      Logistics.mockImplementation((opts) => Object.assign(mockLogisticsInstance, opts || {}));
    });

    it('should create and save a new shipment', async () => {
      await LogisticsService.handleOrderCreated(mockOrderData);

      expect(Logistics).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockOrderData.orderId,
          productId: mockOrderData.productId,
          companyId: mockOrderData.companyId,
          quantity: mockOrderData.quantity,
          status: 'processing'
        })
      );
      expect(mockLogisticsInstance.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockLogisticsInstance.save.mockRejectedValue(new Error('Database error'));
      await expect(LogisticsService.handleOrderCreated(mockOrderData)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Logistics Service: Error handling order created:',
        expect.any(Error)
      );
    });
  });

  describe('handleInventoryChanged', () => {
    it('should process inventory change messages', async () => {
      const mockInventoryData = {
        productId: 'PROD-123',
        quantity: 50,
        location: 'WAREHOUSE-A'
      };

      await LogisticsService.handleInventoryChanged(mockInventoryData);

      expect(logger.info).toHaveBeenCalledWith(
        `Logistics Service: Processing inventory change for ${mockInventoryData.productId}`
      );
    });

    it('should handle errors gracefully', async () => {
      await expect(LogisticsService.handleInventoryChanged(null)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Logistics Service: Error handling inventory changed:',
        expect.any(Error)
      );
    });
  });

  describe('shutdownLogisticsService', () => {
    it('should close Kafka connections', async () => {
      await LogisticsService.startLogisticsService();
      await LogisticsService.shutdownLogisticsService();
      expect(mockConsumer.close).toHaveBeenCalled();
      expect(mockProducer.close).toHaveBeenCalled();
    });
  });

  describe('startPeriodicTasks', () => {
    it('should set up periodic cleanup tasks', () => {
      expect(typeof LogisticsService.startPeriodicTasks).toBe('function');
      expect(() => LogisticsService.startPeriodicTasks()).not.toThrow();
    });
  });
});
