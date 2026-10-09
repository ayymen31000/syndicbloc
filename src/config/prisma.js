// src/config/prisma.js - Prisma Client singleton
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning: ' + e.message);
});

prisma.$on('error', (e) => {
  logger.error('Prisma error: ' + e.message);
});

module.exports = prisma;
