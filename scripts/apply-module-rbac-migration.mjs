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
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("Connecting to PostgreSQL database...");
  await client.connect();

  try {
    const migrationSql = fs.readFileSync("supabase/migrations/20261116170000_module_rbac_core.sql", "utf8");
    console.log("Applying migration 20261116170000_module_rbac_core.sql in transaction...");

    await client.query("BEGIN;");
    await client.query(migrationSql);
    await client.query("COMMIT;");
    console.log("Migration transaction COMMITTED successfully!");

    // Verification 1: Check module_roles
    const rolesRes = await client.query(`
      SELECT module_code, role_code, name, array_length(permissions, 1) as perm_count
      FROM public.module_roles
      ORDER BY module_code, role_code;
    `);
    console.log(`\nVerified module_roles (${rolesRes.rows.length} roles registered):`);
    console.table(rolesRes.rows);

    // Verification 2: Check user_module_access counts
    const accessRes = await client.query(`
      SELECT module_code, role_code, count(*) as user_count
      FROM public.user_module_access
      GROUP BY module_code, role_code
      ORDER BY module_code, role_code;
    `);
    console.log("\nVerified user_module_access breakdown:");
    console.table(accessRes.rows);

    // Verification 3: Total users covered
    const userCoverage = await client.query(`
      SELECT 
        (SELECT count(*) FROM public.user_master WHERE is_deleted = false) as active_users_in_master,
        (SELECT count(DISTINCT user_id) FROM public.user_module_access) as distinct_users_in_access,
        (SELECT count(*) FROM public.user_module_access) as total_entitlement_rows;
    `);
    console.log("\nUser Coverage Summary:");
    console.table(userCoverage.rows);

    // Verification 4: RLS status
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename IN ('module_roles', 'user_module_access');
    `);
    console.log("\nRow Level Security Status:");
    console.table(rlsRes.rows);

  } catch (err) {
    console.error("Migration failed! Rolling back...", err);
    await client.query("ROLLBACK;").catch(() => {});
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
