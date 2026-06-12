const express = require('express');
// Load environment variables from .env and then .env.development (override)
require('dotenv').config();
require('dotenv').config({ path: '.env.development', override: true });
console.log('Dotenv loaded, KAFKA_BROKERS:', process.env.KAFKA_BROKERS); // DEBUG
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const connectDB = require('./config/database');
const { initKafkaProducer, initKafkaConsumer } = require('./config/kafka');
const logger = require('./utils/logger');
const qme = require('./qme/wrapper');
const selfImprovingLoop = require('./engine/selfImprovingLoop');
const langchainOrchestrator = require('./services/langchainOrchestrator');
const { HermesAgent } = require('./services/hermes/hermesAgent');
const agentService = require('./services/agentService');
const { cloudflareService } = require('./services/cloudflareService');

// Phase 1 Services
const watiService = require('./services/watiService');
const { startSupplierTrustService } = require('./services/supplierTrustService');
const { startMpesaService } = require('./services/mpesaService');

// Phase 2 Services
const { startCustomsEngineService } = require('./services/customsEngineService');

// Payment Adapters
const { startKRWPaymentAdapter } = require('./ingestion/adapters/krwPaymentAdapter');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ===== SECURITY MIDDLEWARE =====
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Rate limiting
const authRateLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
  blockDuration: 120, // block for 120 seconds
});

const apiRateLimiter = new RateLimiterMemory({
  points: 200,
  duration: 60,
});

app.use('/api/auth', (req, res, next) => {
  authRateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch((err) => {
      if (err instanceof Error) {
        // Internal error - fail open to avoid blocking all traffic
        logger.warn('Auth rate limiter error:', err.message);
        return next();
      }
      res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    });
});

app.use('/api/v1', (req, res, next) => {
  apiRateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch((err) => {
      if (err instanceof Error) {
        logger.warn('API rate limiter error:', err.message);
        return next();
      }
      res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    });
});

// CORS - allow frontend in development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Track engagement for all requests
const { trackEngagement } = require('./middleware/analytics/tracking');
app.use(trackEngagement);

// Health check route (unauthenticated)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    features: {
      auth: true,
      qme: true,
      kafka: true,
      selfImprovingLoop: true,
    },
  });
});

// Initialize services
const startServer = async () => {
  try {
    logger.info('SokogateOS: Starting server...');

    // Connect to database
    try {
      await connectDB();
      logger.info('SokogateOS: Database connection initialized');
    } catch (dbError) {
      logger.warn(
        'SokogateOS: Database connection failed (continuing without DB):',
        dbError.message
      );
      // Continue without database in development
    }

    // Initialize QMe task runner
    try {
      const qmeInitialized = await qme.initialize();
      if (qmeInitialized) {
        logger.info('SokogateOS: QMe task runner initialized');
        qme.startDashboard().catch((err) => {
          logger.warn('SokogateOS: QMe dashboard start (non-critical):', err.message);
        });
      } else {
        logger.info('SokogateOS: QMe task runner initialization skipped');
      }
    } catch (qmeError) {
      logger.warn(
        'SokogateOS: QMe initialization failed (continuing without QMe):',
        qmeError.message
      );
      // Continue without QMe
    }

    // Initialize LangChain orchestrator
    try {
      await langchainOrchestrator.initializeLangChain();
      logger.info('SokogateOS: LangChain orchestrator initialized');
    } catch (langchainError) {
      logger.warn(
        'SokogateOS: LangChain initialization failed (continuing without LangChain):',
        langchainError.message
      );
    }

    // Initialize Hermes agent system
    try {
      const hermesAgent = new HermesAgent({
        config: {
          analysisInterval: 3600000, // 1 hour
          optimizationInterval: 7200000, // 2 hours
          complianceInterval: 86400000, // 24 hours
          intelligenceInterval: 21600000, // 6 hours
        },
      });

      await hermesAgent.initialize();
      logger.info('SokogateOS: Hermes agent system initialized');

      // Start scheduled runs (every 5 minutes by default)
      hermesAgent.startScheduledRuns();

      // Make available for potential API routes
      app.locals.hermesAgent = hermesAgent;
    } catch (hermesError) {
      logger.warn(
        'SokogateOS: Hermes initialization failed (continuing without Hermes):',
        hermesError.message
      );
    }

    // Initialize agent service
    try {
      await agentService.initialize();
      logger.info('SokogateOS: Agent service initialized');
      // Make agent service available for potential API routes
      app.locals.agentService = agentService;
    } catch (agentServiceError) {
      logger.error('SokogateOS: Agent service initialization failed:', agentServiceError.message);
      throw agentServiceError; // This is critical for the agent engine
    }

    // Initialize Cloudflare service
    try {
      await cloudflareService.initialize();
      logger.info('SokogateOS: Cloudflare service initialized');
      // Make Cloudflare service available for potential API routes
      app.locals.cloudflareService = cloudflareService;

      // Apply Cloudflare-specific headers middleware
      app.use(cloudflareService.getHeadersMiddleware());
    } catch (cloudflareError) {
      logger.warn(
        'SokogateOS: Cloudflare initialization failed (continuing without Cloudflare):',
        cloudflareError.message
      );
      // Continue without Cloudflare - not critical for basic operation
    }

    // Initialize Kafka
    try {
      await initKafkaProducer();
      await initKafkaConsumer([
        'product.updated',
        'order.created',
        'inventory.changed',
        'supplier.risk.updated',
        'customer.feedback.received',
        'document.processed',
      ]);
      logger.info('SokogateOS: Kafka initialized');
    } catch (kafkaError) {
      logger.warn(
        'SokogateOS: Kafka initialization failed (continuing without Kafka):',
        kafkaError.message
      );
      // Continue without Kafka
    }

    // Start all background services
    logger.info('SokogateOS: Starting background services...');
    const { startSapProductAdapter } = require('./ingestion/adapters/sapProductAdapter');
    const { startSalesforceCrmAdapter } = require('./ingestion/adapters/salesforceCrmAdapter');
    const { startOracleProductAdapter } = require('./ingestion/adapters/oracleProductAdapter');
    const { startHubspotCrmAdapter } = require('./ingestion/adapters/hubspotCrmAdapter');
    const {
      startFlexportLogisticsAdapter,
    } = require('./ingestion/adapters/flexportLogisticsAdapter');
    const {
      startShipBobLogisticsAdapter,
    } = require('./ingestion/adapters/shipbobLogisticsAdapter');
    const { startRestApiAdapter } = require('./ingestion/adapters/restApiAdapter');
    const {
      startDocumentProcessingPipeline,
    } = require('./ingestion/processors/documentProcessingPipeline');
    const { startAiIntelligenceService } = require('./services/aiIntelligenceService');
    const { startWorkflowAutomationService } = require('./services/workflowAutomationService');
    const { startCustomizationService } = require('./services/customizationService');
    const { startLogisticsService } = require('./services/logisticsService');
    const { startSourcingService } = require('./services/sourcingService');

    // Phase 1 Services
    const serviceStarts = [
      startSapProductAdapter(),
      startSalesforceCrmAdapter(),
      startOracleProductAdapter(),
      startHubspotCrmAdapter(),
      startFlexportLogisticsAdapter(),
      startShipBobLogisticsAdapter(),
      startRestApiAdapter(),
      startKRWPaymentAdapter(),
      startDocumentProcessingPipeline(),
      startAiIntelligenceService(),
      startWorkflowAutomationService(),
      startCustomizationService(),
      startLogisticsService(),
      startSourcingService(),
      // Phase 1: WhatsApp Commerce Co-pilot (WATI.io), Supplier Trust Network, M-Pesa
      watiService.initialize(),
      startSupplierTrustService(),
      startMpesaService(),
      // Phase 2: Cross-Border Customs Engine
      startCustomsEngineService(),
    ];

    // Start all services and log individual successes/failures
    for (const startPromise of serviceStarts) {
      startPromise
        .then(() => {
          // Service started successfully
        })
        .catch((err) => {
          logger.error('SokogateOS: Service failed to start:', err.message);
        });
    }

    // ===== START SELF-IMPROVING LOOP ENGINE =====
    // This is the core differentiator — turns company artifacts into a self-improving loop
    try {
      selfImprovingLoop
        .startLoopEngine({
          intervalMs: 5 * 60 * 1000,
          batchSize: 100,
        })
        .then((metrics) => {
          logger.info(
            `SokogateOS: Self-Improving Loop started - processing feedback every 5 minutes`
          );
        })
        .catch((err) => {
          logger.error('SokogateOS: Failed to start Self-Improving Loop:', err.message);
        });
    } catch (loopError) {
      logger.error('SokogateOS: Failed to start Self-Improving Loop engine:', loopError.message);
    }

    // Setup API routes
    try {
      const authRoutes = require('./routes/auth');
      const apiRoutes = require('./api/v1/routes');

      app.use('/api/auth', authRoutes);
      app.use('/api/v1', apiRoutes);
      app.use('/api', apiRoutes);

      // Phase 1 Routes: WhatsApp Commerce Co-pilot & Supplier Trust Network
      const whatsappRoutes = require('./routes/whatsapp');
      const supplierTrustRoutes = require('./routes/supplierTrust');

      app.use('/api/whatsapp', whatsappRoutes);
      app.use('/api/trust', supplierTrustRoutes);

      // Phase 2 Routes: Cross-Border Customs Engine
      const customsEngineRoutes = require('./routes/customsEngine');
      app.use('/api/customs', customsEngineRoutes);

      const teamsRoutes = require('./routes/teams');
      const adminRoutes = require('./routes/admin');
      app.use('/api/teams', teamsRoutes);
      app.use('/api/admin', adminRoutes);

      logger.info('SokogateOS: API routes configured');

      // Register agent routes
      try {
        const agentRoutes = require('./routes/agents');
        app.use('/api/agents', agentRoutes);
        logger.info('SokogateOS: Agent routes configured');
      } catch (agentRoutesError) {
        logger.error('SokogateOS: Failed to setup agent routes:', agentRoutesError.message);
        // Don't throw here as agents might not be critical for basic operation
      }
    } catch (routesError) {
      logger.error('SokogateOS: Failed to setup API routes:', routesError.message);
      throw routesError; // Re-throw as this is critical
    }

    // QMe dashboard endpoint
    app.get('/api/qme/status', async (req, res) => {
      try {
        const status = await qme.getDashboardStatus();
        res.json({ success: true, data: status });
      } catch (err) {
        res.json({ success: true, data: { status: 'inactive' } });
      }
    });

    // Self-Improving Loop engine endpoint
    app.get('/api/engine/status', (req, res) => {
      const status = selfImprovingLoop.getEngineStatus();
      res.json({ success: true, data: status });
    });

    app.post('/api/engine/run-cycle', async (req, res) => {
      try {
        const result = await selfImprovingLoop.runLoopCycle(parseInt(req.query.batchSize) || 100);
        res.json({ success: true, data: result });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.post('/api/engine/feedback', async (req, res) => {
      try {
        const feedback = await selfImprovingLoop.submitFeedback({
          ...req.body,
          companyId: req.user?.companyId || 'system',
          userId: req.user?.id || 'system',
        });
        res.status(201).json({ success: true, data: feedback });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Hermes agent system endpoints
    app.get('/api/hermes/status', async (req, res) => {
      try {
        const status = app.locals.hermesAgent
          ? await app.locals.hermesAgent.getStatus()
          : { error: 'Hermes agent not available' };
        res.json({ success: true, data: status });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.post('/api/hermes/run-cycle', async (req, res) => {
      try {
        if (!app.locals.hermesAgent) {
          return res.status(503).json({ success: false, error: 'Hermes agent not available' });
        }

        const result = await app.locals.hermesAgent.runCycle();
        res.json({ success: true, data: result });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.post('/api/hermes/start-scheduled-runs', async (req, res) => {
      try {
        if (!app.locals.hermesAgent) {
          return res.status(503).json({ success: false, error: 'Hermes agent not available' });
        }

        app.locals.hermesAgent.startScheduledRuns();
        res.json({ success: true, message: 'Hermes scheduled runs started' });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.post('/api/hermes/stop-scheduled-runs', async (req, res) => {
      try {
        if (!app.locals.hermesAgent) {
          return res.status(503).json({ success: false, error: 'Hermes agent not available' });
        }

        app.locals.hermesAgent.stopScheduledRuns();
        res.json({ success: true, message: 'Hermes scheduled runs stopped' });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`SokogateOS: Server running on port ${PORT}`);
      logger.info(`SokogateOS: Health check at http://localhost:${PORT}/health`);
      logger.info(`SokogateOS: Auth API at http://localhost:${PORT}/api/auth`);
      logger.info(`SokogateOS: REST API at http://localhost:${PORT}/api/v1`);
      logger.info(`SokogateOS: WhatsApp Service at http://localhost:${PORT}/api/whatsapp`);
      logger.info(`SokogateOS: Supplier Trust Network at http://localhost:${PORT}/api/trust`);
      logger.info(`SokogateOS: Customs Engine at http://localhost:${PORT}/api/customs`);
      logger.info(`SokogateOS: Health check at /health`);
    });
  } catch (error) {
    logger.error('SokogateOS: Failed to start server:', error);
    logger.error('Error stack:', error.stack);
    process.exit(1);
  }
};

startServer();

module.exports = app;
