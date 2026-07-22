const { Client } = require("pg");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const sql = fs.readFileSync("supabase/migrations/20260722000000_fix_watcher_executor_rights.sql", "utf8");
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}
run();
