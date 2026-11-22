import { supabaseAdmin } from "../../lib/supabase/service_role";
import { getModuleManifest } from "../../lib/modules/registry.generated";

/**
 * Pre-Migration Dry-Run Diff Gate: Chandak Meet Pilot (PARTICIPANT -> STANDARD)
 * Governance: Master Architecture Blueprint v2.0 (TC-MIG-01)
 *
 * Verifies that:
 * 1. Every user in CHANDAK_MEET has their effective permissions computed under current role.
 * 2. Every user's effective permissions are recomputed under migrated STANDARD role.
 * 3. Before vs after permission sets are strictly identical.
 * 4. Zero users lose access, zero unintended privilege escalation.
 */

async function runMeetMigrationDryRun() {
  console.log("================================================================================");
  console.log("PRE-MIGRATION DRY-RUN DIFF GATE: CHANDAK MEET (PARTICIPANT -> STANDARD)");
  console.log("================================================================================\n");

  const manifest = getModuleManifest("CHANDAK_MEET");
  if (!manifest) {
    console.error("FATAL: CHANDAK_MEET manifest not found in generated registry.");
    process.exit(1);
  }

  // 1. Fetch current module roles from database
  const { data: dbRoles, error: rolesError } = await supabaseAdmin
    .from("module_roles")
    .select("role_code, name, permissions")
    .eq("module_code", "CHANDAK_MEET");

  if (rolesError || !dbRoles) {
    console.error("FATAL: Failed to fetch module_roles:", rolesError);
    process.exit(1);
  }

  const roleMap = new Map<string, string[]>();
  dbRoles.forEach((r) => roleMap.set(r.role_code, r.permissions || []));

  // The candidate STANDARD policy from manifest defaultPolicies
  const standardCandidatePerms = manifest.defaultPolicies.STANDARD || [];
  console.log(`[Dry-Run] Candidate STANDARD role policy (${standardCandidatePerms.length} perms):`);
  console.log(`          ${standardCandidatePerms.join(", ")}\n`);

  // 2. Fetch all users currently assigned to CHANDAK_MEET
  const { data: userAccess, error: accessError } = await supabaseAdmin
    .from("user_module_access")
    .select(`
      user_id,
      role_code,
      scope,
      user_master:user_master!user_module_access_user_id_fkey(
        id,
        email,
        full_name,
        is_active,
        is_deleted
      )
    `)
    .eq("module_code", "CHANDAK_MEET");

  if (accessError || !userAccess) {
    console.error("FATAL: Failed to fetch user_module_access:", accessError);
    process.exit(1);
  }

  console.log(`[Dry-Run] Found ${userAccess.length} active users assigned to CHANDAK_MEET.`);

  let diffViolations = 0;
  let participantCount = 0;
  let organiserCount = 0;
  let adminCount = 0;

  console.log("\nAuditing user-by-user permission diff:\n");
  console.log(
    "User".padEnd(25) +
      "Current Role".padEnd(16) +
      "Target Role".padEnd(16) +
      "Status".padEnd(10) +
      "Details"
  );
  console.log("-".repeat(85));

  for (const row of userAccess) {
    const user = Array.isArray(row.user_master) ? row.user_master[0] : row.user_master;
    const userName = (user?.full_name || user?.email || row.user_id).slice(0, 23);
    const currentRole = row.role_code;

    // Current permissions
    const currentPerms = roleMap.get(currentRole) || [];

    // Target role & target permissions
    let targetRole = currentRole;
    let targetPerms = currentPerms;

    if (currentRole === "PARTICIPANT") {
      participantCount++;
      targetRole = "STANDARD";
      targetPerms = standardCandidatePerms;
    } else if (currentRole === "ORGANISER") {
      organiserCount++;
    } else if (currentRole === "MEET_ADMIN") {
      adminCount++;
    }

    // Compare sets
    const curSorted = [...currentPerms].sort();
    const tarSorted = [...targetPerms].sort();
    const isIdentical =
      curSorted.length === tarSorted.length &&
      curSorted.every((val, idx) => val === tarSorted[idx]);

    if (!isIdentical) {
      diffViolations++;
      const lost = curSorted.filter((p) => !tarSorted.includes(p));
      const gained = tarSorted.filter((p) => !curSorted.includes(p));
      console.log(
        userName.padEnd(25) +
          currentRole.padEnd(16) +
          targetRole.padEnd(16) +
          "DIFF-FAIL".padEnd(10) +
          `Lost: [${lost.join(",")}], Gained: [${gained.join(",")}]`
      );
    } else {
      console.log(
        userName.padEnd(25) +
          currentRole.padEnd(16) +
          targetRole.padEnd(16) +
          "MATCH-OK".padEnd(10) +
          `Exact ${curSorted.length} perms preserved`
      );
    }
  }

  console.log("-".repeat(85));
  console.log(`\nSummary:`);
  console.log(`- Total users evaluated: ${userAccess.length}`);
  console.log(`  * PARTICIPANT -> STANDARD: ${participantCount}`);
  console.log(`  * ORGANISER:               ${organiserCount}`);
  console.log(`  * MEET_ADMIN:              ${adminCount}`);
  console.log(`- Diff violations:         ${diffViolations}`);

  if (diffViolations > 0) {
    console.error(`\n❌ [Dry-Run Diff Gate FAILED]: ${diffViolations} permission deviations detected.`);
    process.exit(1);
  }

  console.log(`\n✅ [Dry-Run Diff Gate PASSED]: 100% permission preservation verified. Zero access loss.`);
  console.log("Safe to proceed with migration execution.\n");
}

runMeetMigrationDryRun().catch((err) => {
  console.error("Dry run execution failed:", err);
  process.exit(1);
});
