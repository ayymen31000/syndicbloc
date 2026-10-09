// prisma/seed.js - Seed Script for Building Structure, Admin & Initial Financial Data
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const APARTMENTS_DATA = [
  // RDC
  { numero: 1, etage: 'RDC', nom_resident: 'M. Benali', telephone: '0550 12 34 56', notes: 'Copropriétaire occupant' },
  { numero: 2, etage: 'RDC', nom_resident: 'Famille Mansouri', telephone: '0661 23 45 67', notes: '' },
  { numero: 3, etage: 'RDC', nom_resident: 'M. Khelifi', telephone: '0770 34 56 78', notes: '' },
  // 1er Étage
  { numero: 4, etage: '1', nom_resident: 'Mme. Bouzid', telephone: '0555 45 67 89', notes: '' },
  { numero: 5, etage: '1', nom_resident: 'Dr. Amrani', telephone: '0662 56 78 90', notes: '' },
  { numero: 6, etage: '1', nom_resident: 'Famille Saidi', telephone: '0771 67 89 01', notes: '' },
  // 2ème Étage
  { numero: 7, etage: '2', nom_resident: 'M. Belhadj', telephone: '0551 78 90 12', notes: '' },
  { numero: 8, etage: '2', nom_resident: 'Mme. Cherif', telephone: '0663 89 01 23', notes: '' },
  { numero: 9, etage: '2', nom_resident: 'Famille Taleb', telephone: '0772 90 12 34', notes: '' },
  // 3ème Étage
  { numero: 10, etage: '3', nom_resident: 'M. Zerrouki', telephone: '0552 01 23 45', notes: '' },
  { numero: 11, etage: '3', nom_resident: 'Famille Benaissa', telephone: '0664 12 34 56', notes: '' },
  { numero: 12, etage: '3', nom_resident: 'M. Haddad', telephone: '0773 23 45 67', notes: '' },
  // 4ème Étage
  { numero: 13, etage: '4', nom_resident: 'Mme. Larbi', telephone: '0553 34 56 78', notes: '' },
  { numero: 14, etage: '4', nom_resident: 'M. Guettaf', telephone: '0665 45 67 89', notes: '' },
  { numero: 15, etage: '4', nom_resident: 'Famille Meziane', telephone: '0774 56 78 90', notes: '' },
  // 5ème Étage
  { numero: 16, etage: '5', nom_resident: 'M. Chaouch', telephone: '0554 67 89 01', notes: '' },
  { numero: 17, etage: '5', nom_resident: 'Famille Rahmani', telephone: '0666 78 90 12', notes: '' },
  { numero: 18, etage: '5', nom_resident: 'Mme. Allouache', telephone: '0775 89 01 23', notes: '' },
  // 6ème Étage
  { numero: 19, etage: '6', nom_resident: 'M. Ouali', telephone: '0556 90 12 34', notes: '' },
  { numero: 20, etage: '6', nom_resident: 'Famille Ait-Ahmed', telephone: '0667 01 23 45', notes: '' },
  { numero: 21, etage: '6', nom_resident: 'M. Mebarki', telephone: '0776 12 34 56', notes: '' },
  // 7ème Étage
  { numero: 22, etage: '7', nom_resident: 'Mme. Toumi', telephone: '0557 23 45 67', notes: '' },
  { numero: 23, etage: '7', nom_resident: 'Famille Boudiaf', telephone: '0668 34 56 78', notes: '' },
  { numero: 24, etage: '7', nom_resident: 'M. Brahimi', telephone: '0777 45 67 89', notes: '' },
];

async function main() {
  console.log('🌱 Début du peuplement de la base de données (Database Seed)...');

  // 1. Seed or update Admin 'aymen' (requested: nom utilisateur 'aymen', mdp 'aymen31')
  const aymenPassword = process.env.USER_AYMEN_PASSWORD || 'aymen31';
  const aymenHashedPassword = await bcrypt.hash(aymenPassword, 12);

  const userAymen = await prisma.admin.upsert({
    where: { email: 'aymen@syndic.dz' },
    update: {
      username: 'aymen',
      mot_de_passe_hash: aymenHashedPassword,
      failed_attempts: 0,
      locked_until: null,
    },
    create: {
      username: 'aymen',
      email: 'aymen@syndic.dz',
      mot_de_passe_hash: aymenHashedPassword,
      two_factor_enabled: false,
    },
  });
  console.log(`👤 Compte administrateur prêt : aymen (username: ${userAymen.username}, mdp: aymen31)`);

  // Seed or update secondary Admin for test suite & backup
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@syndic.dz').toLowerCase().trim();
  const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminPassword2026!';
  const hashedPassword = await bcrypt.hash(rawPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      username: 'admin',
      mot_de_passe_hash: hashedPassword,
      failed_attempts: 0,
      locked_until: null,
    },
    create: {
      username: 'admin',
      email: adminEmail,
      mot_de_passe_hash: hashedPassword,
      two_factor_enabled: false,
    },
  });
  console.log(`👤 Compte administrateur prêt : ${admin.email}`);

  // 2. Seed 24 Apartments
  const createdApts = [];
  for (const apt of APARTMENTS_DATA) {
    const row = await prisma.appartement.upsert({
      where: { numero: apt.numero },
      update: {
        etage: apt.etage,
        nom_resident: apt.nom_resident,
        telephone: apt.telephone,
        notes: apt.notes,
      },
      create: {
        numero: apt.numero,
        etage: apt.etage,
        nom_resident: apt.nom_resident,
        telephone: apt.telephone,
        notes: apt.notes,
      },
    });
    createdApts.push(row);
  }
  console.log(`🏢 24 appartements créés / synchronisés (RDC à 7ème étage).`);

  // 3. Seed Cotisations for October 2026 (17 paid out of 24)
  const paidNumbersOct = [1, 2, 4, 5, 7, 8, 9, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23];
  for (const apt of createdApts) {
    const isPaid = paidNumbersOct.includes(apt.numero);
    await prisma.cotisation.upsert({
      where: {
        appartement_id_mois_annee: {
          appartement_id: apt.id,
          mois: 10,
          annee: 2026,
        },
      },
      update: {
        montant: 500,
        est_paye: isPaid,
        date_paiement: isPaid ? new Date('2026-10-04T10:00:00Z') : null,
      },
      create: {
        appartement_id: apt.id,
        mois: 10,
        annee: 2026,
        montant: 500,
        est_paye: isPaid,
        date_paiement: isPaid ? new Date('2026-10-04T10:00:00Z') : null,
      },
    });
  }

  // 4. Seed Cotisations for September 2026 (Past archive demo)
  for (const apt of createdApts) {
    const isPaid = apt.numero !== 12 && apt.numero !== 21;
    await prisma.cotisation.upsert({
      where: {
        appartement_id_mois_annee: {
          appartement_id: apt.id,
          mois: 9,
          annee: 2026,
        },
      },
      update: {
        montant: 500,
        est_paye: isPaid,
        date_paiement: isPaid ? new Date('2026-09-05T09:30:00Z') : null,
      },
      create: {
        appartement_id: apt.id,
        mois: 9,
        annee: 2026,
        montant: 500,
        est_paye: isPaid,
        date_paiement: isPaid ? new Date('2026-09-05T09:30:00Z') : null,
      },
    });
  }

  // 5. Seed Initial Expenses
  const existingExpenses = await prisma.depense.count();
  if (existingExpenses === 0) {
    await prisma.depense.createMany({
      data: [
        {
          titre: 'Femme de ménage (Octobre)',
          montant: 4000,
          date_depense: new Date('2026-10-04'),
          mois: 10,
          annee: 2026,
          categorie: 'Nettoyage',
        },
        {
          titre: 'Achat ampoules LED paliers',
          montant: 1500,
          date_depense: new Date('2026-10-06'),
          mois: 10,
          annee: 2026,
          categorie: 'Électricité',
        },
      ],
    });
  }

  console.log('✅ Base de données initialisée avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
