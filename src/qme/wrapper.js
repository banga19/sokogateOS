// QMe Task Runner Integration for sokogateOS
// Wraps Node.js tasks as QMe-executable jobs with tracking, queuing, and dashboard visibility
// QMe is a Python-based CLI task runner: https://github.com/vsoch/qme

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

const QME_VENV_PATH = path.resolve(__dirname, '../../.qme-venv');
const QME_BIN = path.join(QME_VENV_PATH, 'bin', 'qme');
const QME_DB_PATH = process.env.QME_DB_PATH || path.resolve(__dirname, '../../data/qme.db');

/**
 * QMe Integration for SokogateOS
 * 
 * QMe acts as the task execution layer for AI-generated code/scripts.
 * All long-running tasks (sourcing matching, logistics routing, customization production)
 * are executed through QMe for tracking, queuing, and dashboard visibility.
 * 
 * Usage:
 *   const qme = require('./qme/wrapper');
 *   await qme.runTask('sourcing-match', { requestId: 'SRC-123' });
 *   const tasks = await qme.listTasks();
 *   await qme.startDashboard();
 */

/**
 * Initialize QMe database and configuration
 */
async function initialize() {
  try {
    logger.info('QMe Integration: Initializing...');

    // Initialize QMe database
    const { stdout: initOutput } = await execAsync(
      `${QME_BIN} init --database sqlite:///${QME_DB_PATH}`,
      { encoding: 'utf-8', timeout: 10000 }
    );

    logger.info('QMe Integration: Database initialized');
    logger.debug('QMe init output:', initOutput);

    // Create default executor for shell commands
    await execAsync(
      `${QME_BIN} add executor shell --name shell-executor --type shell`,
      { encoding: 'utf-8', timeout: 5000 }
    );

    logger.info('QMe Integration: Shell executor created');

    // Create default views for SokogateOS task types
    await createDefaultViews();

    logger.info('QMe Integration: Initialized successfully');
    return true;
  } catch (error) {
    logger.error('QMe Integration: Initialization failed:', error.message);
    // QMe is optional - don't crash the app
    return false;
  }
}

/**
 * Create default QMe views for SokogateOS task categories
 */
async function createDefaultViews() {
  const views = [
    {
      name: 'sourcing-tasks',
      description: 'Bulk product sourcing and supplier matching tasks',
      filter: 'name~sourcing'
    },
    {
      name: 'logistics-tasks',
      description: 'Shipment tracking and route optimization tasks',
      filter: 'name~logistics'
    },
    {
      name: 'customization-tasks',
      description: 'Product customization and design tasks',
      filter: 'name~customization'
    },
    {
      name: 'ai-intelligence-tasks',
      description: 'AI model training and insight generation tasks',
      filter: 'name~intelligence'
    },
    {
      name: 'all-tasks',
      description: 'All SokogateOS tasks',
      filter: 'name~sokogate'
    }
  ];

  for (const view of views) {
    try {
      await execAsync(
        `${QME_BIN} add view ${view.name} --description "${view.description}" --filter "${view.filter}"`,
        { encoding: 'utf-8', timeout: 5000 }
      );
    } catch (error) {
      logger.debug(`QMe Integration: View ${view.name} may already exist:`, error.message);
    }
  }
}

/**
 * Run a task through QMe with tracking
 * 
 * @param {string} taskName - Name of the task (e.g., 'sourcing-match', 'logistics-route')
 * @param {Object} taskData - JSON data to pass to the task
 * @param {Object} [options] - Task options
 * @param {string} [options.executor='shell'] - QMe executor to use
 * @param {number} [options.timeout=300000] - Task timeout in ms
 * @returns {Promise<Object>} Task result with QMe task ID
 */
async function runTask(taskName, taskData = {}, options = {}) {
  const executor = options.executor || 'shell';
  const timeout = options.timeout || 300000;

  // Build the command to execute
  const scriptPath = path.resolve(__dirname, `tasks/${taskName}.js`);
  const dataArg = Buffer.from(JSON.stringify(taskData)).toString('base64');

  logger.info(`QMe Integration: Running task "${taskName}" via QMe`);

  try {
    // Run through QMe with metadata
    const qmeCommand = `node ${scriptPath} ${dataArg}`;
    const { stdout } = await execAsync(
      `${QME_BIN} run ${qmeCommand} --name "sokogate-${taskName}" --executor ${executor}`,
      { encoding: 'utf-8', timeout }
    );

    // Extract QMe task ID from output
    const taskIdMatch = stdout.match(/Task\s+(\S+)\s+created/i) || 
                        stdout.match(/id[\s:]+(\S+)/i);
    const taskId = taskIdMatch ? taskIdMatch[1] : null;

    logger.info(`QMe Integration: Task "${taskName}" submitted (QMe ID: ${taskId || 'unknown'})`);

    return {
      success: true,
      taskName,
      taskId,
      output: stdout.trim()
    };
  } catch (error) {
    logger.error(`QMe Integration: Task "${taskName}" failed:`, error.message);
    return {
      success: false,
      taskName,
      error: error.message,
      stderr: error.stderr
    };
  }
}

/**
 * List recent tasks from QMe
 * 
 * @param {Object} [options]
 * @param {string} [options.filter] - Name filter (e.g., 'sourcing')
 * @param {number} [options.limit=20] - Max results
 * @returns {Promise<Array>} List of tasks
 */
async function listTasks(options = {}) {
  const filter = options.filter || '';
  const limit = options.limit || 20;

  try {
    const cmd = `${QME_BIN} ls ${filter} --limit ${limit} --format json`;
    const { stdout } = await execAsync(cmd, { encoding: 'utf-8', timeout: 5000 });

    try {
      return JSON.parse(stdout);
    } catch {
      return { tasks: stdout.trim() };
    }
  } catch (error) {
    logger.error('QMe Integration: Failed to list tasks:', error.message);
    return [];
  }
}

/**
 * Get detailed task info from QMe
 * 
 * @param {string} taskId - QMe task ID
 * @returns {Promise<Object>} Task details
 */
async function getTask(taskId) {
  try {
    const { stdout } = await execAsync(
      `${QME_BIN} get ${taskId} --format json`,
      { encoding: 'utf-8', timeout: 5000 }
    );

    try {
      return JSON.parse(stdout);
    } catch {
      return { info: stdout.trim() };
    }
  } catch (error) {
    logger.error(`QMe Integration: Failed to get task ${taskId}:`, error.message);
    return null;
  }
}

/**
 * Start the QMe web dashboard
 * Dashboard runs on QME_DASHBOARD_PORT (default: 8080)
 */
async function startDashboard() {
  const port = process.env.QME_DASHBOARD_PORT || 8080;

  try {
    // Start QMe dashboard in background
    const dashboardProcess = spawn(`${QME_BIN}`, ['start', '--port', port.toString()], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        QME_DATABASE: `sqlite:///${QME_DB_PATH}`
      }
    });

    dashboardProcess.unref();

    logger.info(`QMe Integration: Dashboard starting on http://localhost:${port}`);

    return {
      success: true,
      url: `http://localhost:${port}`,
      port
    };
  } catch (error) {
    logger.error('QMe Integration: Failed to start dashboard:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get QMe dashboard status
 */
async function getDashboardStatus() {
  try {
    const { stdout } = await execAsync(
      `${QME_BIN} status --format json`,
      { encoding: 'utf-8', timeout: 5000 }
    );

    try {
      return JSON.parse(stdout);
    } catch {
      return { status: stdout.trim() };
    }
  } catch (error) {
    return { status: 'inactive' };
  }
}

/**
 * Create a QMe task runner script for a SokogateOS operation
 * This creates executable task scripts in the qme/tasks directory
 * 
 * @param {string} taskName - Name of the task
 * @param {string} scriptContent - The Node.js script content
 */
function createTaskScript(taskName, scriptContent) {
  const tasksDir = path.resolve(__dirname, 'tasks');

  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }

  const filePath = path.join(tasksDir, `${taskName}.js`);
  fs.writeFileSync(filePath, scriptContent);
  fs.chmodSync(filePath, 0o755);

  logger.info(`QMe Integration: Task script created: ${filePath}`);
  return filePath;
}

module.exports = {
  initialize,
  runTask,
  listTasks,
  getTask,
  startDashboard,
  getDashboardStatus,
  createTaskScript
};
