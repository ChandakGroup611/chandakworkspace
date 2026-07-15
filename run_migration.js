const { Client } = require("pg");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    const sql = fs.readFileSync("supabase/migrations/20260714000004_master_cities_management.sql", "utf8");
    await client.query(sql);

    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
