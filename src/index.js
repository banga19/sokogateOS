const express = require('express');
// Load environment variables from .env and then .env.development (override)
require('dotenv').config();
require('dotenv').config({ path: '.env.development', override: true });
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
const toolRegistry = require('./services/toolRegistry');
const composioService = require('./services/composioService');

// Phase 1 Services
const watiService = require('./services/watiService');
const { startSupplierTrustService } = require('./services/supplierTrustService');
const { startMpesaService } = require('./services/mpesaService');

// Phase 2 Services
const { startCustomsEngineService } = require('./services/customsEngineService');

// Payment Adapters
const { startKRWPaymentAdapter } = require('./ingestion/adapters/krwPaymentAdapter');

// Middleware
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const { SentryService, sentryErrorHandler, sentryTracingHandler } = require('./services/error/sentryService');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ===== SECURITY MIDDLEWARE =====
// Sentry tracing handler — captures request context for performance monitoring
app.use(sentryTracingHandler());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS — use dedicated middleware (supports comma-separated FRONTEND_URL, proper Vary header)
const corsMiddleware = require('./middleware/cors');
app.use(corsMiddleware);

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

// Apply rate limiting to all other API routes (admin, teams, agents, tools, etc.)
const apiRoutes = ['/api/admin', '/api/teams', '/api/agents', '/api/tools', '/api/whatsapp', '/api/trust',
                   '/api/customs', '/api/contacts', '/api/accounts', '/api/sequences', '/api/enrollments'];
for (const route of apiRoutes) {
  app.use(route, (req, res, next) => {
    apiRateLimiter
      .consume(req.ip)
      .then(() => next())
      .catch((err) => {
        if (err instanceof Error) {
          logger.warn(`Rate limiter error on ${route}:`, err.message);
          return next();
        }
        res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
      });
  });
}

// Track engagement for all requests
const { trackEngagement } = require('./middleware/analytics/tracking');
app.use(trackEngagement);

// Health check routes (unauthenticated)
const healthRoutes = require('./routes/health');
app.use('/health', healthRoutes);

// Initialize services
const startServer = async () => {
  try {
    logger.info('SokogateOS: Starting server...');

    // Independent service initialization (parallelizable — no dependencies between them)
    const initResults = await Promise.allSettled([
      // Non-critical services
      connectDB().then(() => ({ name: 'Database' })),
      qme.initialize().then((initialized) => ({ name: 'QMe', initialized })).catch((e) => ({ name: 'QMe', error: e.message })),
      langchainOrchestrator.initializeLangChain().then(() => ({ name: 'LangChain' })),
      Promise.resolve().then(async () => {
        const hermesAgent = new HermesAgent({
          config: {
            analysisInterval: 3600000,
            optimizationInterval: 7200000,
            complianceInterval: 86400000,
            intelligenceInterval: 21600000,
          },
        });
        await hermesAgent.initialize();
        hermesAgent.startScheduledRuns();
        app.locals.hermesAgent = hermesAgent;
        return { name: 'Hermes' };
      }),
      Promise.resolve().then(() => {
        const status = toolRegistry.getServiceStatus();
        const configured = composioService.isConfigured();
        app.locals.toolRegistry = toolRegistry;
        app.locals.composioService = composioService;
        return { name: 'ToolRegistry', totalTools: status.totalTools, composioConfigured: configured };
      }),
      cloudflareService.initialize().then(() => ({ name: 'Cloudflare' })),
      initKafkaProducer().then(() => initKafkaConsumer([
        'product.updated',
        'order.created',
        'inventory.changed',
        'supplier.risk.updated',
        'customer.feedback.received',
        'document.processed',
      ])).then(() => ({ name: 'Kafka' })),
    ]);

    for (const result of initResults) {
      if (result.status === 'fulfilled' && result.value) {
        const svcName = result.value.name;
        if (result.value.error) {
          logger.warn(`SokogateOS: ${svcName} initialization failed (continuing):`, result.value.error);
        } else {
          const detail = svcName === 'QMe' && result.value.initialized === false
            ? 'skipped'
            : svcName === 'ToolRegistry'
              ? `initialized — ${result.value.totalTools} tools, Composio=${result.value.composioConfigured}`
              : 'initialized';
          logger.info(`SokogateOS: ${svcName} ${detail}`);
        }
        if (svcName === 'Cloudflare' && result.value.error === undefined) {
          try {
            app.use(cloudflareService.getHeadersMiddleware());
          } catch {
            // Middleware errors here are expected and non-critical
          }
        }
      }
    }

    // Critical service initialization (throws on failure — must succeed)
    try {
      await agentService.initialize();
      logger.info('SokogateOS: Agent service initialized');
      app.locals.agentService = agentService;
    } catch (agentServiceError) {
      logger.error('SokogateOS: Agent service initialization failed:', agentServiceError.message);
      throw agentServiceError;
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
    // Wrap with Promise.resolve() to handle functions that return non-Promise values
    for (const maybePromise of serviceStarts) {
      Promise.resolve(maybePromise)
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
        .then(() => {
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

      // Phase 1 Routes: WhatsApp Commerce Co-pilot & Supplier Trust Network
      const whatsappRoutes = require('./routes/whatsapp');
      const supplierTrustRoutes = require('./routes/supplierTrust');

      app.use('/api/whatsapp', whatsappRoutes);
      app.use('/api/trust', supplierTrustRoutes);

      // Phase 2 Routes: Cross-Border Customs Engine
      const customsEngineRoutes = require('./routes/customsEngine');
      app.use('/api/customs', customsEngineRoutes);

      // Phase 2 Routes: CRM (Contacts, Accounts, Sequences, Enrollments)
      const contactsRoutes = require('./routes/contacts');
      const accountsRoutes = require('./routes/accounts');
      const sequencesRoutes = require('./routes/sequences');
      const enrollmentsRoutes = require('./routes/enrollments');
      app.use('/api/contacts', contactsRoutes);
      app.use('/api/accounts', accountsRoutes);
      app.use('/api/sequences', sequencesRoutes);
      app.use('/api/enrollments', enrollmentsRoutes);

      const teamsRoutes = require('./routes/teams');
      const adminRoutes = require('./routes/admin');
      app.use('/api/teams', teamsRoutes);
      app.use('/api/admin', adminRoutes);

      logger.info('SokogateOS: API routes configured');

      // Register tool routes
      try {
        const toolRoutes = require('./routes/tools');
        app.use('/api/tools', toolRoutes);
        logger.info('SokogateOS: Tool routes configured');
      } catch (toolRoutesError) {
        logger.error('SokogateOS: Failed to setup tool routes:', toolRoutesError.message);
        // Don't throw here as tool routes are not critical
      }

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
      } catch {
        // QMe status failures are non-critical
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

    // Serve built frontend assets
    app.use(express.static('frontend/dist', { index: false }));

    // SPA fallback — serve index.html for non-API GET requests
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile('index.html', { root: 'frontend/dist' });
    });

    // Set up Sentry Express integration lazily (avoids circular dependency)
    SentryService.setupExpressIntegration(app);

    // 404 handler — must come after all routes
    app.use(notFoundHandler);

    // Sentry error handler — must come before global error handler
    app.use(sentryErrorHandler());

    // Global error handler — must come last
    app.use(globalErrorHandler);

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
