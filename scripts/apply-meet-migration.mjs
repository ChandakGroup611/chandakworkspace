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
  console.log("Connecting to database to apply Chandak Meet Core Engine migration...");
  await client.connect();

  try {
    const sql = fs.readFileSync("supabase/migrations/20261025140000_chandak_meet_core_engine.sql", "utf8");
    console.log("Executing 20261025140000_chandak_meet_core_engine.sql in transaction...");
    
    await client.query("BEGIN;");
    await client.query(sql);
    await client.query("COMMIT;");
    
    console.log("Migration executed successfully!");

    // Verify tables and RLS status
    const res = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE 'meet_%'
      ORDER BY tablename;
    `);

    console.log("\nVerified Chandak Meet Tables in Database:");
    console.table(res.rows);

    const rlsCheck = res.rows.every(r => r.rowsecurity === true);
    if (rlsCheck && res.rows.length >= 20) {
      console.log(`\nSUCCESS: All ${res.rows.length} Meet tables exist and have Row Level Security (RLS) ENABLED.`);
    } else {
      console.warn("WARNING: Some tables may not have RLS enabled or count is unexpected:", res.rows.length);
    }
  } catch (err) {
    console.error("Migration failed, rolling back transaction:", err);
    await client.query("ROLLBACK;").catch(() => {});
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
