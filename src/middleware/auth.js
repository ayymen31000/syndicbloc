// src/middleware/auth.js - Authentication & RBAC Middleware (Points 1, 2, 6)
const prisma = require('../config/prisma');
const { verifyAccessToken, sanitizeAdmin } = require('../utils/security');
const logger = require('../config/logger');

async function requireAuth(req, res, next) {
  try {
    let token = null;

    // Check HttpOnly cookie first, then fallback to Authorization header
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Accès refusé. Veuillez vous authentifier.',
      });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_INVALID',
        message: 'Session expirée ou jeton invalide.',
      });
    }

    // Verify admin existence in database
    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin) {
      return res.status(401).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable.',
      });
    }

    // Check account lockout
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        message: 'Compte temporairement verrouillé pour des raisons de sécurité.',
      });
    }

    // Bind authenticated admin to request (Points 2 & 11)
    req.user = sanitizeAdmin(admin);
    return next();
  } catch (err) {
    logger.error('Erreur authentification middleware: ' + err.message);
    return res.status(500).json({
      status: 'error',
      code: 'AUTH_INTERNAL_ERROR',
      message: 'Erreur interne lors de la vérification de session.',
    });
  }
}

module.exports = { requireAuth };
