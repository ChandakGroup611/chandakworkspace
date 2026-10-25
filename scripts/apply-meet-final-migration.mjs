import fs from "fs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Client } = pg;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log("Connecting to database to apply Chandak Meet Final Extension migration...");
  await client.connect();

  try {
    const sql = fs.readFileSync("supabase/migrations/20261026010000_chandak_meet_final_extension.sql", "utf8");
    console.log("Executing 20261026010000_chandak_meet_final_extension.sql in transaction...");
    
    await client.query("BEGIN;");
    await client.query(sql);
    await client.query("COMMIT;");
    
    console.log("Migration executed successfully!");

    // Verify newly added tables
    const res = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND (tablename LIKE 'meet_%' OR tablename LIKE 'core_%')
      ORDER BY tablename;
    `);

    console.log("\nVerified Meet & Core Extension Tables in Database:");
    console.table(res.rows);
  } catch (err) {
    console.error("Migration failed, rolling back transaction:", err);
    await client.query("ROLLBACK;").catch(() => {});
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
