// Serverless Service Loader for sokogateOS
// Provides lazy initialization pattern for services in Vercel serverless environment
// Services are initialized on first request and cached globally across warm invocations

const logger = require('../utils/logger');

// Global cache for initialized services
const serviceCache = new Map();

// Database connection with serverless-friendly pooling
async function initializeDatabase() {
  if (serviceCache.has('database')) {
    return serviceCache.get('database');
  }

  try {
    const { connectDB } = require('../config/database');
    await connectDB();
    serviceCache.set('database', { name: 'Database', initialized: true });
    logger.info('SokogateOS: Database connection initialized (serverless)');
    return serviceCache.get('database');
  } catch (error) {
    logger.warn('SokogateOS: Database initialization failed (continuing):', error.message);
    serviceCache.set('database', { name: 'Database', error: error.message });
    return serviceCache.get('database');
  }
}

// Kafka initialization (producer and consumer)
async function initializeKafka() {
  if (serviceCache.has('kafka')) {
    return serviceCache.get('kafka');
  }

  try {
    const { initKafkaProducer, initKafkaConsumer } = require('../config/kafka');
    await initKafkaProducer();
    // Note: In Vercel, we might not want to start consumers due to serverless limitations
    // Consumers can be replaced with webhook-based ingestion or Vercel Cron Jobs
    serviceCache.set('kafka', { name: 'Kafka', initialized: true });
    logger.info('SokogateOS: Kafka producer initialized (serverless)');
    return serviceCache.get('kafka');
  } catch (error) {
    logger.warn('SokogateOS: Kafka initialization failed (continuing):', error.message);
    serviceCache.set('kafka', { name: 'Kafka', error: error.message });
    return serviceCache.get('kafka');
  }
}

// Tool Registry and Composio initialization
async function initializeToolRegistry() {
  if (serviceCache.has('toolRegistry')) {
    return serviceCache.get('toolRegistry');
  }

  try {
    const toolRegistry = require('../services/toolRegistry');
    const composioService = require('../services/composioService');

    const status = toolRegistry.getServiceStatus();
    const configured = composioService.isConfigured();

    serviceCache.set('toolRegistry', {
      name: 'ToolRegistry',
      totalTools: status.totalTools,
      composioConfigured: configured,
    });
    logger.info(
      `SokogateOS: ToolRegistry initialized — ${status.totalTools} tools, Composio=${configured}`
    );
    return serviceCache.get('toolRegistry');
  } catch (error) {
    logger.warn('SokogateOS: ToolRegistry initialization failed (continuing):', error.message);
    serviceCache.set('toolRegistry', { name: 'ToolRegistry', error: error.message });
    return serviceCache.get('toolRegistry');
  }
}

// Cloudflare service initialization
async function initializeCloudflare() {
  if (serviceCache.has('cloudflare')) {
    return serviceCache.get('cloudflare');
  }

  try {
    const { cloudflareService } = require('../services/cloudflareService');
    await cloudflareService.initialize();
    serviceCache.set('cloudflare', { name: 'Cloudflare', initialized: true });
    logger.info('SokogateOS: Cloudflare service initialized');
    return serviceCache.get('cloudflare');
  } catch (error) {
    logger.warn('SokogateOS: Cloudflare initialization failed (continuing):', error.message);
    serviceCache.set('cloudflare', { name: 'Cloudflare', error: error.message });
    return serviceCache.get('cloudflare');
  }
}

// QMe service initialization
async function initializeQMe() {
  if (serviceCache.has('qme')) {
    return serviceCache.get('qme');
  }

  try {
    const qme = require('../qme/wrapper');
    const initialized = await qme.initialize();
    serviceCache.set('qme', { name: 'QMe', initialized });
    logger.info(`SokogateOS: QMe service ${initialized ? 'initialized' : 'skipped'}`);
    return serviceCache.get('qme');
  } catch (error) {
    logger.warn('SokogateOS: QMe initialization failed (continuing):', error.message);
    serviceCache.set('qme', { name: 'QMe', error: error.message });
    return serviceCache.get('qme');
  }
}

// LangChain initialization
async function initializeLangChain() {
  if (serviceCache.has('langchain')) {
    return serviceCache.get('langchain');
  }

  try {
    const langchainOrchestrator = require('../services/langchainOrchestrator');
    await langchainOrchestrator.initializeLangChain();
    serviceCache.set('langchain', { name: 'LangChain', initialized: true });
    logger.info('SokogateOS: LangChain initialized');
    return serviceCache.get('langchain');
  } catch (error) {
    logger.warn('SokogateOS: LangChain initialization failed (continuing):', error.message);
    serviceCache.set('langchain', { name: 'LangChain', error: error.message });
    return serviceCache.get('langchain');
  }
}

// Hermes Agent initialization
async function initializeHermesAgent() {
  if (serviceCache.has('hermes')) {
    return serviceCache.get('hermes');
  }

  try {
    const { HermesAgent } = require('../services/hermes/hermesAgent');
    const hermesAgent = new HermesAgent({
      config: {
        analysisInterval: 3600000,
        optimizationInterval: 7200000,
        complianceInterval: 86400000,
        intelligenceInterval: 21600000,
      },
    });
    await hermesAgent.initialize();
    // Note: In Vercel, we don't start scheduled runs here
    // They should be handled via Vercel Cron Jobs or manual triggers
    serviceCache.set('hermes', { name: 'Hermes', agent: hermesAgent });
    logger.info('SokogateOS: Hermes agent initialized (scheduled runs disabled for serverless)');
    return serviceCache.get('hermes');
  } catch (error) {
    logger.warn('SokogateOS: Hermes agent initialization failed (continuing):', error.message);
    serviceCache.set('hermes', { name: 'Hermes', error: error.message });
    return serviceCache.get('hermes');
  }
}

// Agent Service initialization (critical - must succeed)
async function initializeAgentService() {
  if (serviceCache.has('agentService')) {
    return serviceCache.get('agentService');
  }

  try {
    const agentService = require('../services/agentService');
    await agentService.initialize();
    serviceCache.set('agentService', { name: 'AgentService', initialized: true });
    logger.info('SokogateOS: Agent service initialized');
    return serviceCache.get('agentService');
  } catch (error) {
    logger.error('SokogateOS: Agent service initialization failed:', error.message);
    throw error; // Critical service - throw to prevent startup
  }
}

// Main service initializer - initializes all services on demand
async function initializeServices() {
  try {
    // Initialize independent services (can continue on failure)
    const independentServices = await Promise.allSettled([
      initializeDatabase(),
      initializeQMe(),
      initializeLangChain(),
      initializeHermesAgent(),
      initializeToolRegistry(),
      initializeCloudflare(),
      initializeKafka(),
    ]);

    // Log results of independent services
    independentServices.forEach((result, index) => {
      const serviceNames = [
        'Database',
        'QMe',
        'LangChain',
        'Hermes',
        'ToolRegistry',
        'Cloudflare',
        'Kafka',
      ];
      const serviceName = serviceNames[index];

      if (result.status === 'fulfilled' && result.value) {
        if (result.value.error) {
          logger.warn(
            `SokogateOS: ${serviceName} initialization failed (continuing):`,
            result.value.error
          );
        } else {
          logger.info(`SokogateOS: ${serviceName} initialized`);
        }
      } else if (result.status === 'rejected') {
        logger.warn(
          `SokogateOS: ${serviceName} initialization failed (continuing):`,
          result.reason.message
        );
      }
    });

    // Initialize critical service (must succeed)
    await initializeAgentService();

    return true;
  } catch (error) {
    logger.error('SokogateOS: Failed to initialize services:', error);
    throw error;
  }
}

// Getter functions for individual services
function getDatabase() {
  return serviceCache.get('database');
}

function getKafka() {
  return serviceCache.get('kafka');
}

function getToolRegistry() {
  return serviceCache.get('toolRegistry');
}

function getCloudflare() {
  return serviceCache.get('cloudflare');
}

function getQMe() {
  return serviceCache.get('qme');
}

function getLangChain() {
  return serviceCache.get('langchain');
}

function getHermesAgent() {
  const hermesData = serviceCache.get('hermes');
  return hermesData ? hermesData.agent : null;
}

function getAgentService() {
  return serviceCache.get('agentService');
}

// Middleware to attach initialized services to app.locals
function attachServicesToApp(app) {
  return async (req, res, next) => {
    try {
      // Initialize services if not already done
      if (serviceCache.size === 0) {
        await initializeServices();
      }

      // Attach services to app.locals for use in route handlers
      const db = getDatabase();
      if (db && !db.error) {
        app.locals.db = db;
      }

      const kafka = getKafka();
      if (kafka && !kafka.error) {
        app.locals.kafka = kafka;
      }

      const toolRegistry = getToolRegistry();
      if (toolRegistry && !toolRegistry.error) {
        app.locals.toolRegistry = toolRegistry;
      }

      const cloudflare = getCloudflare();
      if (cloudflare && !cloudflare.error) {
        app.locals.cloudflare = cloudflare;

        // Add Cloudflare headers middleware if available
        try {
          const { cloudflareService } = require('../services/cloudflareService');
          app.use(cloudflareService.getHeadersMiddleware());
        } catch (e) {
          // Middleware errors here are expected and non-critical
        }
      }

      const qme = getQMe();
      if (qme && !qme.error) {
        app.locals.qme = qme;
      }

      const langchain = getLangChain();
      if (langchain && !langchain.error) {
        app.locals.langchain = langchain;
      }

      const hermesAgent = getHermesAgent();
      if (hermesAgent) {
        app.locals.hermesAgent = hermesAgent;
      }

      const agentService = getAgentService();
      if (agentService && !agentService.error) {
        app.locals.agentService = agentService;
      }

      next();
    } catch (error) {
      logger.error('SokogateOS: Failed to attach services to app:', error);
      next(error);
    }
  };
}

module.exports = {
  initializeServices,
  initializeDatabase,
  initializeKafka,
  initializeToolRegistry,
  initializeCloudflare,
  initializeQMe,
  initializeLangChain,
  initializeHermesAgent,
  initializeAgentService,
  getDatabase,
  getKafka,
  getToolRegistry,
  getCloudflare,
  getQMe,
  getLangChain,
  getHermesAgent,
  getAgentService,
  attachServicesToApp,
};
