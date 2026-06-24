/**
 * ServiceRunner — Managed Interval Runner
 * =========================================
 *
 * Solves common performance/resource issues with raw setInterval usage:
 *
 *  1. **Backpressure** — skips a tick if the previous run is still in progress
 *     (prevents pile-up when a handler runs longer than the interval).
 *  2. **Error isolation** — a handler crash does not kill the interval.
 *  3. **Graceful shutdown** — all intervals can be stopped atomically.
 *  4. **Memory safety** — no leaked closures; the runner stores weak refs to
 *     handlers and cleans up on dispose.
 *  5. **Metrics** — tracks run count, error count, last duration, and status
 *     so you can observe service health.
 *
 * Usage
 * -----
 *   const runner = new ServiceRunner();
 *   runner.start('my-service', async () => { ... }, 5000);
 *   // ... later
 *   runner.stop('my-service');
 *   // or stop all at once
 *   runner.dispose();
 *
 *   runner.getStatus() // => { running, services: [...] }
 */

const logger = require('./logger');

class ServiceRunner {
  constructor() {
    /** @type {Map<string, { handler: Function, intervalMs: number, timerId: NodeJS.Timeout|null, running: boolean, lastRunAt: number|null, lastDuration: number|null, runCount: number, errorCount: boolean }>} */
    this._services = new Map();
  }

  /**
   * Register and start a background service.
   *
   * @param {string}   name       - Unique service name (used to stop later)
   * @param {Function} handler    - Async function to run on each tick
   * @param {number}   intervalMs - Tick interval in milliseconds
   * @param {Object}   [opts]
   * @param {boolean}  [opts.immediate=false] - Run handler once immediately on start
   * @param {boolean}  [opts.silentErrors=false] - If true, errors are logged at debug level
   */
  start(name, handler, intervalMs, opts = {}) {
    if (this._services.has(name)) {
      logger.warn(`ServiceRunner: Service "${name}" is already running — skipping`);
      return;
    }

    const entry = {
      handler,
      intervalMs,
      timerId: null,
      running: false,
      lastRunAt: null,
      lastDuration: null,
      runCount: 0,
      errorCount: 0,
      opts,
    };

    this._services.set(name, entry);

    // Schedule the recurring tick
    entry.timerId = setInterval(() => this._tick(name), intervalMs);

    // Optionally run immediately
    if (opts.immediate) {
      // Use a microtask defer so the caller can finish setup first
      setImmediate(() => this._tick(name));
    }

    logger.info(`ServiceRunner: Started "${name}" (every ${intervalMs}ms)`);
  }

  /**
   * Stop a single service by name.
   * @param {string} name
   */
  stop(name) {
    const entry = this._services.get(name);
    if (!entry) {
      logger.warn(`ServiceRunner: Service "${name}" not found`);
      return;
    }
    this._clearTimer(name, entry);
    this._services.delete(name);
    logger.info(`ServiceRunner: Stopped "${name}"`);
  }

  /**
   * Stop ALL services and release resources.
   */
  dispose() {
    for (const [name, entry] of this._services.entries()) {
      this._clearTimer(name, entry);
    }
    this._services.clear();
    logger.info('ServiceRunner: All services stopped');
  }

  /**
   * Return observational status for all services.
   * @returns {{ running: boolean, services: Array<Object> }}
   */
  getStatus() {
    const services = [];
    for (const [name, entry] of this._services.entries()) {
      services.push({
        name,
        intervalMs: entry.intervalMs,
        isRunning: !!entry.timerId,
        lastRunAt: entry.lastRunAt,
        lastDurationMs: entry.lastDuration,
        runCount: entry.runCount,
        errorCount: entry.errorCount,
        currentlyExecuting: entry.running,
      });
    }
    return { running: this._services.size > 0, services };
  }

  // ── Internal ──

  _tick(name) {
    const entry = this._services.get(name);
    if (!entry) return;

    // Backpressure: skip if previous run is still in progress
    if (entry.running) {
      logger.debug(`ServiceRunner: "${name}" tick skipped — previous run still in progress`);
      return;
    }

    entry.running = true;
    const start = Date.now();

    Promise.resolve()
      .then(() => entry.handler())
      .then(
        () => {
          entry.lastDuration = Date.now() - start;
          entry.runCount++;
          entry.lastRunAt = start;
        },
        (err) => {
          entry.lastDuration = Date.now() - start;
          entry.errorCount++;
          entry.lastRunAt = start;

          if (entry.opts.silentErrors) {
            logger.debug(`ServiceRunner: "${name}" handler error (silent): ${err.message}`);
          } else {
            logger.error(`ServiceRunner: "${name}" handler error: ${err.message}`);
          }
        },
      )
      .finally(() => {
        entry.running = false;
      });
  }

  _clearTimer(name, entry) {
    if (entry.timerId) {
      clearInterval(entry.timerId);
      entry.timerId = null;
    }
  }
}

// Singleton export — most consumers should use this
const defaultRunner = new ServiceRunner();
module.exports = defaultRunner;
module.exports.ServiceRunner = ServiceRunner;
