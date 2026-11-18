/**
 * UAT Test Users & Test Entities Seed Script
 * 
 * Target: UAT / Test Database Only — Never modifies production records.
 * Idempotent: Re-runnable without duplicates.
 * Tags: Every record is explicitly tagged with [TEST-UAT] or test_seed metadata.
 * 
 * Usage: npx tsx scripts/seed-test-users.ts
 */

import { createClient } from "@supabase/supabase-js";

// =========================================================================
// STRICT ENVIRONMENT & SECURITY GUARD (A.2)
// Refuse to run unless TEST_SUPABASE_URL is set AND differs from production.
// Refuse if BASE_URL / STAGING_URL points to chandakgroup.tech.
// Require TEST_USER_PASSWORD with no fallback default.
// =========================================================================

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const TEST_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;
const PROD_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const TARGET_PORTAL = (process.env.STAGING_URL || process.env.BASE_URL || "").trim();

if (!TEST_PASSWORD || TEST_PASSWORD.trim() === "") {
  console.error("FATAL SECURITY GUARD: TEST_USER_PASSWORD environment variable is required. Default passwords strictly forbidden.");
  process.exit(1);
}

if (!TEST_SUPABASE_URL || TEST_SUPABASE_URL.trim() === "" || !TEST_SERVICE_ROLE_KEY || TEST_SERVICE_ROLE_KEY.trim() === "") {
  console.error("FATAL SECURITY GUARD: TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY are mandatory. Refusing to run on ambient database.");
  process.exit(1);
}

try {
  const testHost = new URL(TEST_SUPABASE_URL).host;
  const prodHost = PROD_SUPABASE_URL ? new URL(PROD_SUPABASE_URL).host : "";
  if (testHost === prodHost || testHost.includes("tkovzymkubxtpcgynkgd")) {
    console.error(`FATAL SECURITY GUARD: TEST_SUPABASE_URL (${testHost}) matches production database! Refusing execution.`);
    process.exit(1);
  }
} catch (e: any) {
  console.error("FATAL SECURITY GUARD: Malformed TEST_SUPABASE_URL:", e.message);
  process.exit(1);
}

if (TARGET_PORTAL.includes("chandakgroup.tech")) {
  console.error("FATAL SECURITY GUARD: BASE_URL/STAGING_URL points to production domain 'chandakgroup.tech'! Execution blocked.");
  process.exit(1);
}

const supabaseAdmin = createClient(TEST_SUPABASE_URL, TEST_SERVICE_ROLE_KEY.trim(), {
  auth: { persistSession: false }
});

// Pre-defined role IDs from database
const ROLES = {
  SUPER_ADMIN: "cd5be727-8785-482e-855e-b8494b51d93b",
  ROLE_ADMIN: "b6de054e-f665-4ef0-864c-2fe89c0305ca",
  ROLE_MANAGER: "2ea22556-db27-41db-b452-d8ee00e20595",
  ROLE_STAFF: "041db45d-f399-4db8-adab-01bd20fcd87c",
  ROLE_AGENT: "c940b6ee-d774-4ccd-aa8e-06e40135e69c",
  ROLE_DASHBOARD: "04058095-909d-4985-8f5d-3e008faeb037",
  ROLE_WORKSPACE: "44455a3d-6c04-4efa-bf1a-88d1ea53724d"
};

interface SeedUserSpec {
  email: string;
  name: string;
  userCode: string;
  globalRoleId: string;
  modules: string[];
  designRole?: string;
  fleetRole?: string;
  budgetRoleId?: number;
  dashboards?: string[];
  projectScope?: string[];
}

const TEST_USERS: SeedUserSpec[] = [
  // Super Admin
  {
    email: "test.superadmin@chandakgroup.tech",
    name: "[TEST-UAT] Super Administrator",
    userCode: "USR-TEST-SUPER",
    globalRoleId: ROLES.SUPER_ADMIN,
    modules: ["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING", "DASHBOARDS", "CHANDAK_MEET", "ORG_BUDGET", "CHANDAK_MESSENGER"],
    designRole: "DESIGN_ADMIN",
    fleetRole: "FLEET_ADMIN",
    budgetRoleId: 1,
    dashboards: ["it", "mkt", "adm", "engg"]
  },

  // 1. Workspace / Tasks Users
  {
    email: "test.task.standard@chandakgroup.tech",
    name: "[TEST-UAT] Task Standard Member",
    userCode: "USR-TEST-TSK-STD",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.task.manager@chandakgroup.tech",
    name: "[TEST-UAT] Task Workspace Manager",
    userCode: "USR-TEST-TSK-MGR",
    globalRoleId: ROLES.ROLE_MANAGER,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.task.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Task No-Access User",
    userCode: "USR-TEST-TSK-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["VEHICLE_DESK"] // Access to Vehicle, zero access to Task
  },

  // 2. Tickets Users
  {
    email: "test.ticket.standard@chandakgroup.tech",
    name: "[TEST-UAT] Ticket Standard Requester",
    userCode: "USR-TEST-TCK-STD",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.ticket.lead@chandakgroup.tech",
    name: "[TEST-UAT] Ticket Support Lead",
    userCode: "USR-TEST-TCK-LEAD",
    globalRoleId: ROLES.ROLE_MANAGER,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.ticket.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Ticket No-Access User",
    userCode: "USR-TEST-TCK-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["DESIGN_TRACKING"] // Access to Design, zero access to Tickets
  },

  // 3. Requirements Users
  {
    email: "test.req.standard@chandakgroup.tech",
    name: "[TEST-UAT] Requirements Author",
    userCode: "USR-TEST-REQ-STD",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.req.lead@chandakgroup.tech",
    name: "[TEST-UAT] Requirements Approver Lead",
    userCode: "USR-TEST-REQ-LEAD",
    globalRoleId: ROLES.ROLE_MANAGER,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.req.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Requirements No-Access User",
    userCode: "USR-TEST-REQ-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["VEHICLE_DESK"]
  },

  // 4. Design Tracking & DMS Users
  {
    email: "test.design.viewer@chandakgroup.tech",
    name: "[TEST-UAT] Design Standard Viewer",
    userCode: "USR-TEST-DSG-VIEW",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["DESIGN_TRACKING"],
    designRole: "VIEWER",
    projectScope: ["PRJ-TEST-ALPHA"]
  },
  {
    email: "test.design.lead@chandakgroup.tech",
    name: "[TEST-UAT] Design Lead",
    userCode: "USR-TEST-DSG-LEAD",
    globalRoleId: ROLES.ROLE_MANAGER,
    modules: ["DESIGN_TRACKING"],
    designRole: "DESIGN_LEAD",
    projectScope: ["PRJ-TEST-ALPHA"]
  },
  {
    email: "test.design.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Design No-Access User",
    userCode: "USR-TEST-DSG-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["ORG_BUDGET"]
  },

  // 5. Vehicle Desk Users
  {
    email: "test.vehicle.traveler@chandakgroup.tech",
    name: "[TEST-UAT] Vehicle Traveler",
    userCode: "USR-TEST-VEH-TRV",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["VEHICLE_DESK"],
    fleetRole: "TRAVELER"
  },
  {
    email: "test.vehicle.admin@chandakgroup.tech",
    name: "[TEST-UAT] Vehicle Fleet Admin",
    userCode: "USR-TEST-VEH-ADM",
    globalRoleId: ROLES.ROLE_ADMIN,
    modules: ["VEHICLE_DESK"],
    fleetRole: "FLEET_ADMIN"
  },
  {
    email: "test.vehicle.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Vehicle No-Access User",
    userCode: "USR-TEST-VEH-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["TASK_WORKFLOW"]
  },

  // 6. Chandak Meet Users
  {
    email: "test.meet.attendee@chandakgroup.tech",
    name: "[TEST-UAT] Meet Attendee",
    userCode: "USR-TEST-MET-ATT",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["CHANDAK_MEET"]
  },
  {
    email: "test.meet.organizer@chandakgroup.tech",
    name: "[TEST-UAT] Meet Organizer",
    userCode: "USR-TEST-MET-ORG",
    globalRoleId: ROLES.ROLE_MANAGER,
    modules: ["CHANDAK_MEET"]
  },
  {
    email: "test.meet.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Meet No-Access User",
    userCode: "USR-TEST-MET-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["TASK_WORKFLOW"]
  },

  // 7. Organization Budget Users
  {
    email: "test.budget.viewer@chandakgroup.tech",
    name: "[TEST-UAT] Budget Viewer",
    userCode: "USR-TEST-BDG-VIEW",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["ORG_BUDGET"],
    budgetRoleId: 4
  },
  {
    email: "test.budget.admin@chandakgroup.tech",
    name: "[TEST-UAT] Budget Admin",
    userCode: "USR-TEST-BDG-ADM",
    globalRoleId: ROLES.ROLE_ADMIN,
    modules: ["ORG_BUDGET"],
    budgetRoleId: 1
  },
  {
    email: "test.budget.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Budget No-Access User",
    userCode: "USR-TEST-BDG-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["DESIGN_TRACKING"]
  },

  // 8. Software AMC Users
  {
    email: "test.amc.standard@chandakgroup.tech",
    name: "[TEST-UAT] AMC Standard Staff",
    userCode: "USR-TEST-AMC-STD",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.amc.admin@chandakgroup.tech",
    name: "[TEST-UAT] AMC Administrator",
    userCode: "USR-TEST-AMC-ADM",
    globalRoleId: ROLES.ROLE_ADMIN,
    modules: ["TASK_WORKFLOW"]
  },
  {
    email: "test.amc.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] AMC No-Access User",
    userCode: "USR-TEST-AMC-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["VEHICLE_DESK"]
  },

  // 9. Executive Dashboards Users
  {
    email: "test.dash.viewer@chandakgroup.tech",
    name: "[TEST-UAT] Dashboard Viewer (IT Only)",
    userCode: "USR-TEST-DSH-IT",
    globalRoleId: ROLES.ROLE_DASHBOARD,
    modules: ["DASHBOARDS"],
    dashboards: ["it"]
  },
  {
    email: "test.dash.multi@chandakgroup.tech",
    name: "[TEST-UAT] Dashboard Lead (IT + Engg)",
    userCode: "USR-TEST-DSH-MLT",
    globalRoleId: ROLES.ROLE_DASHBOARD,
    modules: ["DASHBOARDS"],
    dashboards: ["it", "engg"]
  },
  {
    email: "test.dash.noaccess@chandakgroup.tech",
    name: "[TEST-UAT] Dashboard No-Access User",
    userCode: "USR-TEST-DSH-NONE",
    globalRoleId: ROLES.ROLE_AGENT,
    modules: ["TASK_WORKFLOW"],
    dashboards: []
  }
];

// Helper: Ensure or create user in Supabase Auth and user_master
async function upsertUser(spec: SeedUserSpec): Promise<string> {
  // Check user_master first
  const { data: existingUm } = await supabaseAdmin
    .from("user_master")
    .select("id")
    .eq("email", spec.email)
    .maybeSingle();

  let userId: string;

  if (existingUm?.id) {
    userId = existingUm.id;
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: TEST_PASSWORD,
        user_metadata: { full_name: spec.name, is_test: true }
      });
    } catch {}
  } else {
    // Try to create in auth
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: spec.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: spec.name, is_test: true }
    });

    if (created?.user?.id) {
      userId = created.user.id;
    } else {
      // If already registered, fetch ID from user_master or generate deterministic fallback
      const { data: refetched } = await supabaseAdmin
        .from("user_master")
        .select("id")
        .eq("email", spec.email)
        .maybeSingle();

      if (refetched?.id) {
        userId = refetched.id;
      } else {
        throw new Error(`Failed to resolve auth user for ${spec.email}: ${createErr?.message}`);
      }
    }
  }

  // Upsert user_master
  const { error: umErr } = await supabaseAdmin.from("user_master").upsert({
    id: userId,
    email: spec.email,
    full_name: spec.name,
    user_code: spec.userCode,
    role_id: spec.globalRoleId,
    password_hash: "OAUTH_USER",
    is_active: true,
    is_deleted: false,
    updated_at: new Date().toISOString()
  }, { onConflict: "id" });

  if (umErr) {
    throw new Error(`Failed to upsert user_master for ${spec.email}: ${umErr.message}`);
  }

  // Upsert user_roles
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id: spec.globalRoleId });

  // Map module_master IDs
  const { data: allMods } = await supabaseAdmin.from("modules_master").select("id, code");
  const modMap = new Map((allMods || []).map(m => [m.code, m.id]));

  // Upsert user_modules
  await supabaseAdmin.from("user_modules").delete().eq("user_id", userId);
  const userModuleRows = spec.modules
    .filter(code => modMap.has(code))
    .map((code, idx) => ({
      user_id: userId,
      module_id: modMap.get(code)!,
      is_default: idx === 0
    }));

  if (userModuleRows.length > 0) {
    await supabaseAdmin.from("user_modules").insert(userModuleRows);
  }

  // Upsert user_module_access
  await supabaseAdmin.from("user_module_access").delete().eq("user_id", userId);
  const umaRows: any[] = [];
  for (const modCode of spec.modules) {
    let roleCode = "MEMBER";
    if (spec.globalRoleId === ROLES.SUPER_ADMIN || spec.globalRoleId === ROLES.ROLE_ADMIN) {
      roleCode = modCode === "TASK_WORKFLOW" ? "WORKSPACE_ADMIN" : "ADMIN";
    } else if (spec.globalRoleId === ROLES.ROLE_MANAGER) {
      roleCode = "MANAGER";
    }
    umaRows.push({
      user_id: userId,
      module_code: modCode,
      role_code: roleCode,
      scope: { type: "all" },
      is_default: umaRows.length === 0,
      granted_at: new Date().toISOString()
    });
  }

  if (spec.dashboards && spec.dashboards.length > 0) {
    for (const dKey of spec.dashboards) {
      umaRows.push({
        user_id: userId,
        module_code: "DASHBOARDS",
        role_code: "VIEWER",
        dashboard_key: dKey,
        scope: { type: "all" },
        is_default: false,
        granted_at: new Date().toISOString()
      });
    }
  }

  if (umaRows.length > 0) {
    await supabaseAdmin.from("user_module_access").insert(umaRows);
  }

  // Synchronize domain access tables
  if (spec.fleetRole) {
    await supabaseAdmin.from("fleet_user_access").upsert({
      user_id: userId,
      fleet_role: spec.fleetRole,
      can_manage_vehicles: spec.fleetRole === "FLEET_ADMIN",
      can_manage_drivers: spec.fleetRole === "FLEET_ADMIN",
      can_dispatch_trips: spec.fleetRole === "FLEET_ADMIN" || spec.fleetRole === "FLEET_DISPATCHER",
      can_manage_maintenance: spec.fleetRole === "FLEET_ADMIN",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
  }

  if (spec.designRole) {
    await supabaseAdmin.from("design_user_access").upsert({
      user_id: userId,
      design_role: spec.designRole,
      project_access_type: spec.projectScope && spec.projectScope.length > 0 ? "SPECIFIC" : "ALL",
      assigned_project_ids: spec.projectScope || [],
      can_matrix_edit: spec.designRole === "DESIGN_ADMIN" || spec.designRole === "DESIGN_LEAD",
      can_drawings_upload: spec.designRole === "DESIGN_ADMIN" || spec.designRole === "DESIGN_LEAD",
      can_drawings_approve_gfc: spec.designRole === "DESIGN_ADMIN" || spec.designRole === "DESIGN_LEAD",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
  }

  if (spec.budgetRoleId) {
    await supabaseAdmin.from("budget_members").upsert({
      user_id: userId,
      role_id: spec.budgetRoleId,
      active: true,
      added_at: new Date().toISOString()
    }, { onConflict: "user_id" });
  }

  if (spec.dashboards) {
    await supabaseAdmin.from("dashboard_user_access").delete().eq("user_id", userId);
    const dashRows = spec.dashboards.map(key => ({
      user_id: userId,
      dashboard_key: key,
      created_at: new Date().toISOString()
    }));
    if (dashRows.length > 0) {
      await supabaseAdmin.from("dashboard_user_access").insert(dashRows);
    }
  }

  return userId;
}

// Seed fixed test entities
async function seedFixedEntities(superAdminId: string) {
  console.log("Seeding fixed test workspace, tasks, tickets, and requirements...");

  // Dynamically resolve sample valid status, priority, and department IDs
  const [taskSample, ticketStatusSample, reqStatusSample] = await Promise.all([
    supabaseAdmin.from("tasks").select("status_id, priority_id, department_id").not("priority_id", "is", null).limit(1),
    supabaseAdmin.from("status_master").select("id").in("module", ["TICKET", "erp"]).limit(1),
    supabaseAdmin.from("status_master").select("id").eq("module", "REQUIREMENT").limit(1)
  ]);

  const taskStatusId = taskSample.data?.[0]?.status_id || "dd403fda-9278-4c1c-b352-da53379b2e62";
  const taskPriorityId = taskSample.data?.[0]?.priority_id || "838d98c4-4fe6-484b-8e76-11bdf770f615";
  const taskDeptId = taskSample.data?.[0]?.department_id || "6f8f7d01-afa3-40e9-ba9b-4606aedf5350";

  const ticketStatusId = ticketStatusSample.data?.[0]?.id || "caeef33b-19a2-47a2-8f4c-57698c2f92e5";
  const ticketPriorityId = "838d98c4-4fe6-484b-8e76-11bdf770f615";
  const ticketDeptId = "8175598d-dabb-4da6-b2e1-c5940a14f219";

  const reqStatusId = reqStatusSample.data?.[0]?.id || "c04655b2-a4d9-40ae-88d8-22d570e7ecb8";
  const reqPriorityId = "838d98c4-4fe6-484b-8e76-11bdf770f615";
  const reqDeptId = "8175598d-dabb-4da6-b2e1-c5940a14f219";

  // 1. Fixed Workspace
  const { data: existingWs } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("workspace_code", "WS-TEST-ALPHA")
    .maybeSingle();

  let workspaceId = existingWs?.id;
  if (!workspaceId) {
    const { data: createdWs, error: wsErr } = await supabaseAdmin.from("workspaces").insert({
      workspace_name: "[TEST-UAT] Alpha Workspace",
      workspace_code: "WS-TEST-ALPHA",
      description: "Fixed idempotent test workspace for UAT automation",
      workspace_owner_id: superAdminId,
      is_active: true,
      is_deleted: false,
      created_by: superAdminId,
      created_at: new Date().toISOString()
    }).select("id").single();

    if (wsErr) console.warn("Workspace seed note:", wsErr.message);
    workspaceId = createdWs?.id;
  }

  // Ensure superAdmin and task users are enrolled as workspace members
  if (workspaceId) {
    const { data: taskUsers } = await supabaseAdmin
      .from("user_master")
      .select("id")
      .in("email", [
        "test.superadmin@chandakgroup.tech",
        "test.task.standard@chandakgroup.tech",
        "test.task.manager@chandakgroup.tech"
      ]);

    for (const u of taskUsers || []) {
      const { data: existingMember } = await supabaseAdmin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", u.id)
        .maybeSingle();

      if (!existingMember) {
        await supabaseAdmin.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: u.id,
          role: u.id === superAdminId ? "owner" : "member",
          is_active: true,
          is_deleted: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // 2. Fixed Task & Subtask
    const { data: existingTask } = await supabaseAdmin
      .from("tasks")
      .select("id")
      .eq("task_code", "TSK-TEST-ALPHA")
      .maybeSingle();

    let parentTaskId = existingTask?.id;
    if (!parentTaskId) {
      const { data: createdTask, error: taskErr } = await supabaseAdmin.from("tasks").insert({
        workspace_id: workspaceId,
        subject: "[TEST-UAT] Alpha Task",
        task_code: "TSK-TEST-ALPHA",
        description: "Fixed test task for UAT automation",
        status_id: taskStatusId,
        priority_id: taskPriorityId,
        department_id: taskDeptId,
        created_by: superAdminId,
        assigned_to: superAdminId,
        is_deleted: false,
        created_at: new Date().toISOString()
      }).select("id").single();

      if (taskErr) console.warn("Task seed note:", taskErr.message);
      parentTaskId = createdTask?.id;
    }

    if (parentTaskId) {
      const { data: existingSub } = await supabaseAdmin
        .from("tasks")
        .select("id")
        .eq("task_code", "SUB-TEST-ALPHA")
        .maybeSingle();

      if (!existingSub) {
        const { error: subErr } = await supabaseAdmin.from("tasks").insert({
          workspace_id: workspaceId,
          parent_task_id: parentTaskId,
          subject: "[TEST-UAT] Alpha Subtask (Level 2)",
          task_code: "SUB-TEST-ALPHA",
          description: "Fixed subtask for hierarchy expansion test",
          status_id: taskStatusId,
          priority_id: taskPriorityId,
          department_id: taskDeptId,
          created_by: superAdminId,
          assigned_to: superAdminId,
          is_deleted: false,
          created_at: new Date().toISOString()
        });
        if (subErr) console.warn("Subtask seed note:", subErr.message);
      }
    }
  }

  // 3. Fixed Ticket
  const { data: existingTicket } = await supabaseAdmin
    .from("tickets")
    .select("id")
    .eq("code", "TCK-TEST-ALPHA")
    .maybeSingle();

  if (!existingTicket) {
    const { error: tckErr } = await supabaseAdmin.from("tickets").insert({
      title: "[TEST-UAT] Alpha Ticket",
      code: "TCK-TEST-ALPHA",
      description: "Fixed support ticket for UAT automation",
      status_id: ticketStatusId,
      priority_id: ticketPriorityId,
      department_id: ticketDeptId,
      creator_id: superAdminId,
      is_deleted: false,
      created_at: new Date().toISOString()
    });
    if (tckErr) console.warn("Ticket seed note:", tckErr.message);
  }

  // 4. Fixed Requirement
  const { data: existingReq } = await supabaseAdmin
    .from("requirements")
    .select("id")
    .eq("code", "REQ-TEST-ALPHA")
    .maybeSingle();

  if (!existingReq) {
    const { error: reqErr } = await supabaseAdmin.from("requirements").insert({
      title: "[TEST-UAT] Alpha Requirement",
      code: "REQ-TEST-ALPHA",
      objective: "Fixed software requirement specification for UAT testing",
      status_id: reqStatusId,
      priority_id: reqPriorityId,
      department_id: reqDeptId,
      creator_id: superAdminId,
      is_deleted: false,
      created_at: new Date().toISOString()
    });
    if (reqErr) console.warn("Requirement seed note:", reqErr.message);
  }
}

// Main Runner
async function main() {
  console.log("=================================================================");
  console.log("  CHANDAK WORKSPACE — UAT TEST SEED ENGINE (Phase 2)");
  console.log("=================================================================");
  console.log("Target: UAT / Test Verification DB");
  console.log(`Test users to seed: ${TEST_USERS.length}`);

  let superAdminId = "";
  let seededCount = 0;

  for (const spec of TEST_USERS) {
    try {
      const uId = await upsertUser(spec);
      if (spec.globalRoleId === ROLES.SUPER_ADMIN) {
        superAdminId = uId;
      }
      seededCount++;
    } catch (err: any) {
      console.error(`Failed seeding ${spec.email}:`, err.message);
    }
  }

  console.log(`Seeded ${seededCount}/${TEST_USERS.length} UAT test users successfully.`);

  if (superAdminId) {
    await seedFixedEntities(superAdminId);
  }

  console.log("Fixed test entities seeded successfully.");
  console.log("UAT test seed complete.");
}

main().catch(err => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
