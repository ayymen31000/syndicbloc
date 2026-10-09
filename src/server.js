// src/server.js - Application Entrypoint & Production Hardening (Points 3, 8, 9, 12, 17, 20)
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const apiRoutes = require('./routes/api');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust reverse proxy (Render, Cloudflare, AWS, etc.) for rate limiter and HTTPS
app.set('trust proxy', 1);

// 1. Endpoint Security with Helmet (Point 3)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.disable('x-powered-by'); // Point 3

// 2. Strict CORS Configuration (Point 9)
const allowedOrigins = [env.CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Non autorisé par la politique CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 3. Body Parsing & Cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Rate Limiting (Point 8)
app.use('/api/', globalLimiter);

// 5. Static Files & Uploads
const uploadPath = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// Static frontend serving with no-cache headers in development to ensure immediate live reload
app.use(express.static(path.resolve(__dirname, '..'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// 6. API Versioning (Point 17)
app.use('/api/v1', apiRoutes);

// 7. Fallback to index.html for Single-Page Application
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      status: 'error',
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} introuvable.`,
    });
  }
  // Do not send HTML for missing asset files (avoid syntax errors in browsers)
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
    return res.status(404).end();
  }
  res.sendFile(path.resolve(__dirname, '..', 'index.html'));
});

// 8. Global Error Handling Middleware (Point 12)
app.use(errorHandler);

// 9. Server Initialization
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Serveur SyndicBloc démarré sur http://localhost:${env.PORT} [Environnement: ${env.NODE_ENV}]`);
});

// 10. Process Safety & Graceful Shutdown (Points 12 & 20)
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception:', { message: err.message, stack: err.stack });
  gracefulShutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('CRITICAL: Unhandled Promise Rejection:', { reason });
});

function gracefulShutdown(exitCode = 0) {
  logger.info('Arrêt gracieux du serveur en cours...');
  server.close(async () => {
    logger.info('Connexions HTTP fermées.');
    try {
      await prisma.$disconnect();
      logger.info('Connexion à la base de données déconnectée.');
    } catch (e) {
      logger.error('Erreur déconnexion base de données: ' + e.message);
    }
    process.exit(exitCode);
  });

  // Force close after 10s if stuck
  setTimeout(() => {
    logger.error('Délai d\'arrêt gracieux dépassé, fermeture forcée.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown(0));
process.on('SIGINT', () => gracefulShutdown(0));

module.exports = { app, server };
