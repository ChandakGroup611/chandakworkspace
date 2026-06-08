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
    const sql = fs.readFileSync('./supabase/migrations/20260608000000_production_latency_indexes.sql', 'utf8');

    console.log("Applying indexes... This may take a moment.");
    await client.query(sql);

    console.log("✅ Indexes successfully applied to production!");
  } catch (err) {
    console.error("❌ Failed to apply indexes:", err);
  } finally {
    await client.end();
  }
}

applyIndexes();
