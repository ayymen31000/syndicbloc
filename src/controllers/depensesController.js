// src/controllers/depensesController.js - Building Expenses Management (Points 13, 16)
const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const { sanitizeString } = require('../utils/security');

async function getDepensesByMonth(req, res, next) {
  try {
    const mois = parseInt(req.query.mois, 10);
    const annee = parseInt(req.query.annee, 10);

    const depenses = await prisma.depense.findMany({
      where: { mois, annee },
      orderBy: { date_depense: 'desc' },
    });

    const totalMontant = depenses.reduce((acc, d) => acc + d.montant, 0);

    return res.status(200).json({
      status: 'success',
      data: {
        mois,
        annee,
        totalMontant,
        count: depenses.length,
        depenses,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function createDepense(req, res, next) {
  try {
    const { titre, montant, date_depense, mois, annee, categorie } = req.body;

    let justificatif_url = null;
    if (req.file) {
      justificatif_url = `/uploads/${req.file.filename}`;
    }

    const depense = await prisma.$transaction(async (tx) => {
      const created = await tx.depense.create({
        data: {
          titre: sanitizeString(titre.trim()),
          montant: parseInt(montant, 10),
          date_depense: new Date(date_depense),
          mois: parseInt(mois, 10),
          annee: parseInt(annee, 10),
          categorie: categorie ? sanitizeString(categorie.trim()) : 'Autre',
          justificatif_url,
        },
      });

      await tx.auditLog.create({
        data: {
          admin_id: req.user.id,
          action: 'DEPENSE_CREATED',
          details: `Dépense de ${created.montant} DA enregistrée : "${created.titre}"`,
          ip_address: req.ip,
        },
      });

      return created;
    });

    return res.status(201).json({
      status: 'success',
      data: { depense },
    });
  } catch (err) {
    // Clean up uploaded file if DB insertion failed
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    next(err);
  }
}

async function deleteDepense(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.depense.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        code: 'EXPENSE_NOT_FOUND',
        message: 'Dépense non trouvée.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.depense.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          admin_id: req.user.id,
          action: 'DEPENSE_DELETED',
          details: `Suppression dépense: "${existing.titre}" (${existing.montant} DA)`,
          ip_address: req.ip,
        },
      });
    });

    // Delete file if exists
    if (existing.justificatif_url) {
      const filepath = path.join(process.cwd(), existing.justificatif_url);
      if (fs.existsSync(filepath)) {
        try { fs.unlinkSync(filepath); } catch (e) { /* ignore */ }
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Dépense supprimée avec succès.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDepensesByMonth,
  createDepense,
  deleteDepense,
};
