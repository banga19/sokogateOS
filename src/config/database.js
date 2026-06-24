const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // In development, use a short timeout so the server starts quickly
    // even when MongoDB is not running
    const opts =
      process.env.NODE_ENV === 'development'
        ? { serverSelectionTimeoutMS: 3000 }
        : {};
    const conn = await mongoose.connect(process.env.MONGODB_URI, opts);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`Database connection failed: ${error.message}. Continuing without database for development.`);
      // In development, we allow the server to start without a database for testing purposes.
      return;
    }
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;