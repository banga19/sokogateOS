// ServiceRunner Unit Tests for SokogateOS
// Tests the managed interval runner: start, stop, dispose, backpressure, error isolation, metrics

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const { ServiceRunner } = require('../../src/utils/serviceRunner');
const defaultRunner = require('../../src/utils/serviceRunner');

describe('ServiceRunner', () => {
  /** @type {ServiceRunner} */
  let runner;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    runner = new ServiceRunner();
  });

  afterEach(() => {
    runner.dispose();
    jest.useRealTimers();
  });

  // ── start() ──────────────────────────────────────────────────────

  describe('start', () => {
    test('should register and start a service with given interval', () => {
      const handler = jest.fn();

      runner.start('my-service', handler, 5000);

      const status = runner.getStatus();
      expect(status.running).toBe(true);
      expect(status.services).toHaveLength(1);
      expect(status.services[0].name).toBe('my-service');
      expect(status.services[0].intervalMs).toBe(5000);
      expect(logger.info).toHaveBeenCalledWith(
        'ServiceRunner: Started "my-service" (every 5000ms)',
      );
    });

    test('should invoke the handler when the interval fires', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('my-service', handler, 10000);

      // Use async version to flush microtask queue (_tick uses Promise.resolve().then())
      await jest.advanceTimersByTimeAsync(10000);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should invoke the handler repeatedly on each interval tick', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('my-service', handler, 5000);

      await jest.advanceTimersByTimeAsync(20000); // 4 intervals

      expect(handler).toHaveBeenCalledTimes(4);
    });

    test('should warn and skip if service name is already registered', () => {
      const handler = jest.fn();

      runner.start('dup-service', handler, 1000);
      runner.start('dup-service', handler, 2000);

      expect(logger.warn).toHaveBeenCalledWith(
        'ServiceRunner: Service "dup-service" is already running — skipping',
      );

      // Only one service registered (first one)
      const status = runner.getStatus();
      expect(status.services).toHaveLength(1);
      expect(status.services[0].intervalMs).toBe(1000);
    });

    test('should set isRunning true on the status entry', () => {
      runner.start('my-service', jest.fn(), 1000);

      const status = runner.getStatus();
      expect(status.services[0].isRunning).toBe(true);
    });

    test('should optionally run handler immediately when immediate: true', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('immediate-service', handler, 10000, { immediate: true });

      // setImmediate is faked — run all pending timers and flush microtasks
      // Run just enough time for setImmediate to fire, not the full 10s interval
      await jest.advanceTimersByTimeAsync(0);

      // Handler was called from setImmediate (1x). Interval hasn't fired yet.
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should accept opts without immediate flag', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('no-opts', handler, 5000);
      await jest.advanceTimersByTimeAsync(5000);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ── stop() ────────────────────────────────────────────────────────

  describe('stop', () => {
    test('should stop a running service', () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('my-service', handler, 5000);
      runner.stop('my-service');

      const status = runner.getStatus();
      expect(status.running).toBe(false);
      expect(status.services).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith('ServiceRunner: Stopped "my-service"');
    });

    test('should prevent handler from being called after stop', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('my-service', handler, 5000);
      runner.stop('my-service');

      await jest.advanceTimersByTimeAsync(10000);

      expect(handler).not.toHaveBeenCalled();
    });

    test('should warn when stopping a non-existent service', () => {
      runner.stop('non-existent');

      expect(logger.warn).toHaveBeenCalledWith(
        'ServiceRunner: Service "non-existent" not found',
      );
    });
  });

  // ── dispose() ─────────────────────────────────────────────────────

  describe('dispose', () => {
    test('should stop all running services', () => {
      runner.start('svc-a', jest.fn(), 1000);
      runner.start('svc-b', jest.fn(), 2000);
      runner.start('svc-c', jest.fn(), 3000);

      runner.dispose();

      const status = runner.getStatus();
      expect(status.running).toBe(false);
      expect(status.services).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith('ServiceRunner: All services stopped');
    });

    test('should prevent all handlers from firing after dispose', async () => {
      const handlerA = jest.fn().mockResolvedValue(undefined);
      const handlerB = jest.fn().mockResolvedValue(undefined);

      runner.start('svc-a', handlerA, 2000);
      runner.start('svc-b', handlerB, 3000);

      runner.dispose();

      await jest.advanceTimersByTimeAsync(10000);

      expect(handlerA).not.toHaveBeenCalled();
      expect(handlerB).not.toHaveBeenCalled();
    });

    test('should be safe to call on an empty runner', () => {
      expect(() => runner.dispose()).not.toThrow();
    });

    test('should be safe to call multiple times', () => {
      runner.start('svc-a', jest.fn(), 1000);
      runner.dispose();
      expect(() => runner.dispose()).not.toThrow();
      expect(logger.info).toHaveBeenLastCalledWith('ServiceRunner: All services stopped');
    });
  });

  // ── getStatus() ───────────────────────────────────────────────────

  describe('getStatus', () => {
    test('should return running: false when no services', () => {
      const status = runner.getStatus();
      expect(status.running).toBe(false);
      expect(status.services).toEqual([]);
    });

    test('should return running: true when services exist', () => {
      runner.start('svc', jest.fn(), 1000);
      expect(runner.getStatus().running).toBe(true);
    });

    test('should include metrics after handler runs', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('svc', handler, 5000);
      await jest.advanceTimersByTimeAsync(5000);

      const status = runner.getStatus();
      expect(status.services[0].runCount).toBe(1);
      expect(status.services[0].lastDurationMs).toBeGreaterThanOrEqual(0);
      expect(status.services[0].lastRunAt).toBeGreaterThan(0);
      expect(status.services[0].errorCount).toBe(0);
      expect(status.services[0].currentlyExecuting).toBe(false);
    });

    test('should report error count when handler throws', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Boom'));

      runner.start('svc', handler, 5000);
      await jest.advanceTimersByTimeAsync(5000);

      const status = runner.getStatus();
      expect(status.services[0].errorCount).toBe(1);
      expect(status.services[0].runCount).toBe(0);
    });
  });

  // ── _tick (backpressure) ──────────────────────────────────────────

  describe('_tick (backpressure)', () => {
    test('should skip tick if previous run is still in progress', async () => {
      // Create a handler that never resolves (stays "in progress")
      const handler = jest.fn().mockReturnValue(new Promise(() => {}));

      runner.start('slow-svc', handler, 5000);

      // Fire first tick — handler runs, returns pending promise, running stays true
      await jest.advanceTimersByTimeAsync(5000);
      expect(handler).toHaveBeenCalledTimes(1);

      // Advance another interval — should be skipped because still running
      await jest.advanceTimersByTimeAsync(5000);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should resume normal operation after long handler completes', async () => {
      let resolveHandler;
      const handler = jest.fn().mockReturnValue(new Promise((resolve) => {
        resolveHandler = resolve;
      }));

      runner.start('slow-svc', handler, 5000);

      // First tick
      await jest.advanceTimersByTimeAsync(5000);
      expect(handler).toHaveBeenCalledTimes(1);

      // Resolve the handler — this releases backpressure
      resolveHandler();
      // Flush microtasks so the metrics update runs (._then().finally())
      await jest.advanceTimersByTimeAsync(0);

      // Next interval should fire
      await jest.advanceTimersByTimeAsync(5000);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    test('should log debug when tick is skipped due to backpressure', async () => {
      const handler = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves

      runner.start('stuck-svc', handler, 5000);

      await jest.advanceTimersByTimeAsync(5000); // first tick
      await jest.advanceTimersByTimeAsync(5000); // second tick — should be skipped

      expect(logger.debug).toHaveBeenCalledWith(
        'ServiceRunner: "stuck-svc" tick skipped — previous run still in progress',
      );
    });
  });

  // ── Error handling ────────────────────────────────────────────────

  describe('error handling', () => {
    test('should log error when handler throws (default)', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));

      runner.start('err-svc', handler, 5000);
      await jest.advanceTimersByTimeAsync(5000);

      expect(logger.error).toHaveBeenCalledWith(
        'ServiceRunner: "err-svc" handler error: Handler failed',
      );
    });

    test('should log at debug level when silentErrors is true', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Silent error'));

      runner.start('silent-svc', handler, 5000, { silentErrors: true });
      await jest.advanceTimersByTimeAsync(5000);

      expect(logger.debug).toHaveBeenCalledWith(
        'ServiceRunner: "silent-svc" handler error (silent): Silent error',
      );
    });

    test('should not crash the interval when handler throws', async () => {
      let callCount = 0;
      const handler = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('Fail'));
        return Promise.resolve();
      });

      runner.start('recover-svc', handler, 5000);
      await jest.advanceTimersByTimeAsync(5000); // fails
      await jest.advanceTimersByTimeAsync(5000); // recovers

      expect(handler).toHaveBeenCalledTimes(2);
      const status = runner.getStatus();
      expect(status.services[0].errorCount).toBe(1);
      expect(status.services[0].runCount).toBe(1);
    });

    test('should reset running flag even when handler throws', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Fail'));

      runner.start('reset-svc', handler, 5000);
      await jest.advanceTimersByTimeAsync(5000); // fails

      const status = runner.getStatus();
      expect(status.services[0].currentlyExecuting).toBe(false);
    });
  });

  // ── Metrics tracking ──────────────────────────────────────────────

  describe('metrics tracking', () => {
    test('should track run count across multiple ticks', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('metric-svc', handler, 1000);
      await jest.advanceTimersByTimeAsync(5000); // 5 ticks

      const status = runner.getStatus();
      expect(status.services[0].runCount).toBe(5);
    });

    test('should track lastRunAt timestamp', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('ts-svc', handler, 1000);
      await jest.advanceTimersByTimeAsync(1000);

      const status = runner.getStatus();
      expect(status.services[0].lastRunAt).toBeGreaterThan(0);
    });

    test('should track lastDurationMs', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.start('dur-svc', handler, 1000);
      await jest.advanceTimersByTimeAsync(1000);

      const status = runner.getStatus();
      expect(status.services[0].lastDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ── ServiceRunner class vs default singleton ─────────────────────

  describe('ServiceRunner class & singleton', () => {
    test('should export ServiceRunner as a class', () => {
      expect(typeof ServiceRunner).toBe('function');
    });

    test('should export default singleton instance', () => {
      expect(defaultRunner).toBeInstanceOf(ServiceRunner);
    });

    test('should support multiple independent runners', () => {
      const runnerA = new ServiceRunner();
      const runnerB = new ServiceRunner();

      runnerA.start('svc-a', jest.fn(), 1000);
      runnerB.start('svc-b', jest.fn(), 2000);

      expect(runnerA.getStatus().services[0].name).toBe('svc-a');
      expect(runnerB.getStatus().services[0].name).toBe('svc-b');
      expect(runnerA.getStatus().services).toHaveLength(1);
      expect(runnerB.getStatus().services).toHaveLength(1);

      runnerA.dispose();
      runnerB.dispose();
    });
  });
});
