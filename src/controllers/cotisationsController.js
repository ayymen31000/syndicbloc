// src/controllers/cotisationsController.js - Monthly Fee Tracking (Points 5, 15, 16)
const prisma = require('../config/prisma');

const RATE_PER_APARTMENT = 500; // 500 DA
const TOTAL_APARTMENTS = 24;

// Auto-seed missing cotisations for the requested month in an ACID transaction
async function ensureMonthCotisations(mois, annee) {
  const apartments = await prisma.appartement.findMany({
    where: { actif: true },
    orderBy: { numero: 'asc' },
  });

  const existingCotisations = await prisma.cotisation.findMany({
    where: { mois, annee },
  });

  const existingMap = new Set(existingCotisations.map(c => c.appartement_id));
  const missing = apartments.filter(a => !existingMap.has(a.id));

  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map(apt =>
        prisma.cotisation.create({
          data: {
            appartement_id: apt.id,
            mois,
            annee,
            montant: RATE_PER_APARTMENT,
            est_paye: false,
          },
        })
      )
    );
  }
}

async function getCotisationsByMonth(req, res, next) {
  try {
    const mois = parseInt(req.query.mois, 10);
    const annee = parseInt(req.query.annee, 10);

    // Auto-ensure 24 records exist for this month/year in DB
    await ensureMonthCotisations(mois, annee);

    // Fetch with relation without N+1 problem (Point 15)
    const cotisations = await prisma.cotisation.findMany({
      where: { mois, annee },
      include: {
        appartement: {
          select: {
            id: true,
            numero: true,
            etage: true,
            nom_resident: true,
            telephone: true,
            notes: true,
          },
        },
      },
      orderBy: {
        appartement: { numero: 'asc' },
      },
    });

    const paidCount = cotisations.filter(c => c.est_paye).length;
    const totalCollected = paidCount * RATE_PER_APARTMENT;
    const totalExpected = TOTAL_APARTMENTS * RATE_PER_APARTMENT;

    return res.status(200).json({
      status: 'success',
      data: {
        mois,
        annee,
        summary: {
          totalApartments: TOTAL_APARTMENTS,
          paidCount,
          unpaidCount: TOTAL_APARTMENTS - paidCount,
          totalCollected,
          totalExpected,
          collectionRate: Math.round((paidCount / TOTAL_APARTMENTS) * 100),
        },
        cotisations,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function toggleCotisation(req, res, next) {
  try {
    const { id } = req.params;
    const { date_paiement } = req.body || {};

    const cotisation = await prisma.cotisation.findUnique({
      where: { id },
      include: { appartement: true },
    });

    if (!cotisation) {
      return res.status(404).json({
        status: 'error',
        code: 'COTISATION_NOT_FOUND',
        message: 'Cotisation non trouvée.',
      });
    }

    const nextState = !cotisation.est_paye;
    const paymentDate = nextState
      ? (date_paiement ? new Date(date_paiement) : new Date())
      : null;

    // ACID transaction (Point 16)
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.cotisation.update({
        where: { id },
        data: {
          est_paye: nextState,
          date_paiement: paymentDate,
        },
        include: {
          appartement: true,
        },
      });

      await tx.auditLog.create({
        data: {
          admin_id: req.user.id,
          action: nextState ? 'COTISATION_PAID' : 'COTISATION_UNPAID',
          details: `Appt ${cotisation.appartement.numero} (${cotisation.mois}/${cotisation.annee}) marqué ${nextState ? 'PAYÉ' : 'NON PAYÉ'}`,
          ip_address: req.ip,
        },
      });

      return result;
    });

    return res.status(200).json({
      status: 'success',
      data: { cotisation: updated },
    });
  } catch (err) {
    next(err);
  }
}

async function bulkToggleFloor(req, res, next) {
  try {
    const { etage, mois, annee, markAsPaid } = req.body;

    const apartmentsOnFloor = await prisma.appartement.findMany({
      where: { etage: String(etage) },
      select: { id: true, numero: true },
    });

    const aptIds = apartmentsOnFloor.map(a => a.id);

    await prisma.$transaction(async (tx) => {
      await tx.cotisation.updateMany({
        where: {
          appartement_id: { in: aptIds },
          mois,
          annee,
        },
        data: {
          est_paye: markAsPaid,
          date_paiement: markAsPaid ? new Date() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          admin_id: req.user.id,
          action: markAsPaid ? 'FLOOR_MARKED_PAID' : 'FLOOR_MARKED_UNPAID',
          details: `Étage ${etage} (${mois}/${annee}) marqué ${markAsPaid ? 'PAYÉ' : 'NON PAYÉ'}`,
          ip_address: req.ip,
        },
      });
    });

    return res.status(200).json({
      status: 'success',
      message: `Tous les appartements de l'étage ${etage} ont été mis à jour.`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCotisationsByMonth,
  toggleCotisation,
  bulkToggleFloor,
};
