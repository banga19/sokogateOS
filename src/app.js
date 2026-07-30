const express = require('express');
// Load environment variables from .env and then .env.development (override)
require('dotenv').config();
require('dotenv').config({ path: '.env.development', override: true });
const helmet = require('helmet');
const logger = require('./utils/logger');

// Middleware
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const {
  SentryService,
  sentryErrorHandler,
  sentryTracingHandler,
} = require('./services/error/sentryService');
const { hermesAccess } = require('./middleware/subscription');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ===== SECURITY MIDDLEWARE =====
// Sentry tracing handler — captures request context for performance monitoring
app.use(sentryTracingHandler());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://api.posthog.com',
          'https://o4508079436193792.ingest.us.sentry.io',
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
      },
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    ieNoOpen: true,
    dnsPrefetchControl: { allow: false },
  })
);
// Webhook routes MUST come before body-parsing middleware because:
//  - Stripe webhooks need the raw body for signature verification
//  - express.raw() on the route-level cannot re-read a stream already consumed by express.json()
try {
  const billingRoutes = require('./routes/billing');
  app.use('/api/billing', billingRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load billing routes:', err.message);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS — use dedicated middleware (supports comma-separated FRONTEND_URL, proper Vary header)
const corsMiddleware = require('./middleware/cors');
app.use(corsMiddleware);

// Input sanitization — prevents NoSQL injection and prototype pollution
const { sanitizeBody, sanitizeQuery, sanitizeParams } = require('./middleware/sanitize');
app.use(sanitizeBody);
app.use(sanitizeQuery);
app.use(sanitizeParams);

// Rate limiting — distributed via Redis when available, in-memory fallback
const { rateLimit } = require('./utils/rateLimiter');

// Auth routes: 10 req/min per IP, 120s block
app.use('/api/auth', rateLimit('auth', { points: 10, duration: 60, blockDuration: 120 }));

// API v1 routes: 200 req/min per IP
app.use('/api/v1', rateLimit('api', { points: 200, duration: 60 }));

// All other API routes: 200 req/min per IP
const apiRoutes = [
  '/api/admin',
  '/api/teams',
  '/api/agents',
  '/api/tools',
  '/api/whatsapp',
  '/api/trust',
  '/api/customs',
  '/api/contacts',
  '/api/accounts',
  '/api/sequences',
  '/api/enrollments',
];
for (const route of apiRoutes) {
  app.use(route, rateLimit('api', { points: 200, duration: 60 }));
}

// Track engagement for all requests
const { trackEngagement } = require('./middleware/analytics/tracking');
app.use(trackEngagement);

// Health check routes (unauthenticated)
const healthRoutes = require('./routes/health');
app.use('/health', healthRoutes);

// ===== API ROUTES =====
// These are set up at module load time so the exported app is fully configured.
// Async service initialization (DB, Kafka, agents, etc.) happens in src/index.js.
// Routes that depend on service availability (e.g. hermes, engine, qme) handle
// missing services gracefully via app.locals.

try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load auth routes:', err.message);
}

try {
  const authProviderRoutes = require('./routes/authProviders');
  app.use('/api/auth/providers', authProviderRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load auth provider routes:', err.message);
}

try {
  const apiV1Routes = require('./api/v1/routes');
  app.use('/api/v1', apiV1Routes);
} catch (err) {
  logger.error('src/app.js: Failed to load API v1 routes:', err.message);
}

try {
  const whatsappRoutes = require('./routes/whatsapp');
  app.use('/api/whatsapp', whatsappRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load whatsapp routes:', err.message);
}

try {
  const supplierTrustRoutes = require('./routes/supplierTrust');
  app.use('/api/trust', supplierTrustRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load supplier trust routes:', err.message);
}

try {
  const customsEngineRoutes = require('./routes/customsEngine');
  app.use('/api/customs', customsEngineRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load customs engine routes:', err.message);
}

try {
  const contactsRoutes = require('./routes/contacts');
  const accountsRoutes = require('./routes/accounts');
  const sequencesRoutes = require('./routes/sequences');
  const enrollmentsRoutes = require('./routes/enrollments');
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/accounts', accountsRoutes);
  app.use('/api/sequences', sequencesRoutes);
  app.use('/api/enrollments', enrollmentsRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load CRM routes:', err.message);
}

try {
  const teamsRoutes = require('./routes/teams');
  const adminRoutes = require('./routes/admin');
  app.use('/api/teams', teamsRoutes);
  app.use('/api/admin', adminRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load team/admin routes:', err.message);
}

try {
  const toolRoutes = require('./routes/tools');
  app.use('/api/tools', toolRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load tool routes:', err.message);
}

try {
  const agentRoutes = require('./routes/agents');
  app.use('/api/agents', agentRoutes);
} catch (err) {
  logger.error('src/app.js: Failed to load agent routes:', err.message);
}

// ===== INLINE ROUTES (service-dependent) =====
const qme = require('./qme/wrapper');
const selfImprovingLoop = require('./engine/selfImprovingLoop');

// QMe dashboard endpoint
app.get('/api/qme/status', async (req, res) => {
  try {
    const status = await qme.getDashboardStatus();
    res.json({ success: true, data: status });
  } catch {
    res.status(503).json({ success: false, error: 'QMe service not available' });
  }
});

// Self-Improving Loop engine endpoint — requires authentication
const { authenticate, authorize } = require('./middleware/auth');

app.get('/api/engine/status', authenticate, (req, res) => {
  const status = selfImprovingLoop.getEngineStatus();
  res.json({ success: true, data: status });
});

app.post('/api/engine/run-cycle', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const result = await selfImprovingLoop.runLoopCycle(parseInt(req.query.batchSize) || 100);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Engine: run-cycle error:', err.message);
    res.status(500).json({ success: false, error: 'An internal error occurred' });
  }
});

app.post('/api/engine/feedback', authenticate, async (req, res) => {
  try {
    const allowedFields = [
      'target',
      'type',
      'explicit',
      'implicit',
      'context',
      'metadata',
      'rating',
      'comments',
    ];
    const sanitized = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        sanitized[field] = req.body[field];
      }
    }
    const feedback = await selfImprovingLoop.submitFeedback({
      ...sanitized,
      companyId: req.user.companyId || 'system',
      userId: req.user.id || 'system',
    });
    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    logger.error('Engine: feedback error:', err.message);
    res.status(500).json({ success: false, error: 'An internal error occurred' });
  }
});

// Hermes agent system endpoints — requires authentication
app.get('/api/hermes/status', hermesAccess, async (req, res) => {
  try {
    const status = app.locals.hermesAgent
      ? await app.locals.hermesAgent.getStatus()
      : { error: 'Hermes agent not available' };
    res.json({ success: true, data: status });
  } catch (err) {
    logger.error('Hermes: status error:', err.message);
    res.status(500).json({ success: false, error: 'An internal error occurred' });
  }
});

app.post('/api/hermes/run-cycle', hermesAccess, async (req, res) => {
  try {
    if (!app.locals.hermesAgent) {
      return res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
    }
    const result = await app.locals.hermesAgent.runCycle();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Hermes: run-cycle error:', err.message);
    res.status(500).json({ success: false, error: 'An internal error occurred' });
  }
});

app.post('/api/hermes/start-scheduled-runs', hermesAccess, async (req, res) => {
  try {
    if (!app.locals.hermesAgent) {
      return res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
    }
    app.locals.hermesAgent.startScheduledRuns();
    res.json({ success: true, message: 'Scheduled runs started' });
  } catch (err) {
    logger.error('Hermes: start-scheduled-runs error:', err.message);
    res.status(500).json({ success: false, error: 'An internal error occurred' });
  }
});

app.post('/api/hermes/stop-scheduled-runs', hermesAccess, async (req, res) => {
  try {
    if (!app.locals.hermesAgent) {
      return res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
    }
    app.locals.hermesAgent.stopScheduledRuns();
    res.json({ success: true, message: 'Scheduled runs stopped' });
  } catch (err) {
    logger.error('Hermes: stop-scheduled-runs error:', err.message);
    res.status(500).json({ success: false, error: 'An internal error occurred' });
  }
});

// ===== STATIC FILES & SPA FALLBACK =====
// Serve built frontend assets
app.use(express.static('frontend/dist', { index: false }));

// SPA fallback — serve index.html for non-API GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile('index.html', { root: 'frontend/dist' });
});

// ===== ERROR HANDLING =====
// 404 handler — must come after all routes
app.use(notFoundHandler);

// Sentry error handler — must come before global error handler
app.use(sentryErrorHandler());

// Global error handler — must come last
app.use(globalErrorHandler);

module.exports = app;
