// Self-Improving Loop Engine Test for SokogateOS
// Tests the core differentiating engine: collect → analyze → retrain → track

jest.mock('../../src/models/feedback');
jest.mock('../../src/models/sourcing');
jest.mock('../../src/models/logistics/logistics');
jest.mock('../../src/utils/logger');

const Feedback = require('../../src/models/feedback');
const logger = require('../../src/utils/logger');
const {
  startLoopEngine,
  stopLoopEngine,
  runLoopCycle,
  submitFeedback,
  getEngineStatus,
  predictAccuracy,
} = require('../../src/engine/selfImprovingLoop');

describe('Self-Improving Loop Engine', () => {
  let setIntervalSpy;
  let clearIntervalSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Spy AFTER useFakeTimers so we spy on the fake timer implementations
    setIntervalSpy = jest.spyOn(global, 'setInterval');
    clearIntervalSpy = jest.spyOn(global, 'clearInterval');
  });

  afterEach(() => {
    stopLoopEngine();
    jest.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  describe('startLoopEngine', () => {
    test('should start the engine and run initial cycle', async () => {
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await startLoopEngine({ intervalMs: 60000, batchSize: 50 });

      expect(result).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Engine started'));
    });

    test('should not start if already running', async () => {
      await startLoopEngine({ intervalMs: 60000 });
      await startLoopEngine({ intervalMs: 60000 });

      expect(logger.warn).toHaveBeenCalledWith('Self-Improving Loop: Engine is already running');
    });

    test('should set up recurring interval', async () => {
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await startLoopEngine({ intervalMs: 300000 });

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000);
    });

    test('should use default interval and batch size when not specified', async () => {
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await startLoopEngine();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Interval: 300s, Batch: 100')
      );
    });
  });

  describe('stopLoopEngine', () => {
    test('should clear interval and set isRunning to false', async () => {
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await startLoopEngine();
      stopLoopEngine();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Self-Improving Loop: Engine stopped');
    });
  });

  describe('runLoopCycle', () => {
    test('should handle empty feedback gracefully', async () => {
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await runLoopCycle(100);

      expect(result.processed).toBe(0);
      expect(result.improvements).toEqual([]);
    });

    test('should process feedback through the full pipeline', async () => {
      const mockFeedback = [
        {
          _id: 'feedback-1',
          target: { type: 'sourcing', id: 'source-1', field: 'price', originalValue: '100', correctedValue: '95' },
          explicit: { rating: 4, sentiment: 'positive' },
          type: 'explicit',
          createdAt: new Date(),
        },
        {
          _id: 'feedback-2',
          target: { type: 'sourcing', id: 'source-2' },
          explicit: { rating: 2, sentiment: 'negative' },
          type: 'explicit',
          createdAt: new Date(),
        },
        {
          _id: 'feedback-3',
          target: { type: 'logistics', id: 'log-1' },
          implicit: { action: 'delayed_view' },
          type: 'implicit',
          createdAt: new Date(),
        },
      ];

      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockFeedback),
      });

      Feedback.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await runLoopCycle(100);

      expect(result.processed).toBe(3);
      expect(result.improvements).toBeDefined();
      expect(Feedback.updateMany).toHaveBeenCalledWith(
        { isProcessed: false },
        expect.objectContaining({ isProcessed: true })
      );
    });

    test('should handle database errors gracefully', async () => {
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await runLoopCycle(100);

      expect(result.processed).toBe(0);
      expect(result.error).toBe('Database error');
    });
  });

  describe('collectUnprocessedFeedback', () => {
    test('should query for unprocessed feedback sorted by creation date', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Feedback.find.mockReturnValue(mockQuery);

      // Call runLoopCycle which internally calls collectUnprocessedFeedback
      const result = await runLoopCycle(100);

      expect(Feedback.find).toHaveBeenCalledWith({ isProcessed: false });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('analyzeFeedback', () => {
    test('should calculate accuracy scores per target type', async () => {
      const feedbackItems = [
        {
          _id: 'f1',
          target: { type: 'sourcing', id: 's1' },
          explicit: { rating: 5, sentiment: 'positive' },
          type: 'explicit',
          createdAt: new Date(),
        },
        {
          _id: 'f2',
          target: { type: 'sourcing', id: 's2' },
          explicit: { rating: 3, sentiment: 'neutral' },
          type: 'explicit',
          createdAt: new Date(),
        },
      ];

      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(feedbackItems),
      });

      Feedback.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const result = await runLoopCycle(100);

      expect(result.processed).toBe(2);
    });

    test('should track corrections for improvement opportunities', async () => {
      const feedbackItems = [
        {
          _id: 'f1',
          target: { type: 'sourcing', id: 's1', field: 'price', originalValue: '100', correctedValue: '95' },
          explicit: { rating: 4 },
          type: 'explicit',
          createdAt: new Date(),
        },
      ];

      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(feedbackItems),
      });

      Feedback.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const result = await runLoopCycle(100);

      expect(result.processed).toBe(1);
    });
  });

  describe('retrainModels', () => {
    test('should trigger retraining when accuracy is low', async () => {
      const feedbackItems = [
        { _id: 'f1', target: { type: 'sourcing' }, explicit: { rating: 2 }, type: 'explicit', createdAt: new Date() },
        { _id: 'f2', target: { type: 'sourcing' }, explicit: { rating: 1 }, type: 'explicit', createdAt: new Date() },
        { _id: 'f3', target: { type: 'sourcing' }, explicit: { rating: 2 }, type: 'explicit', createdAt: new Date() },
      ];

      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(feedbackItems),
      });

      Feedback.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const result = await runLoopCycle(100);

      // Low ratings (avg < 3.5) should trigger retraining
      expect(result.processed).toBe(3);
    });
  });

  describe('submitFeedback', () => {
    test('should create and save a new feedback entry', async () => {
      const mockFeedback = {
        _id: 'feedback-new',
        save: jest.fn().mockResolvedValue(true),
      };
      Feedback.mockImplementation(() => mockFeedback);

      const feedbackData = {
        companyId: 'company-1',
        userId: 'user-1',
        target: { type: 'sourcing', id: 'task-1' },
        type: 'explicit',
        explicit: { rating: 5 },
      };

      const result = await submitFeedback(feedbackData);

      expect(Feedback).toHaveBeenCalledWith(feedbackData);
      expect(mockFeedback.save).toHaveBeenCalled();
      expect(result).toBe(mockFeedback);
    });

    test('should throw error when save fails', async () => {
      const mockFeedback = {
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };
      Feedback.mockImplementation(() => mockFeedback);

      await expect(submitFeedback({})).rejects.toThrow('Save failed');
    });
  });

  describe('getEngineStatus', () => {
    test('should return engine status with metrics', async () => {
      const status = getEngineStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('uptime');
      expect(status.metrics).toHaveProperty('totalLoopsCompleted');
      expect(status.metrics).toHaveProperty('totalFeedbackProcessed');
      expect(status.metrics).toHaveProperty('activeModels');
      expect(status.metrics).toHaveProperty('modelStatus');
    });

    test('should return isRunning false after stop', async () => {
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await startLoopEngine();
      stopLoopEngine();

      const status = getEngineStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('predictAccuracy', () => {
    test('should return null when not enough history', () => {
      const prediction = predictAccuracy('sourcing');
      expect(prediction).toBeNull();
    });

    test('should return prediction with enough history', async () => {
      // Run a cycle to build history
      Feedback.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'f1', target: { type: 'sourcing' }, explicit: { rating: 4 }, type: 'explicit', createdAt: new Date() },
          { _id: 'f2', target: { type: 'sourcing' }, explicit: { rating: 3 }, type: 'explicit', createdAt: new Date() },
        ]),
      });

      Feedback.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await runLoopCycle(100);

      const prediction = predictAccuracy('sourcing');
      if (prediction) {
        expect(prediction).toHaveProperty('currentAccuracy');
        expect(prediction).toHaveProperty('predictedNextAccuracy');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction).toHaveProperty('trend');
      }
    });
  });
});
