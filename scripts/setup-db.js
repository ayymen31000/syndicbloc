// scripts/setup-db.js - Automated DB Migration & Seeding for Production/Cloud
const { execSync } = require('child_process');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';

console.log('🔄 Initialisation et synchronisation de la base SQLite...');
try {
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });
  console.log('🌱 Peuplement des données initiales...');
  execSync('node prisma/seed.js', { stdio: 'inherit', env: process.env });
  console.log('✅ Base de données prête pour la production !');
} catch (err) {
  console.error('❌ Erreur lors de l\'initialisation de la base:', err);
  process.exit(1);
}
