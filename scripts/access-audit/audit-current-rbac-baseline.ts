/**
 * Phase 2: Current-State RBAC Baseline Auditor
 * 
 * Objectives:
 * 1. Audit active users in user_master and user_roles.
 * 2. Audit current module role distribution in user_module_access.
 * 3. Inspect Chandak Meet (Pilot Module) users and roles for pre-migration baseline.
 * 4. Record baseline metrics without mutating any live records.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBaselineAudit() {
  console.log("\n================================================================");
  console.log("PHASE 2: CURRENT-STATE RBAC BASELINE AUDIT");
  console.log("================================================================\n");

  // 1. Audit user_master total & active
  const { count: totalUsers, error: userErr } = await supabase
    .from("user_master")
    .select("id", { count: "exact", head: true });

  const { count: activeUsers } = await supabase
    .from("user_master")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("is_deleted", false);

  console.log(`1. User Account Baseline:`);
  console.log(`   - Total user_master records: ${totalUsers}`);
  console.log(`   - Active non-deleted users:   ${activeUsers}`);

  // 2. Audit global roles in user_roles and user_master
  const { data: globalRoles } = await supabase
    .from("roles")
    .select("id, code, name");

  const { data: userMasterRoles } = await supabase
    .from("user_master")
    .select("role_id, roles(code)")
    .eq("is_deleted", false);

  const roleCounts: Record<string, number> = {};
  for (const u of userMasterRoles || []) {
    const code = (u.roles as any)?.code || "NO_ROLE";
    roleCounts[code] = (roleCounts[code] || 0) + 1;
  }

  console.log(`\n2. Global Platform Role Distribution:`);
  for (const [code, count] of Object.entries(roleCounts)) {
    console.log(`   - ${code.padEnd(20)}: ${count} users`);
  }

  // 3. Audit module_roles table definitions
  const { data: moduleRoleDefs } = await supabase
    .from("module_roles")
    .select("module_code, role_code, name, permissions");

  console.log(`\n3. Database Module Role Definitions:`);
  const modDefsGrouped: Record<string, string[]> = {};
  for (const row of moduleRoleDefs || []) {
    if (!modDefsGrouped[row.module_code]) modDefsGrouped[row.module_code] = [];
    modDefsGrouped[row.module_code].push(row.role_code);
  }
  for (const [mod, roles] of Object.entries(modDefsGrouped)) {
    console.log(`   - ${mod.padEnd(20)}: [${roles.join(", ")}]`);
  }

  // 4. Audit user_module_access active assignments
  const { data: umaData, error: umaErr } = await supabase
    .from("user_module_access")
    .select("user_id, module_code, role_code, scope, is_default, dashboard_key");

  if (umaErr) {
    console.error("Error reading user_module_access:", umaErr);
    return;
  }

  const moduleAssignmentCounts: Record<string, number> = {};
  const moduleRoleCounts: Record<string, Record<string, number>> = {};
  const scopeTypeCounts: Record<string, Record<string, number>> = {};

  for (const row of umaData || []) {
    const mod = row.module_code;
    moduleAssignmentCounts[mod] = (moduleAssignmentCounts[mod] || 0) + 1;

    if (!moduleRoleCounts[mod]) moduleRoleCounts[mod] = {};
    moduleRoleCounts[mod][row.role_code] = (moduleRoleCounts[mod][row.role_code] || 0) + 1;

    const sType = (row.scope as any)?.type || "unknown";
    if (!scopeTypeCounts[mod]) scopeTypeCounts[mod] = {};
    scopeTypeCounts[mod][sType] = (scopeTypeCounts[mod][sType] || 0) + 1;
  }

  console.log(`\n4. Active User Module Entitlements:`);
  for (const [mod, count] of Object.entries(moduleAssignmentCounts)) {
    console.log(`   - ${mod.padEnd(20)}: ${count} assignments`);
    for (const [rCode, rCount] of Object.entries(moduleRoleCounts[mod] || {})) {
      console.log(`       Role: ${rCode.padEnd(16)} = ${rCount} users`);
    }
    for (const [sType, sCount] of Object.entries(scopeTypeCounts[mod] || {})) {
      console.log(`       Scope: ${sType.padEnd(15)} = ${sCount}`);
    }
  }

  // 5. In-depth inspection of CHANDAK_MEET (Pilot Module)
  console.log(`\n5. Pilot Module Baseline: CHANDAK_MEET`);
  const meetUsers = (umaData || []).filter(r => r.module_code === "CHANDAK_MEET");
  console.log(`   - Total Meet assigned users: ${meetUsers.length}`);
  const meetRoles = moduleRoleCounts["CHANDAK_MEET"] || {};
  for (const [role, count] of Object.entries(meetRoles)) {
    console.log(`       ${role.padEnd(16)}: ${count} users`);
  }

  // Check if literal STANDARD already exists in CHANDAK_MEET
  const hasStandardInMeet = (moduleRoleDefs || []).some(
    r => r.module_code === "CHANDAK_MEET" && r.role_code === "STANDARD"
  );
  console.log(`   - Literal 'STANDARD' role in DB for CHANDAK_MEET: ${hasStandardInMeet ? "YES" : "NO (Currently using PARTICIPANT)"}`);

  console.log("\n================================================================");
  console.log("BASELINE RECORDING COMPLETE — ZERO DATA MUTATIONS");
  console.log("================================================================\n");
}

runBaselineAudit().catch(err => {
  console.error("Baseline audit failed:", err);
  process.exit(1);
});
