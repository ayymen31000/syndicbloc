// src/controllers/authController.js - Secure Authentication (Points 1, 2, 6, 7, 11)
const prisma = require('../config/prisma');
const env = require('../config/env');
const logger = require('../config/logger');
const {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  generateTwoFactorSecret,
  generateQRCodeDataURL,
  verifyTwoFactorToken,
  sanitizeAdmin,
} = require('../utils/security');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function login(req, res, next) {
  try {
    const identifier = (req.body.username || req.body.email || req.body.identifier || '').toLowerCase().trim();
    const { password, twoFactorToken } = req.body;

    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
    });

    if (!admin) {
      // Timing-safe response to prevent user enumeration
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants incorrects ou compte verrouillé.',
      });
    }

    // Check account lockout (Point 1)
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      const minutesRemaining = Math.ceil((new Date(admin.locked_until) - new Date()) / 60000);
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        message: `Compte verrouillé suite à 5 tentatives échouées. Réessayez dans ${minutesRemaining} minute(s).`,
      });
    }

    // Check password
    const passwordMatch = await verifyPassword(password, admin.mot_de_passe_hash);

    if (!passwordMatch) {
      const failedAttempts = admin.failed_attempts + 1;
      let updateData = { failed_attempts: failedAttempts };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        logger.warn(`Account locked due to failed attempts: ${admin.username || admin.email}`);
      }

      await prisma.admin.update({
        where: { id: admin.id },
        data: updateData,
      });

      const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: remaining > 0
          ? `Identifiants incorrects. Tentatives restantes avant verrouillage : ${remaining}.`
          : `Compte verrouillé pour ${LOCKOUT_MINUTES} minutes suite à ${MAX_FAILED_ATTEMPTS} échecs consécutifs.`,
      });
    }

    // 2FA Verification (Point 1)
    if (admin.two_factor_enabled) {
      if (!twoFactorToken) {
        return res.status(200).json({
          status: 'success',
          require2FA: true,
          message: 'Code d\'authentification à deux facteurs (2FA) requis.',
        });
      }

      const isValid2FA = verifyTwoFactorToken(twoFactorToken, admin.two_factor_secret);
      if (!isValid2FA) {
        return res.status(401).json({
          status: 'error',
          code: 'INVALID_2FA_TOKEN',
          message: 'Code 2FA incorrect ou expiré.',
        });
      }
    }

    // Reset failed attempts upon successful login
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);
    const refreshTokenHash = await hashPassword(refreshToken);

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failed_attempts: 0,
        locked_until: null,
        refresh_token_hash: refreshTokenHash,
      },
    });

    // Set secure HttpOnly cookies (Point 6)
    const isProd = env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await prisma.auditLog.create({
      data: {
        admin_id: admin.id,
        action: 'AUTH_LOGIN',
        ip_address: req.ip,
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        admin: sanitizeAdmin(admin),
        token: accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function refreshTokenHandler(req, res, next) {
  try {
    const rawToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({
        status: 'error',
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Jeton de rafraîchissement absent.',
      });
    }

    let payload;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Jeton de rafraîchissement invalide ou expiré.',
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || !admin.refresh_token_hash) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Session expirée.',
      });
    }

    // Verify token hash
    const isValid = await verifyPassword(rawToken, admin.refresh_token_hash);
    if (!isValid) {
      // Possible reuse attack detected: invalidate refresh token
      await prisma.admin.update({
        where: { id: admin.id },
        data: { refresh_token_hash: null },
      });
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_REUSE_DETECTED',
        message: 'Anomalie de sécurité détectée. Veuillez vous reconnecter.',
      });
    }

    // Refresh Token Rotation (Point 6)
    const newAccessToken = generateAccessToken(admin);
    const newRefreshToken = generateRefreshToken(admin);
    const newRefreshHash = await hashPassword(newRefreshToken);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { refresh_token_hash: newRefreshHash },
    });

    const isProd = env.NODE_ENV === 'production';
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        token: newAccessToken,
        admin: sanitizeAdmin(admin),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user && req.user.id) {
      await prisma.admin.update({
        where: { id: req.user.id },
        data: { refresh_token_hash: null },
      });
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });

    return res.status(200).json({
      status: 'success',
      message: 'Déconnexion réussie.',
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  return res.status(200).json({
    status: 'success',
    data: {
      admin: req.user,
    },
  });
}

async function setup2FA(req, res, next) {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
    });

    const { secret, otpauth } = generateTwoFactorSecret(admin.username || admin.email);
    const qrCode = await generateQRCodeDataURL(otpauth);

    // Save temporary secret (not yet enabled until verified)
    await prisma.admin.update({
      where: { id: admin.id },
      data: { two_factor_secret: secret },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        secret,
        qrCode,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function verifyAndEnable2FA(req, res, next) {
  try {
    const { token } = req.body;
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
    });

    if (!admin.two_factor_secret) {
      return res.status(400).json({
        status: 'error',
        code: 'SETUP_NOT_INITIATED',
        message: 'Veuillez initier la configuration 2FA d\'abord.',
      });
    }

    const isValid = verifyTwoFactorToken(token, admin.two_factor_secret);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_2FA_CODE',
        message: 'Code 2FA invalide.',
      });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { two_factor_enabled: true },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Authentification à deux facteurs activée avec succès.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refreshTokenHandler,
  logout,
  getMe,
  setup2FA,
  verifyAndEnable2FA,
};
