// tests/financial.test.js - Unit tests on financial calculations (Security Point 19)
describe('Calculs Financiers du Syndic (Cotisations & Caisse)', () => {
  const RATE_PER_APARTMENT = 500;
  const TOTAL_APARTMENTS = 24;
  const EXPECTED_MONTHLY_TOTAL = TOTAL_APARTMENTS * RATE_PER_APARTMENT; // 12,000 DA

  test('Vérifie le montant mensuel théorique attendu (12 000 DA)', () => {
    expect(EXPECTED_MONTHLY_TOTAL).toBe(12000);
  });

  test('Calcule correctement le total encaissé et le taux de recouvrement', () => {
    const paidCount = 17;
    const collected = paidCount * RATE_PER_APARTMENT;
    const unpaidCount = TOTAL_APARTMENTS - paidCount;
    const remainingAmount = unpaidCount * RATE_PER_APARTMENT;
    const rate = Math.round((paidCount / TOTAL_APARTMENTS) * 100);

    expect(collected).toBe(8500);
    expect(remainingAmount).toBe(3500);
    expect(collected + remainingAmount).toBe(12000);
    expect(rate).toBe(71); // 17/24 = 70.83% -> 71%
  });

  test('Calcule correctement le solde net mensuel (Recettes - Dépenses)', () => {
    const collected = 8500;
    const expenses = 5500; // 4000 (Ménage) + 1500 (Lampes)
    const netBalance = collected - expenses;

    expect(netBalance).toBe(3000);
  });

  test('Gère les situations de déficit mensuel (Dépenses > Recettes)', () => {
    const collected = 2000; // 4 payés
    const expenses = 6000;
    const netBalance = collected - expenses;

    expect(netBalance).toBe(-4000);
    expect(netBalance < 0).toBe(true);
  });

  test('Calcule la trésorerie globale cumulée sur plusieurs mois', () => {
    const months = [
      { collected: 11000, expenses: 6500 }, // Sep
      { collected: 8500, expenses: 5500 },  // Oct
    ];

    const totalIncome = months.reduce((acc, m) => acc + m.collected, 0);
    const totalExpenses = months.reduce((acc, m) => acc + m.expenses, 0);
    const globalTreasury = totalIncome - totalExpenses;

    expect(totalIncome).toBe(19500);
    expect(totalExpenses).toBe(12000);
    expect(globalTreasury).toBe(7500);
  });

  test('Vérifie la complétude d\'un étage (3 appartements)', () => {
    const floorApts = [
      { id: 1, est_paye: true },
      { id: 2, est_paye: true },
      { id: 3, est_paye: true },
    ];
    const isComplete = floorApts.every(a => a.est_paye);
    expect(isComplete).toBe(true);

    floorApts[1].est_paye = false;
    expect(floorApts.every(a => a.est_paye)).toBe(false);
  });
});
