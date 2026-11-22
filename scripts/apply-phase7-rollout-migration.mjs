import fs from "fs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Client } = pg;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("Missing DATABASE_URL in environment");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Connecting to PostgreSQL database...");
  await client.connect();

  try {
    console.log("Beginning migration transaction for Phase 7 rollout...");
    await client.query("BEGIN;");

    const sql = fs.readFileSync(
      "supabase/migrations/20261122150000_rollout_standard_roles.sql",
      "utf8"
    );
    await client.query(sql);

    await client.query("COMMIT;");
    console.log("Migration transaction COMMITTED successfully!\n");

    // Verification 1: Roles across all modules
    const rolesRes = await client.query(`
      SELECT module_code, role_code, name, array_length(permissions, 1) as perm_count, is_system
      FROM public.module_roles
      WHERE role_code = 'STANDARD'
      ORDER BY module_code;
    `);
    console.log("Verified STANDARD roles in module_roles across all modules:");
    console.table(rolesRes.rows);

    // Verification 2: Active user assignments by module and role
    const accessRes = await client.query(`
      SELECT module_code, role_code, count(*) as user_count
      FROM public.user_module_access
      GROUP BY module_code, role_code
      ORDER BY module_code, role_code;
    `);
    console.log("\nVerified user_module_access breakdown:");
    console.table(accessRes.rows);

  } catch (err) {
    console.error("Migration failed! Rolling back...", err);
    await client.query("ROLLBACK;").catch(() => {});
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
