// src/config/logger.js - Structured Winston Logger without secret leakage (Security Point 18)
const winston = require('winston');
const env = require('./env');

// Redact sensitive keys from log objects
const redactSensitiveData = winston.format((info) => {
  const sensitiveKeys = ['password', 'mot_de_passe', 'mot_de_passe_hash', 'secret', 'two_factor_secret', 'token', 'authorization', 'cookie'];
  
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        copy[key] = '[REDACTED]';
      } else if (typeof copy[key] === 'object') {
        copy[key] = sanitize(copy[key]);
      }
    }
    return copy;
  };

  return sanitize(info);
});

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    redactSensitiveData(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'syndic-bloc-backend' },
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
              return `[${timestamp}] ${level}: ${message}${metaStr}`;
            })
          )
    })
  ]
});

module.exports = logger;
