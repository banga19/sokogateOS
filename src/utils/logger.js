const winston = require('winston');
const path = require('path');

// Log directory — configurable via LOG_DIR, defaults to ./logs
const logDir = path.resolve(process.env.LOG_DIR || './logs');
const maxSize = 10 * 1024 * 1024; // 10MB per file
const maxFiles = 10;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...rest }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      if (stack) log += `\n${stack}`;
      const meta = Object.keys(rest).length ? JSON.stringify(rest) : '';
      if (meta) log += ` ${meta}`;
      return log;
    })
  ),
  transports: [
    // Console transport — JSON in production, readable in dev
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.combine(winston.format.timestamp(), winston.format.json())
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
          ),
    }),

    // Error log — rotating file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: maxSize,
      maxFiles,
      tailable: true,
    }),

    // Combined log — rotating file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: maxSize,
      maxFiles,
      tailable: true,
    }),
  ],
});

module.exports = logger;