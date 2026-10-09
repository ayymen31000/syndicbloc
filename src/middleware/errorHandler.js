// src/middleware/errorHandler.js - Global Error Handler (Security Point 12)
const logger = require('../config/logger');
const env = require('../config/env');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled Application Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err.statusCode || err.status || 500;
  const isProduction = env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: isProduction && statusCode === 500
      ? 'Une erreur interne est survenue sur le serveur.'
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = { errorHandler };
