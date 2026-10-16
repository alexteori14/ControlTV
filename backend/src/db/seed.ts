import { db } from './index.js';

async function seed() {
  console.log('[Seed CLI] Initializing database and applying migrations/seeds...');
  await db.initialize();
  console.log('[Seed CLI] Seeding completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed CLI] Error:', err);
  process.exit(1);
});
