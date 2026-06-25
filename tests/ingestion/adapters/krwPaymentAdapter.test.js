// Test for KRW Payment Adapter
// This tests the adapter functionality with mocked dependencies

const krwAdapter = require('../../../src/ingestion/adapters/krwPaymentAdapter');
const kafkaMock = require('../../../src/config/kafka');

// Mock the Kafka producer
jest.mock('../../../src/config/kafka', () => {
  return {
    initKafkaProducer: jest.fn().mockResolvedValue({
      send: jest.fn((payloads, callback) => {
        callback(null, [{ topic: 'payment.krw.processed', partition: 0, offset: 1 }]);
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

describe('KRW Payment Adapter', () => {
  beforeEach(() => {
    kafkaMock.initKafkaProducer.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize Kafka producer', async () => {
    await krwAdapter.startKRWPaymentAdapter();

    expect(kafkaMock.initKafkaProducer).toHaveBeenCalled();
  });

  test('should start sending KRW payment events after initialization', async () => {
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    await krwAdapter.startKRWPaymentAdapter();

    expect(sendMock).toHaveBeenCalled();
  });

  test('should send valid KRW payment event structure', async () => {
    const sendMock = jest.fn();
    kafkaMock.initKafkaProducer.mockResolvedValueOnce({
      send: sendMock,
      close: jest.fn()
    });

    await krwAdapter.startKRWPaymentAdapter();

    const payload = JSON.parse(sendMock.mock.calls[0][0][0].messages);
    expect(payload).toHaveProperty('paymentId');
    expect(payload).toHaveProperty('transactionId');
    expect(payload).toHaveProperty('amount');
    expect(payload).toHaveProperty('currency', 'KRW');
    expect(payload).toHaveProperty('payerId');
    expect(payload).toHaveProperty('payeeId');
    expect(payload).toHaveProperty('paymentMethod');
    expect(payload).toHaveProperty('paymentStatus');
    expect(payload).toHaveProperty('purpose');
    expect(payload).toHaveProperty('processedAt');
    expect(payload).toHaveProperty('source', 'KRW Payment Gateway');
    expect(payload).toHaveProperty('exchangeRate');
    expect(payload.exchangeRate).toHaveProperty('krwToUsd');
    expect(payload).toHaveProperty('tradeFinance');
    expect(payload.tradeFinance).toHaveProperty('letterOfCredit');
    expect(payload.tradeFinance).toHaveProperty('escrowService');
    expect(payload.tradeFinance).toHaveProperty('financingTerm');
    expect(['bank_transfer', 'card', 'mobile_wallet', 'escrow']).toContain(payload.paymentMethod);
    expect(['pending', 'processing', 'completed', 'failed', 'refunded']).toContain(payload.paymentStatus);
  });

  test('should run degraded mode when Kafka initialization fails', async () => {
    kafkaMock.initKafkaProducer.mockRejectedValueOnce(new Error('Kafka unavailable'));

    await expect(krwAdapter.startKRWPaymentAdapter()).resolves.not.toThrow();
  });

  test('should export startKRWPaymentAdapter as a function', () => {
    expect(typeof krwAdapter.startKRWPaymentAdapter).toBe('function');
  });
});
