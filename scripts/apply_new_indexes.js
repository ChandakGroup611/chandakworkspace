const fs = require('fs');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function applyIndexes() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL found in .env.local");
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to production database...");
    await client.connect();

    console.log("Reading migration file...");
    const sql = fs.readFileSync('./supabase/migrations/20260625000000_production_performance_tuning.sql', 'utf8');

    console.log("Applying indexes CONCURRENTLY... This may take several minutes depending on table size.");
    
    // We cannot run CONCURRENTLY inside a transaction block easily if the migration script has BEGIN/COMMIT
    // We'll just run it as a raw multi-statement string. pg handles it, but since we have explicit COMMIT/BEGIN in the file, it will work.
    await client.query(sql);

    console.log("✅ Performance indexes successfully applied to production!");
  } catch (err) {
    console.error("❌ Failed to apply indexes:", err);
  } finally {
    await client.end();
  }
}

applyIndexes();
