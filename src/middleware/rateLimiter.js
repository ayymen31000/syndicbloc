// src/middleware/rateLimiter.js - Rate limiting (Security Point 8)
const rateLimit = require('express-rate-limit');

// Global rate limiter: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de requêtes depuis cette adresse IP. Veuillez patienter 15 minutes.',
  },
});

// Strict auth limiter: 10 in prod, 100 in dev per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
};
