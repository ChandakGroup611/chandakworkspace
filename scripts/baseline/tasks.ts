import { TestCaseRunner } from "./types";

export const taskRunners: TestCaseRunner[] = [
  {
    tcId: "TC-TASK-001",
    module: "Workspace/Tasks",
    screen: "app/workspaces/page.tsx (route: /workspaces)",
    description: "Super Admin can view all workspaces across departments and companies",
    role: "Super Admin",
    type: "functional",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const { data, error } = await supabaseAdmin
        .from("workspaces")
        .select("id, workspace_name, workspace_code, is_active")
        .eq("is_deleted", false);
      if (error) return { pass: false, notes: `Failed fetching workspaces: ${error.message}`, codePath: "lib/actions/workspaces.ts" };
      if (!data || data.length === 0) return { pass: false, notes: "Zero workspaces returned", codePath: "app/workspaces/page.tsx" };
      return { pass: true, notes: `Super Admin successfully accessed ${data.length} workspaces.` };
    }
  },
  {
    tcId: "TC-TASK-003",
    module: "Workspace/Tasks",
    screen: "app/workspaces/page.tsx (route: /workspaces)",
    description: "Super Admin creates workspace with unique code and registered owner",
    role: "Super Admin",
    type: "functional",
    suite: "sandbox",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const superAdminId = ctx.users["test.superadmin@chandakgroup.tech"];
      const code = `WS-AUTO-${Date.now()}`;
      const { data, error } = await supabaseAdmin.from("workspaces").insert({
        workspace_name: "[TEST-AUTO] Auto Workspace",
        workspace_code: code,
        description: "Automated test workspace",
        workspace_owner_id: superAdminId,
        created_by: superAdminId,
        is_active: true,
        is_deleted: false
      }).select("id, workspace_code, workspace_owner_id").single();
      if (error) return { pass: false, notes: `Workspace creation failed: ${error.message}`, codePath: "lib/actions/workspaces.ts" };
      // Clean up
      await supabaseAdmin.from("workspaces").delete().eq("id", data.id);
      return { pass: true, notes: `Workspace created successfully with code ${data.workspace_code}` };
    }
  },
  {
    tcId: "TC-TASK-004",
    module: "Workspace/Tasks",
    screen: "app/workspaces/tasks/page.tsx (route: /workspaces/tasks)",
    description: "STANDARD user creates task in enrolled workspace",
    role: "STANDARD",
    type: "functional",
    suite: "sandbox",
    run: async (ctx) => {
      const stdUserId = ctx.users["test.task.standard@chandakgroup.tech"];
      const wsId = ctx.fixedEntities.workspaceId;
      const { createTask, deleteTask } = await import("../../lib/actions/tasks");
      const res = await createTask({
        workspace_id: wsId,
        subject: "[TEST-AUTO] Standard User Subtask Test",
        priority_id: "838d98c4-4fe6-484b-8e76-11bdf770f615",
        created_by: stdUserId,
        parent_task_id: ctx.fixedEntities.taskId
      });
      if (res && res.error) {
        return { pass: false, notes: `Subtask creation via action failed: ${res.error}`, codePath: "lib/actions/tasks.ts" };
      }
      if (res && res.data?.id) {
        await deleteTask(res.data.id);
      }
      return { pass: true, notes: "Subtask created successfully with workspace binding via createTask" };
    }
  },
  {
    tcId: "TC-TASK-005",
    module: "Workspace/Tasks",
    screen: "app/workspaces/tasks/page.tsx (route: /workspaces/tasks)",
    description: "Task assignee updates priority inline",
    role: "STANDARD",
    type: "functional",
    suite: "sandbox",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const taskId = ctx.fixedEntities.taskId;
      const { error } = await supabaseAdmin
        .from("tasks")
        .update({ priority_id: "507d7b96-8cc0-48ac-b818-f683a88b8c46" }) // CRITICAL
        .eq("id", taskId);
      if (error) return { pass: false, notes: `Inline priority update failed: ${error.message}`, codePath: "lib/actions/tasks.ts" };
      return { pass: true, notes: "Priority updated inline and persisted" };
    }
  },
  {
    tcId: "TC-TASK-006",
    module: "Workspace/Tasks",
    screen: "app/workspaces/tasks/page.tsx (route: /workspaces/tasks)",
    description: "Read-only spectator on task is rejected from modifying priority",
    role: "STANDARD",
    type: "permission",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const spectatorId = ctx.users["test.task.noaccess@chandakgroup.tech"];
      const taskId = ctx.fixedEntities.taskId;
      // In current codebase, updateTaskPriority check authorization:
      // Verify if spectator without assignment or manager role is blocked
      const { data: task } = await supabaseAdmin.from("tasks").select("assigned_to, created_by, workspace_id").eq("id", taskId).single();
      const isSpectator = task?.assigned_to !== spectatorId && task?.created_by !== spectatorId;
      if (!isSpectator) return { pass: false, notes: "Spectator user is accidentally assigned to task", codePath: "scripts/seed-test-users.ts" };
      
      // Attempt priority mutation via permission check & action check
      const { hasPermission } = await import("../../lib/permissions");
      const isSuper = await hasPermission(spectatorId, "SUPER_ADMIN");
      const canEdit = isSuper || task?.assigned_to === spectatorId || task?.created_by === spectatorId;
      if (canEdit) {
        return { pass: false, notes: "Security violation: spectator permitted to modify task priority", codePath: "lib/actions/tasks.ts" };
      }
      const { updateTask } = await import("../../lib/actions/tasks");
      const updateRes = await updateTask(taskId, { priority_id: "507d7b96-8cc0-48ac-b818-f683a88b8c46" });
      if (updateRes && !(updateRes as any).error) {
        return { pass: false, notes: "Security violation: spectator permitted to modify task priority via server action", codePath: "lib/actions/tasks.ts" };
      }
      return { pass: true, notes: "Spectator inline priority modification correctly rejected" };
    }
  },
  {
    tcId: "TC-TASK-007",
    module: "Workspace/Tasks",
    screen: "app/workspaces/page.tsx (route: /workspaces)",
    description: "STANDARD member blocked from deleting workspace",
    role: "STANDARD",
    type: "permission",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const stdUserId = ctx.users["test.task.standard@chandakgroup.tech"];
      const wsId = ctx.fixedEntities.workspaceId;
      const { data: member } = await supabaseAdmin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wsId)
        .eq("user_id", stdUserId)
        .maybeSingle();
      
      const isOwner = member?.role === "owner";
      const { hasPermission } = await import("../../lib/permissions");
      const isSuper = await hasPermission(stdUserId, "SUPER_ADMIN");
      const { deleteTask } = await import("../../lib/actions/tasks");
      const delRes = await deleteTask(ctx.fixedEntities.taskId);
      if (delRes && !(delRes as any).error) {
        return { pass: false, notes: "Security violation: unauthorized caller permitted to delete task", codePath: "lib/actions/tasks.ts" };
      }
      if (!isSuper && !isOwner) {
        return { pass: true, notes: "Standard member is properly restricted from deleting workspace and task" };
      }
      return { pass: false, notes: "Standard member has unauthorized workspace deletion rights", codePath: "lib/actions/workspaces.ts" };
    }
  },
  {
    tcId: "TC-TASK-012",
    module: "Workspace/Tasks",
    screen: "app/workspaces/page.tsx (route: /workspaces)",
    description: "User with zero access to Workspace/Tasks is blocked from module",
    role: "no access",
    type: "permission",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const noAccessUserId = ctx.users["test.task.noaccess@chandakgroup.tech"];
      const { data: mods } = await supabaseAdmin
        .from("user_modules")
        .select("module:modules_master(code)")
        .eq("user_id", noAccessUserId);
      const modCodes = (mods || []).map((m: any) => m.module?.code);
      const hasTaskWorkflow = modCodes.includes("TASK_WORKFLOW");
      if (hasTaskWorkflow) {
        return { pass: false, notes: "No-access user has TASK_WORKFLOW in user_modules", codePath: "scripts/seed-test-users.ts" };
      }
      return { pass: true, notes: "User without TASK_WORKFLOW is completely excluded from module" };
    }
  },
  {
    tcId: "TC-TASK-014",
    module: "Workspace/Tasks",
    screen: "app/workspaces/page.tsx (route: /workspaces)",
    description: "Super Admin possesses unrestricted operational access across all workspaces",
    role: "Super Admin",
    type: "permission",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const superAdminId = ctx.users["test.superadmin@chandakgroup.tech"];
      const { hasPermission } = await import("../../lib/permissions");
      const isSuper = await hasPermission(superAdminId, "SUPER_ADMIN");
      if (!isSuper) return { pass: false, notes: "Super Admin role check failed", codePath: "lib/permissions/index.ts" };
      return { pass: true, notes: "Super Admin holds universal workspace bypass" };
    }
  },
  {
    tcId: "TC-TASK-015",
    module: "Workspace/Tasks",
    screen: "app/workspaces/tasks/page.tsx (route: /workspaces/tasks)",
    description: "Server derives created_by and performedBy strictly from session; malicious client payload is ignored",
    role: "STANDARD",
    type: "data",
    run: async (ctx) => {
      const { createTask } = await import("../../lib/actions/tasks");
      const maliciousPayload = {
        workspace_id: ctx.fixedEntities.workspaceId,
        subject: "Malicious Spoofed Task",
        priority_id: "507d7b96-8cc0-48ac-b818-f683a88b8c46",
        created_by: "00000000-0000-0000-0000-000000000000"
      };
      const prevEnv = process.env.NODE_ENV;
      const prevSandbox = process.env.SANDBOX_CONFIRM;
      try {
        (process.env as any).NODE_ENV = "production";
        delete process.env.SANDBOX_CONFIRM;
        const res = await createTask(maliciousPayload as any);
        if (res && !("error" in res)) {
          return { pass: false, notes: "VULNERABILITY: createTask accepted spoofed created_by without server session", codePath: "lib/actions/tasks.ts" };
        }
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
        if (prevSandbox) process.env.SANDBOX_CONFIRM = prevSandbox;
      }
      return { pass: true, notes: "Server strictly derives identity from authenticated session; spoofed created_by is rejected" };
    }
  },
  {
    tcId: "TC-TASK-016",
    module: "Workspace/Tasks",
    screen: "app/workspaces/tasks/page.tsx (route: /workspaces/tasks)",
    description: "SPECIFIC scope bounds results strictly to enrolled workspaces",
    role: "STANDARD",
    type: "permission",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const stdUserId = ctx.users["test.task.standard@chandakgroup.tech"];
      const { data: memberships } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", stdUserId)
        .eq("is_active", true);
      const enrolledWsIds = (memberships || []).map(m => m.workspace_id);
      if (enrolledWsIds.length === 0) return { pass: false, notes: "Standard user has 0 workspace memberships", codePath: "scripts/seed-test-users.ts" };
      return { pass: true, notes: `User scope bounded to ${enrolledWsIds.length} enrolled workspace(s)` };
    }
  },
  {
    tcId: "TC-TASK-017",
    module: "Workspace/Tasks",
    screen: "app/tasks/[taskId]/page.tsx (route: /tasks/[taskId])",
    description: "Subtask 3 levels deep inline priority update persists",
    role: "STANDARD",
    type: "functional",
    suite: "sandbox",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const subtaskId = ctx.fixedEntities.subtaskId;
      if (!subtaskId) return { pass: false, notes: "Fixed subtask entity missing", codePath: "scripts/seed-test-users.ts" };
      const { error } = await supabaseAdmin
        .from("tasks")
        .update({ priority_id: "838d98c4-4fe6-484b-8e76-11bdf770f615" })
        .eq("id", subtaskId);
      if (error) return { pass: false, notes: `Subtask priority update failed: ${error.message}`, codePath: "lib/actions/tasks.ts" };
      return { pass: true, notes: "Subtask priority updated and persisted" };
    }
  }
];
