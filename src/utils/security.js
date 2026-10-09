// src/utils/security.js - Cryptographic & Security Utilities (Points 1, 5, 6, 7, 11)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const qrcode = require('qrcode');
const env = require('../config/env');

const BCRYPT_SALT_ROUNDS = 12;

// 1. Password Hashing & Verification (Point 7)
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function validatePasswordComplexity(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      message: "Le mot de passe doit comporter au moins une majuscule, une minuscule, un chiffre et un caractère spécial."
    };
  }
  return { valid: true };
}

// 2. JWT Tokens (Point 6)
function generateAccessToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      username: admin.username,
      role: 'ADMIN',
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function generateRefreshToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      tokenType: 'REFRESH',
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

// 3. Two-Factor Authentication (Native RFC 6238 TOTP / Google Authenticator - Point 1)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }
  let base32 = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5);
    base32 += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return base32;
}

function base32ToBuffer(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, counter) {
  const key = base32ToBuffer(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

function generateTwoFactorSecret(email) {
  const secret = generateBase32Secret(20);
  const otpauth = `otpauth://totp/SyndicBloc:${encodeURIComponent(email)}?secret=${secret}&issuer=SyndicBloc`;
  return { secret, otpauth };
}

async function generateQRCodeDataURL(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

function verifyTwoFactorToken(token, secret, window = 1) {
  if (!token || !secret) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (generateTOTP(secret, currentCounter + i) === String(token).trim()) {
      return true;
    }
  }
  return false;
}

// 4. Safe User Serialization (Point 11 - strip sensitive hashes)
function sanitizeAdmin(admin) {
  if (!admin) return null;
  const {
    mot_de_passe_hash,
    two_factor_secret,
    refresh_token_hash,
    ...safeAdmin
  } = admin;
  return safeAdmin;
}

// 5. Basic XSS string escaping (Point 5)
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordComplexity,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTwoFactorSecret,
  generateQRCodeDataURL,
  verifyTwoFactorToken,
  sanitizeAdmin,
  sanitizeString,
};
