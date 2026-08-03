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

// Third-party integrations (env-gated, safe to require even when not configured)
const { neonService } = require('./services/neonService');
const { stripeService } = require('./services/stripeService');
const { r2Service } = require('./services/r2Service');
const { pineconeService } = require('./services/pineconeService');
const { isConfigured: isRedisConfigured } = require('./config/redis');
const { isConfigured: isQStashConfigured } = require('./services/qstashService');

// Sentry
const { SentryService } = require('./services/error/sentryService');

const PORT = process.env.PORT || 3000;

// Initialize services - this runs when the module loads (good for Vercel cold starts)
async function initializeServices() {
  try {
    logger.info('SokogateOS: Initializing services...');

    // Import and initialize serverless service loader
    const {
      initializeServices: initServerlessServices,
      attachServicesToApp,
    } = require('./services/serverlessServiceLoader');

    // Initialize all services (will cached for subsequent requests in Vercel)
    await initServerlessServices();

    // Attach initialized services to app.locals for use in route handlers
    app.use(attachServicesToApp(app));

    // Critical service initialization verification (throws on failure — must succeed)
    const agentService = require('./services/agentService');
    if (!agentService.isInitialized()) {
      throw new Error('Agent service failed to initialize properly');
    }
    logger.info('SokogateOS: Agent service initialized');
    app.locals.agentService = agentService;

    // Initialize third-party integrations (env-gated — safe no-ops when not configured)
    await neonService.initialize();
    logger.info(`Neon: ${neonService.isConfigured() ? 'ready' : 'not configured'}`);

    if (stripeService.enabled) {
      logger.info('Stripe: payment service ready');
    }

    logger.info(`R2: ${r2Service.isEnabled() ? 'ready' : 'not configured (CLOUDFLARE_R2_* vars missing)'}`);

    try {
      await pineconeService.initialize();
    } catch (err) {
      logger.warn(`Pinecone: init skipped (${err.message})`);
    }
    logger.info(`Cache: Redis/Upstash ${isRedisConfigured() ? 'connected' : 'in-memory fallback'}; QStash ${isQStashConfigured() ? 'ready' : 'not configured'}`);

    // PostHog analytics (env-gated)
    try {
      const posthogClient = require("./utils/posthogClient");
      if (posthogClient.isConfigured()) {
        logger.info("PostHog: analytics enabled");
      } else {
        logger.info("PostHog: not configured (POSTHOG_API_KEY missing)");
      }
    } catch (err) {
      logger.warn(`PostHog: init skipped (${err.message})`);
    }

    logger.info('SokogateOS: All services initialized successfully');
  } catch (error) {
    logger.error('SokogateOS: Failed to initialize services:', error);
    logger.error('Error stack:', error.stack);
    // Don't exit in Vercel environment - let the app start and handle errors in routes
    // process.exit(1); // Commented out for Vercel compatibility
  }
}

// Initialize services immediately (for Vercel cold starts)
initializeServices().catch(err => {
  console.error('Failed to initialize services:', err);
});

// For Vercel: export the app so Vercel can handle HTTP requests
// For local development: you can still run `node src/index.js` to start the server
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  // Only start the server if we're NOT in Vercel environment and NOT in test mode
  const startServer = async () => {
    try {
      await app.listen(PORT, () => {
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
}

// Export the app for Vercel (and for testing)
module.exports = app;