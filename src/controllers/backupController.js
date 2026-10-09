// src/controllers/backupController.js - Full Database Dump & Restore (Requirement I.5 & Point 16)
const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');

async function exportBackup(req, res, next) {
  try {
    const appartements = await prisma.appartement.findMany({
      orderBy: { numero: 'asc' },
    });

    const cotisations = await prisma.cotisation.findMany({
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }, { appartement_id: 'asc' }],
    });

    const depenses = await prisma.depense.findMany({
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }, { date_depense: 'desc' }],
    });

    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      building: {
        totalApartments: appartements.length,
        ratePerApartment: 500,
      },
      data: {
        appartements,
        cotisations,
        depenses,
        auditLogs,
      },
    };

    const filename = `syndic_database_backup_${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await prisma.auditLog.create({
      data: {
        admin_id: req.user.id,
        action: 'DATABASE_BACKUP_EXPORTED',
        details: `Export complet de la base (${cotisations.length} cotisations, ${depenses.length} dépenses)`,
        ip_address: req.ip,
      },
    });

    return res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    next(err);
  }
}

async function importBackup(req, res, next) {
  try {
    const { data } = req.body;
    if (!data || !data.appartements || !data.cotisations) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_BACKUP_FORMAT',
        message: 'Format de fichier de sauvegarde invalide.',
      });
    }

    // ACID transaction to restore data cleanly (Point 16)
    await prisma.$transaction(async (tx) => {
      // 1. Restore/Upsert apartments
      for (const apt of data.appartements) {
        await tx.appartement.upsert({
          where: { numero: apt.numero },
          update: {
            nom_resident: apt.nom_resident,
            telephone: apt.telephone,
            notes: apt.notes,
            actif: apt.actif ?? true,
          },
          create: {
            id: apt.id,
            numero: apt.numero,
            etage: String(apt.etage),
            nom_resident: apt.nom_resident,
            telephone: apt.telephone,
            notes: apt.notes,
            actif: apt.actif ?? true,
          },
        });
      }

      // 2. Restore/Upsert cotisations
      for (const cot of data.cotisations) {
        await tx.cotisation.upsert({
          where: {
            appartement_id_mois_annee: {
              appartement_id: cot.appartement_id,
              mois: cot.mois,
              annee: cot.annee,
            },
          },
          update: {
            montant: cot.montant || 500,
            est_paye: cot.est_paye,
            date_paiement: cot.date_paiement ? new Date(cot.date_paiement) : null,
          },
          create: {
            id: cot.id,
            appartement_id: cot.appartement_id,
            mois: cot.mois,
            annee: cot.annee,
            montant: cot.montant || 500,
            est_paye: cot.est_paye,
            date_paiement: cot.date_paiement ? new Date(cot.date_paiement) : null,
          },
        });
      }

      // 3. Restore expenses if provided
      if (Array.isArray(data.depenses)) {
        for (const dep of data.depenses) {
          await tx.depense.upsert({
            where: { id: dep.id },
            update: {
              titre: dep.titre,
              montant: dep.montant,
              date_depense: new Date(dep.date_depense),
              mois: dep.mois,
              annee: dep.annee,
              categorie: dep.categorie || 'Autre',
            },
            create: {
              id: dep.id,
              titre: dep.titre,
              montant: dep.montant,
              date_depense: new Date(dep.date_depense),
              mois: dep.mois,
              annee: dep.annee,
              categorie: dep.categorie || 'Autre',
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          admin_id: req.user.id,
          action: 'DATABASE_BACKUP_RESTORED',
          details: `Restauration de la base effectuée`,
          ip_address: req.ip,
        },
      });
    });

    return res.status(200).json({
      status: 'success',
      message: 'Base de données restaurée avec succès.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportBackup,
  importBackup,
};
