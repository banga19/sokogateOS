// Test for Supplier Risk Adapter
// This tests the adapter functionality with mocked dependencies

const riskAdapter = require('../../../src/ingestion/adapters/supplierRiskAdapter');
const kafkaMock = require('../../../src/config/kafka');

// Mock the Kafka producer
jest.mock('../../../src/config/kafka', () => {
  return {
    initKafkaProducer: jest.fn().mockResolvedValue({
      send: jest.fn((payloads, callback) => {
        callback(null, [{ topic: 'supplier.risk.updated', partition: 0, offset: 1 }]);
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

describe('Supplier Risk Adapter', () => {
  beforeEach(() => {
    kafkaMock.initKafkaProducer.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize Kafka producer', async () => {
    await riskAdapter.startSupplierRiskAdapter();

    expect(kafkaMock.initKafkaProducer).toHaveBeenCalled();
  });

  test('should start sending risk updates after initialization', async () => {
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    await riskAdapter.startSupplierRiskAdapter();

    expect(sendMock).toHaveBeenCalled();
  });

  test('should send valid risk update structure', async () => {
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    await riskAdapter.startSupplierRiskAdapter();

    const payload = JSON.parse(sendMock.mock.calls[0][0][0].messages);
    expect(payload).toHaveProperty('supplierId');
    expect(payload).toHaveProperty('riskScore');
    expect(payload).toHaveProperty('riskLevel');
    expect(payload).toHaveProperty('riskFactors');
    expect(payload).toHaveProperty('assessedAt');
    expect(payload).toHaveProperty('source', 'Supplier Risk System');
    expect(payload).toHaveProperty('assessmentMethod');
    expect(['low', 'medium', 'high', 'critical']).toContain(payload.riskLevel);
    expect(payload.riskScore).toBeGreaterThanOrEqual(0);
    expect(payload.riskScore).toBeLessThanOrEqual(100);
  });

  test('should run degraded mode when Kafka initialization fails', async () => {
    kafkaMock.initKafkaProducer.mockRejectedValueOnce(new Error('Kafka unavailable'));

    // Should not throw
    await expect(riskAdapter.startSupplierRiskAdapter()).resolves.not.toThrow();
  });

  test('should export startSupplierRiskAdapter as a function', () => {
    expect(typeof riskAdapter.startSupplierRiskAdapter).toBe('function');
  });
});
