// Load environment variables from .env and then .env.development (override)
require('dotenv').config();
require('dotenv').config({ path: '.env.development', override: true });

const logger = require('./utils/logger');

// Import the fully configured Express app (middleware + routes set up at module load)
const app = require('./app');

// ===== ASYNC SERVICE INITIALIZATION =====
const connectDB = require('./config/database');
const { initKafkaProducer, initKafkaConsumer } = require('./config/kafka');
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

// Sentry
const { SentryService } = require('./services/error/sentryService');

const PORT = process.env.PORT || 3000;

// Initialize services using serverless-friendly lazy loader
const startServer = async () => {
  try {
    logger.info('SokogateOS: Starting server...');

    // Import and initialize serverless service loader
    const {
      initializeServices,
      attachServicesToApp,
    } = require('./services/serverlessServiceLoader');

    // Initialize all services (will cached for subsequent requests in Vercel)
    await initializeServices();

    // Attach initialized services to app.locals for use in route handlers
    app.use(attachServicesToApp(app));

    // Critical service initialization verification (throws on failure — must succeed)
    const agentService = require('./services/agentService');
    if (!agentService.isInitialized()) {
      throw new Error('Agent service failed to initialize properly');
    }
    logger.info('SokogateOS: Agent service initialized');
    app.locals.agentService = agentService;

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

    // ===== START BACKGROUND SERVICES =====
    // NOTE: In Vercel serverless environment, we don't start long-running background processes
    // These should be handled via webhooks, API triggers, or Vercel Cron Jobs
    /*
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
    */

    // ===== START SELF-IMPROVING LOOP ENGINE =====
    // NOTE: In Vercel, this should be handled via Vercel Cron Jobs
    // For now, we'll comment out the automatic start
    /*
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
    */

    // Set up Sentry Express integration lazily (avoids circular dependency)
    SentryService.setupExpressIntegration(app);

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
