// src/controllers/statsController.js - High-performance Financial Statistics (Points 15, 16)
const prisma = require('../config/prisma');

const RATE = 500;
const TOTAL_APTS = 24;

async function getFinancialStats(req, res, next) {
  try {
    const mois = parseInt(req.query.mois, 10);
    const annee = parseInt(req.query.annee, 10);

    // 1. Monthly Cotisations aggregated query
    const monthlyPaidCount = await prisma.cotisation.count({
      where: {
        mois,
        annee,
        est_paye: true,
      },
    });

    const monthlyCollected = monthlyPaidCount * RATE;
    const monthlyExpected = TOTAL_APTS * RATE;

    // 2. Monthly Expenses aggregated query
    const monthlyExpensesSum = await prisma.depense.aggregate({
      where: { mois, annee },
      _sum: { montant: true },
      _count: { id: true },
    });

    const monthlyExpenses = monthlyExpensesSum._sum.montant || 0;
    const monthlyExpenseCount = monthlyExpensesSum._count.id || 0;
    const monthlyNetBalance = monthlyCollected - monthlyExpenses;

    // 3. All-Time (Global) Treasury aggregated queries across entire database
    const allTimePaidCount = await prisma.cotisation.count({
      where: { est_paye: true },
    });
    const allTimeIncome = allTimePaidCount * RATE;

    const allTimeExpensesSum = await prisma.depense.aggregate({
      _sum: { montant: true },
    });
    const allTimeExpenses = allTimeExpensesSum._sum.montant || 0;
    const allTimeTreasury = allTimeIncome - allTimeExpenses;

    // 4. Floor collection breakdown for current month
    const floorStats = [];
    const floors = ['7', '6', '5', '4', '3', '2', '1', 'RDC'];

    for (const floor of floors) {
      const aptsOnFloor = await prisma.appartement.findMany({
        where: { etage: floor },
        select: { id: true, numero: true },
      });
      const aptIds = aptsOnFloor.map(a => a.id);

      const paidOnFloor = await prisma.cotisation.count({
        where: {
          mois,
          annee,
          appartement_id: { in: aptIds },
          est_paye: true,
        },
      });

      floorStats.push({
        etage: floor,
        total: aptsOnFloor.length,
        paid: paidOnFloor,
        unpaid: aptsOnFloor.length - paidOnFloor,
        isComplete: paidOnFloor === aptsOnFloor.length,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        mois,
        annee,
        month: {
          collected: monthlyCollected,
          expected: monthlyExpected,
          paidCount: monthlyPaidCount,
          unpaidCount: TOTAL_APTS - monthlyPaidCount,
          rate: Math.round((monthlyPaidCount / TOTAL_APTS) * 100),
          expenses: monthlyExpenses,
          expensesCount: monthlyExpenseCount,
          netBalance: monthlyNetBalance,
        },
        global: {
          allTimeIncome,
          allTimeExpenses,
          treasury: allTimeTreasury,
        },
        floors: floorStats,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFinancialStats,
};
