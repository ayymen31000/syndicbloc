// src/middleware/upload.js - Secure File Upload Middleware (Security Point 13)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const env = require('../config/env');

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types for expense receipts (images and PDFs)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `receipt_${Date.now()}_${crypto.randomUUID().substring(0, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    const err = new Error('Type de fichier non autorisé. Seules les images (JPG, PNG, WEBP) et PDF sont acceptées.');
    err.statusCode = 400;
    cb(err, false);
  }
};

const uploadReceipt = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max (Security Point 13)
  },
  fileFilter,
});

module.exports = { uploadReceipt };
