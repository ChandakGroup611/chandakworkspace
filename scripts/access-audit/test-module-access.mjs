import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";
import { can, getModuleRole, getAllUserModuleRoles, invalidateModuleAccessCache, requireModulePermission } from "../../lib/permissions/module-access.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  console.log("=== Testing Chandak Workspace Module-Wise RBAC Engine ===");

  // 1. Fetch test users from live database
  const { data: superAdmin } = await supabase
    .from("user_master")
    .select("id, full_name, email")
    .eq("email", "anand@chandakgroup.com")
    .single();

  const { data: memberUser } = await supabase
    .from("user_master")
    .select("id, full_name, email")
    .eq("email", "anand.bhowad@chandakgroup.com")
    .single();

  const { data: fleetUser } = await supabase
    .from("user_master")
    .select("id, full_name, email")
    .eq("email", "sagar.mohta@chandakgroup.com")
    .single();

  assert(superAdmin, "Super Admin user not found");
  assert(memberUser, "Member user not found");
  assert(fleetUser, "Fleet user not found");

  console.log("Found test users:");
  console.log(`  Super Admin: ${superAdmin.full_name} (${superAdmin.email})`);
  console.log(`  Member User: ${memberUser.full_name} (${memberUser.email})`);
  console.log(`  Fleet Lead:  ${fleetUser.full_name} (${fleetUser.email})`);

  // Clear cache initially
  invalidateModuleAccessCache();

  // Test 1: Super Admin Global Override
  console.log("\n[Test 1] Super Admin Global Override");
  const saTaskAllowed = await can(superAdmin.id, "TASK_WORKFLOW", "WORKSPACES_DELETE");
  assert.strictEqual(saTaskAllowed, true, "Super Admin should have WORKSPACES_DELETE");

  const saArbitraryAllowed = await can(superAdmin.id, "VEHICLE_DESK", "VEHICLES_DECOMMISSION");
  assert.strictEqual(saArbitraryAllowed, true, "Super Admin should have VEHICLES_DECOMMISSION");

  const saBudgetManage = await can(superAdmin.id, "ORG_BUDGET", "BUDGET_APPROVE");
  assert.strictEqual(saBudgetManage, true, "Super Admin should have BUDGET_APPROVE");
  console.log("  ✅ Super Admin has global override across all modules and actions");

  // Test 2: Standard Member in TASK_WORKFLOW
  console.log("\n[Test 2] Standard Member in TASK_WORKFLOW");
  const memberTaskCreate = await can(memberUser.id, "TASK_WORKFLOW", "TASKS_CREATE");
  assert.strictEqual(memberTaskCreate, true, "Member should be allowed to create tasks");

  const memberTaskComment = await can(memberUser.id, "TASK_WORKFLOW", "TASKS_COMMENT");
  assert.strictEqual(memberTaskComment, true, "Member should be allowed to comment on tasks");

  const memberWorkspaceDelete = await can(memberUser.id, "TASK_WORKFLOW", "WORKSPACES_DELETE");
  assert.strictEqual(memberWorkspaceDelete, false, "Member must NOT be allowed to delete workspaces");

  const memberSlaConfig = await can(memberUser.id, "TASK_WORKFLOW", "SLA_CONFIG");
  assert.strictEqual(memberSlaConfig, false, "Member must NOT be allowed to configure SLA");
  console.log("  ✅ Task member permissions strictly enforced (TASKS_CREATE allowed, WORKSPACES_DELETE blocked)");

  // Test 3: Fleet Lead in VEHICLE_DESK
  console.log("\n[Test 3] Operational Lead in VEHICLE_DESK");
  const fleetDispatch = await can(fleetUser.id, "VEHICLE_DESK", "TRIPS_DISPATCH");
  assert.strictEqual(fleetDispatch, true, "Fleet lead should be allowed to dispatch trips");

  const fleetDecommission = await can(fleetUser.id, "VEHICLE_DESK", "VEHICLES_DECOMMISSION");
  assert.strictEqual(fleetDecommission, false, "Fleet lead must NOT be allowed to decommission vehicles");

  const fleetSettings = await can(fleetUser.id, "VEHICLE_DESK", "FLEET_SETTINGS");
  assert.strictEqual(fleetSettings, false, "Fleet lead must NOT be allowed to manage fleet settings");
  console.log("  ✅ Fleet lead permissions strictly enforced (TRIPS_DISPATCH allowed, VEHICLES_DECOMMISSION blocked)");

  // Test 4: getModuleRole
  console.log("\n[Test 4] getModuleRole");
  const memberRole = await getModuleRole(memberUser.id, "TASK_WORKFLOW");
  assert(memberRole, "Member role should exist");
  assert.strictEqual(memberRole.role_code, "MEMBER", "Role code should be MEMBER");
  assert(memberRole.permissions.includes("TASKS_CREATE"), "Role should include TASKS_CREATE");
  assert.strictEqual(memberRole.permissions.includes("WORKSPACES_DELETE"), false, "Role should NOT include WORKSPACES_DELETE");
  console.log(`  ✅ getModuleRole retrieved: ${memberRole.role_name} (${memberRole.permissions.length} perms)`);

  // Test 5: getAllUserModuleRoles
  console.log("\n[Test 5] getAllUserModuleRoles");
  const allRoles = await getAllUserModuleRoles(memberUser.id);
  assert(allRoles.length >= 1, "User should have at least 1 module role");
  console.log(`  ✅ getAllUserModuleRoles returned ${allRoles.length} module roles for user`);

  // Test 6: requireModulePermission assertion
  console.log("\n[Test 6] requireModulePermission assertion");
  let errorThrown = false;
  try {
    await requireModulePermission(memberUser.id, "TASK_WORKFLOW", "WORKSPACES_DELETE");
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes("Unauthorized"), "Error message should mention Unauthorized");
  }
  assert.strictEqual(errorThrown, true, "requireModulePermission must throw on unauthorized action");
  console.log("  ✅ requireModulePermission threw expected Unauthorized error");

  // Test 7: Invalid, deleted, and empty inputs
  console.log("\n[Test 7] Invalid, deleted, and empty inputs");
  const emptyUser = await can("", "TASK_WORKFLOW", "TASKS_CREATE");
  assert.strictEqual(emptyUser, false, "Empty user must return false");

  const deletedUser = await can("00000000-0000-0000-0000-000000000000", "TASK_WORKFLOW", "TASKS_CREATE");
  assert.strictEqual(deletedUser, false, "Deleted user must return false");

  const nonExistentUser = await can("ffffffff-ffff-ffff-ffff-ffffffffffff", "TASK_WORKFLOW", "TASKS_CREATE");
  assert.strictEqual(nonExistentUser, false, "Non-existent user must return false");
  console.log("  ✅ Empty, deleted, and non-existent users safely return false without crashing");

  // Test 8: Scope evaluation with simulated scoped access
  console.log("\n[Test 8] Record-level scope evaluation");
  // Temporarily set a scoped entitlement in user_module_access for testing
  const testScopedUserId = memberUser.id;
  await supabase
    .from("user_module_access")
    .update({
      scope: {
        type: "projects",
        project_ids: ["PRJ-101", "PRJ-102"]
      }
    })
    .eq("user_id", testScopedUserId)
    .eq("module_code", "TASK_WORKFLOW");

  invalidateModuleAccessCache(testScopedUserId);

  const allowedProject = await can(testScopedUserId, "TASK_WORKFLOW", "TASKS_CREATE", { project_id: "PRJ-101" });
  assert.strictEqual(allowedProject, true, "In-scope project must be permitted");

  const blockedProject = await can(testScopedUserId, "TASK_WORKFLOW", "TASKS_CREATE", { project_id: "PRJ-999" });
  assert.strictEqual(blockedProject, false, "Out-of-scope project must be blocked");

  // Restore scope to {"type": "all"}
  await supabase
    .from("user_module_access")
    .update({ scope: { type: "all" } })
    .eq("user_id", testScopedUserId)
    .eq("module_code", "TASK_WORKFLOW");
  invalidateModuleAccessCache(testScopedUserId);

  console.log("  ✅ Scoped permission gating verified (in-scope allowed, out-of-scope blocked, restored cleanly)");

  console.log("\nALL 8 TESTS PASSED WITH 100% SUCCESS!\n");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
