// src/config/env.js - Strict Environment Variables Validation using Zod (Security Point 10)
const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  PORT: z.union([z.string(), z.number()]).default('3000').transform(val => parseInt(String(val), 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long").default('syndic-bloc-super-secret-jwt-encryption-key-production-32chars-min!'),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters long").default('syndic-bloc-super-secret-refresh-key-production-32chars-min!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  ADMIN_DEFAULT_EMAIL: z.string().email().default('admin@syndic.dz'),
  ADMIN_DEFAULT_PASSWORD: z.string().min(10).default('AdminPassword2026!'),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Fatal: Environment variables validation failed:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

module.exports = parsedEnv.data;
