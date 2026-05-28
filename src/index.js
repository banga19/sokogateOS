const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const kafka = require('kafka-node');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('rate-limiter-flexible');
const socketIO = require('socket.io');
const http = require('http');
const winston = require('winston');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

const rateLimiter = new rateLimit.RateLimiterRedis({
  storeClient: redisClient,
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900 // 15 minutes
});

app.use((req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    });
});

// Logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR || './logs', 'combined.log') })
  ]
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sokogateos', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('Connected to MongoDB'))
.catch(err => logger.error('MongoDB connection error:', err));

// Kafka setup
const kafkaClient = new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BROKERS || 'localhost:9092' });
const producer = new kafka.Producer(kafkaClient);

producer.on('ready', () => {
  logger.info('Kafka producer is ready');
});

producer.on('error', (err) => {
  logger.error('Kafka producer error:', err);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const ingestionRoutes = require('./routes/ingestion');
const sourcingRoutes = require('./routes/sourcing');
const customizationRoutes = require('./routes/customization');
const logisticsRoutes = require('./routes/logistics');
const analyticsRoutes = require('./routes/analytics');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/sourcing', sourcingRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'sokogateOS'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`sokogateOS AI Operating System running on port ${PORT}`);
});

module.exports = { app, server, io };
