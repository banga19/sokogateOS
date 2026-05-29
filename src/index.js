const express = require('express');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const connectDB = require('./config/database');
const { initKafkaProducer, initKafkaConsumer } = require('./config/kafka');
const logger = require('./utils/logger');
const qme = require('./qme/wrapper');
const selfImprovingLoop = require('./engine/selfImprovingLoop');

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
  authRateLimiter.consume(req.ip)
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
  apiRateLimiter.consume(req.ip)
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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

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
      selfImprovingLoop: true
    }
  });
});

// Initialize services
const startServer = async () => {
  try {
    logger.info('SokogateOS: Starting server...');

    // Connect to database
    await connectDB();

    // Initialize QMe task runner
    const qmeInitialized = await qme.initialize();
    if (qmeInitialized) {
      logger.info('SokogateOS: QMe task runner initialized');
      qme.startDashboard().catch(err => {
        logger.warn('SokogateOS: QMe dashboard start (non-critical):', err.message);
      });
    }

    // Initialize Kafka
    await initKafkaProducer();
    await initKafkaConsumer([
      'product.updated',
      'order.created',
      'inventory.changed',
      'supplier.risk.updated',
      'customer.feedback.received',
      'document.processed'
    ]);

    // Start all background services
    const { startSapProductAdapter } = require('./ingestion/adapters/sapProductAdapter');
    const { startSalesforceCrmAdapter } = require('./ingestion/adapters/salesforceCrmAdapter');
    const { startOracleProductAdapter } = require('./ingestion/adapters/oracleProductAdapter');
    const { startHubspotCrmAdapter } = require('./ingestion/adapters/hubspotCrmAdapter');
    const { startFlexportLogisticsAdapter } = require('./ingestion/adapters/flexportLogisticsAdapter');
    const { startShipBobLogisticsAdapter } = require('./ingestion/adapters/shipbobLogisticsAdapter');
    const { startRestApiAdapter } = require('./ingestion/adapters/restApiAdapter');
    const { startDocumentProcessingPipeline } = require('./ingestion/processors/documentProcessingPipeline');
    const { startAiIntelligenceService } = require('./services/aiIntelligenceService');
    const { startWorkflowAutomationService } = require('./services/workflowAutomationService');
    const { startCustomizationService } = require('./services/customizationService');
    const { startLogisticsService } = require('./services/logisticsService');
    const { startSourcingService } = require('./services/sourcingService');

    const serviceStarts = [
      startSapProductAdapter(),
      startSalesforceCrmAdapter(),
      startOracleProductAdapter(),
      startHubspotCrmAdapter(),
      startFlexportLogisticsAdapter(),
      startShipBobLogisticsAdapter(),
      startRestApiAdapter(),
      startDocumentProcessingPipeline(),
      startAiIntelligenceService(),
      startWorkflowAutomationService(),
      startCustomizationService(),
      startLogisticsService(),
      startSourcingService()
    ];

    for (const startPromise of serviceStarts) {
      startPromise.catch(err => {
        logger.error('SokogateOS: Service failed to start:', err.message);
      });
    }

    // ===== START SELF-IMPROVING LOOP ENGINE =====
    // This is the core differentiator — turns company artifacts into a self-improving loop
    selfImprovingLoop.startLoopEngine({
      intervalMs: 5 * 60 * 1000,
      batchSize: 100
    }).then(metrics => {
      logger.info(`SokogateOS: Self-Improving Loop started - processing feedback every 5 minutes`);
    }).catch(err => {
      logger.error('SokogateOS: Failed to start Self-Improving Loop:', err.message);
    });

    // Setup API routes
    const authRoutes = require('./routes/auth');
    const apiRoutes = require('./api/v1/routes');

    app.use('/api/auth', authRoutes);
    app.use('/api/v1', apiRoutes);
    app.use('/api', apiRoutes);

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
          userId: req.user?.id || 'system'
        });
        res.status(201).json({ success: true, data: feedback });
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
    });
  } catch (error) {
    logger.error('SokogateOS: Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;