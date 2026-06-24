require('dotenv').config();
require('dotenv').config({ path: '.env.development', override: true });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || 'localhost',

  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sokogateos',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    postgres: {
      user: process.env.POSTGRES_USER || 'sokogate',
      password: () => { const v = process.env.POSTGRES_PASSWORD; if (!v) throw new Error('POSTGRES_PASSWORD must be set in production'); return v; },
      db: process.env.POSTGRES_DB || 'sokogate',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    },
  },

  auth: {
    jwtSecret: () => { const v = process.env.JWT_SECRET; if (!v) throw new Error('JWT_SECRET must be set'); return v; },
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authWindowMs: 60000,
    authMax: 10,
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'sokogateos',
  },

  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    minioEndpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    minioAccessKey: process.env.MINIO_ROOT_USER || 'sokogate_access',
    minioSecretKey: () => { const v = process.env.MINIO_ROOT_PASSWORD; if (!v) throw new Error('MINIO_ROOT_PASSWORD must be set in production'); return v; },
    bucketName: process.env.MINIO_BUCKET || 'sokogateos-recordings',
  },

  communications: {
    whatsappUrl: process.env.WHATSAPP_BUSINESS_API_URL || '',
    whatsappToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    smtpHost: process.env.EMAIL_SMTP_HOST || '',
    smtpPort: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
    smtpUser: process.env.EMAIL_USER || '',
    smtpPass: process.env.EMAIL_PASS || '',
  },

  external: {
    posthogApiKey: process.env.POSTHOG_API_KEY || '',
    posthogHost: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    apifyApiKey: process.env.APIFY_API_KEY || '',
    composioApiKey: process.env.COMPOSIO_API_KEY || '',
  },

  features: {
    voiceInterface: process.env.ENABLE_VOICE_INTERFACE === 'true',
    offlineMode: process.env.ENABLE_OFFLINE_MODE === 'true',
    aiFeedbackLoop: process.env.ENABLE_AI_FEEDBACK_LOOP === 'true',
  },

  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    logDir: process.env.LOG_DIR || './logs',
  },
};
