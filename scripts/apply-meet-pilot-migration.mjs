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
    console.log("Beginning migration transaction...");
    await client.query("BEGIN;");

    // Phase 0 migration (if not yet run)
    const phase0Sql = fs.readFileSync(
      "supabase/migrations/20261122130000_module_rbac_sync_foundation.sql",
      "utf8"
    );
    console.log("Executing Phase 0 migration (Foundation & Audit)...");
    await client.query(phase0Sql);

    // Phase 4 migration
    const phase4Sql = fs.readFileSync(
      "supabase/migrations/20261122140000_meet_pilot_standard_role.sql",
      "utf8"
    );
    console.log("Executing Phase 4 migration (Meet STANDARD Role & Migration)...");
    await client.query(phase4Sql);

    await client.query("COMMIT;");
    console.log("Migration transaction COMMITTED successfully!\n");

    // Verification 1: Roles for CHANDAK_MEET
    const rolesRes = await client.query(`
      SELECT module_code, role_code, name, array_length(permissions, 1) as perm_count, is_system, policy_version
      FROM public.module_roles
      WHERE module_code = 'CHANDAK_MEET'
      ORDER BY role_code;
    `);
    console.log("Verified CHANDAK_MEET module_roles:");
    console.table(rolesRes.rows);

    // Verification 2: User breakdown for CHANDAK_MEET
    const accessRes = await client.query(`
      SELECT module_code, role_code, count(*) as user_count
      FROM public.user_module_access
      WHERE module_code = 'CHANDAK_MEET'
      GROUP BY module_code, role_code
      ORDER BY role_code;
    `);
    console.log("\nVerified CHANDAK_MEET user_module_access breakdown:");
    console.table(accessRes.rows);

    // Verification 3: Audit log
    const auditRes = await client.query(`
      SELECT module_code, new_version, modified_roles, sync_status, executed_by, executed_at
      FROM public.rbac_sync_audit_logs
      ORDER BY executed_at DESC
      LIMIT 3;
    `);
    console.log("\nLatest rbac_sync_audit_logs:");
    console.table(auditRes.rows);

  } catch (err) {
    console.error("Migration failed! Rolling back...", err);
    await client.query("ROLLBACK;").catch(() => {});
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
