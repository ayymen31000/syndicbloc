// src/routes/api.js - API Versioning & Route Registration (Point 17)
const express = require('express');
const { z } = require('zod');
const { validateRequest } = require('../middleware/validator');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { uploadReceipt } = require('../middleware/upload');

const authController = require('../controllers/authController');
const apartmentsController = require('../controllers/apartmentsController');
const cotisationsController = require('../controllers/cotisationsController');
const depensesController = require('../controllers/depensesController');
const statsController = require('../controllers/statsController');
const backupController = require('../controllers/backupController');

const router = express.Router();

// ================= SCHEMAS =================
const loginSchema = {
  body: z.object({
    email: z.string().min(1, 'Identifiant requis').optional(),
    username: z.string().min(1, 'Identifiant requis').optional(),
    identifier: z.string().min(1, 'Identifiant requis').optional(),
    password: z.string().min(1, 'Mot de passe requis'),
    twoFactorToken: z.string().length(6, 'Le code 2FA doit comporter 6 chiffres').optional(),
  }).refine((data) => Boolean(data.email || data.username || data.identifier), {
    message: "Nom d'utilisateur ou email requis",
  }),
};

const verify2FASchema = {
  body: z.object({
    token: z.string().length(6, 'Le code 2FA doit comporter 6 chiffres'),
  }).strict(),
};

const monthQuerySchema = {
  query: z.object({
    mois: z.string().regex(/^(1[0-2]|[1-9])$/, 'Le mois doit être entre 1 et 12'),
    annee: z.string().regex(/^\d{4}$/, 'L\'année doit être un nombre à 4 chiffres'),
  }),
};

const updateApartmentSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    nom_resident: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').optional(),
    telephone: z.string().max(25).nullable().optional(),
    notes: z.string().max(200).nullable().optional(),
  }).strict(),
};

const toggleCotisationSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    date_paiement: z.string().optional(),
  }).optional(),
};

const bulkFloorSchema = {
  body: z.object({
    etage: z.string().min(1),
    mois: z.number().int().min(1).max(12),
    annee: z.number().int().min(2020),
    markAsPaid: z.boolean(),
  }).strict(),
};

const createDepenseSchema = {
  body: z.object({
    titre: z.string().min(2, 'Le motif doit comporter au moins 2 caractères'),
    montant: z.union([z.number().positive(), z.string().regex(/^\d+$/).transform(Number)]),
    date_depense: z.string().min(8),
    mois: z.union([z.number().min(1).max(12), z.string().regex(/^(1[0-2]|[1-9])$/).transform(Number)]),
    annee: z.union([z.number().min(2020), z.string().regex(/^\d{4}$/).transform(Number)]),
    categorie: z.string().optional(),
  }),
};

const deleteDepenseSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

// ================= AUTH ROUTES =================
router.post('/auth/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/auth/refresh', authController.refreshTokenHandler);
router.post('/auth/logout', requireAuth, authController.logout);
router.get('/auth/me', requireAuth, authController.getMe);
router.post('/auth/2fa/setup', requireAuth, authController.setup2FA);
router.post('/auth/2fa/verify', requireAuth, validateRequest(verify2FASchema), authController.verifyAndEnable2FA);

// ================= APARTMENTS ROUTES =================
router.get('/apartments', requireAuth, apartmentsController.getAllApartments);
router.put('/apartments/:id', requireAuth, validateRequest(updateApartmentSchema), apartmentsController.updateApartment);

// ================= COTISATIONS ROUTES =================
router.get('/cotisations', requireAuth, validateRequest(monthQuerySchema), cotisationsController.getCotisationsByMonth);
router.put('/cotisations/:id/toggle', requireAuth, validateRequest(toggleCotisationSchema), cotisationsController.toggleCotisation);
router.post('/cotisations/bulk-floor', requireAuth, validateRequest(bulkFloorSchema), cotisationsController.bulkToggleFloor);

// ================= EXPENSES ROUTES =================
router.get('/depenses', requireAuth, validateRequest(monthQuerySchema), depensesController.getDepensesByMonth);
router.post(
  '/depenses',
  requireAuth,
  uploadReceipt.single('justificatif'),
  validateRequest(createDepenseSchema),
  depensesController.createDepense
);
router.delete('/depenses/:id', requireAuth, validateRequest(deleteDepenseSchema), depensesController.deleteDepense);

// ================= FINANCIAL STATS ROUTES =================
router.get('/stats', requireAuth, validateRequest(monthQuerySchema), statsController.getFinancialStats);

// ================= BACKUP & RESTORE ROUTES =================
router.get('/backup/export', requireAuth, backupController.exportBackup);
router.post('/backup/import', requireAuth, backupController.importBackup);

module.exports = router;
