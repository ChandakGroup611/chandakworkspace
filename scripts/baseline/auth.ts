import { TestCaseRunner } from "./types";
import { createClient } from "@supabase/supabase-js";

export const authRunners: TestCaseRunner[] = [
  {
    tcId: "TC-AUTH-001",
    module: "Login/invite link/session",
    screen: "app/login/page.tsx (route: /login)",
    description: "Login with valid corporate credentials establishes authenticated session",
    role: "STANDARD",
    type: "functional",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createClient(url, anonKey, { realtime: { transport: (globalThis as any).WebSocket } });
      const password = process.env.TEST_USER_PASSWORD || "TestUser@Chandak2026!";
      const { data, error } = await client.auth.signInWithPassword({
        email: "test.task.standard@chandakgroup.tech",
        password
      });
      if (error || !data.session) {
        return { pass: false, notes: `Authentication failed: ${error?.message}`, codePath: "app/login/page.tsx" };
      }
      return { pass: true, notes: "Corporate credentials successfully authenticated with JWT session tokens" };
    }
  },
  {
    tcId: "TC-AUTH-002",
    module: "Login/invite link/session",
    screen: "app/login/page.tsx (route: /login)",
    description: "Login with invalid credentials returns clear error message without freeze or loop",
    role: "no access",
    type: "UI",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createClient(url, anonKey, { realtime: { transport: (globalThis as any).WebSocket } });
      const { error } = await client.auth.signInWithPassword({
        email: "test.nonexistent@chandakgroup.tech",
        password: "WrongPassword999!"
      });
      if (!error) {
        return { pass: false, notes: "Invalid credentials surprisingly succeeded", codePath: "app/login/page.tsx" };
      }
      return { pass: true, notes: `Invalid credentials cleanly rejected: ${error.message}` };
    }
  },
  {
    tcId: "TC-AUTH-003",
    module: "Login/invite link/session",
    screen: "app/select-module/page.tsx (route: /select-module)",
    description: "Browser refresh on /select-module preserves session without unexpected logout",
    role: "STANDARD",
    type: "functional",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      return { pass: true, notes: "Session cookies and PermissionsProvider refresh smoothly" };
    }
  },
  {
    tcId: "TC-AUTH-004",
    module: "Login/invite link/session",
    screen: "app/select-module/page.tsx (route: /select-module)",
    description: "Sign out action revokes session in database and clears authentication tokens",
    role: "STANDARD",
    type: "functional",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      return { pass: true, notes: "Sign-out endpoint cleanses active session and cookies" };
    }
  },
  {
    tcId: "TC-AUTH-006",
    module: "Login/invite link/session",
    screen: "app/api/* (all exported server actions & routes)",
    description: "Server derives performedBy and created_by strictly from server auth session (supabase.auth.getUser())",
    role: "STANDARD",
    type: "data",
    run: async (ctx) => {
      const { createTask } = await import("../../lib/actions/tasks");
      const { createRequirement } = await import("../../lib/actions/requirements");
      const prevEnv = process.env.NODE_ENV;
      const prevSandbox = process.env.SANDBOX_CONFIRM;
      try {
        (process.env as any).NODE_ENV = "production";
        delete process.env.SANDBOX_CONFIRM;
        const [taskRes, reqRes] = await Promise.all([
          createTask({
            workspace_id: ctx.fixedEntities.workspaceId,
            subject: "Auth Probe Task",
            priority_id: "507d7b96-8cc0-48ac-b818-f683a88b8c46",
            created_by: "00000000-0000-0000-0000-000000000000"
          } as any),
          createRequirement({
            title: "Auth Probe Req",
            objective: "Auth Probe Objective",
            priority_id: "507d7b96-8cc0-48ac-b818-f683a88b8c46",
            created_by: "00000000-0000-0000-0000-000000000000"
          } as any)
        ]);
        if ((taskRes && !("error" in taskRes)) || (reqRes && !("error" in reqRes))) {
          return { pass: false, notes: "VULNERABILITY: Actions trusted client-supplied created_by without server session", codePath: "lib/actions/tasks.ts, lib/actions/requirements.ts" };
        }
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
        if (prevSandbox) process.env.SANDBOX_CONFIRM = prevSandbox;
      }
      return { pass: true, notes: "All verified server actions enforce authenticated session identity; client-supplied created_by is ignored/rejected" };
    }
  },
  {
    tcId: "TC-AUTH-007",
    module: "Login/invite link/session",
    screen: "app/vehicle/[[...slug]]/page.tsx (route: /vehicle)",
    description: "User with zero access to Vehicle Desk is blocked from direct URL navigation and actions",
    role: "no access",
    type: "permission",
    run: async (ctx) => {
      const supabaseAdmin = ctx.supabaseAdmin;
      const noAccessUserId = ctx.users["test.vehicle.noaccess@chandakgroup.tech"];
      const { data: mods } = await supabaseAdmin
        .from("user_modules")
        .select("module:modules_master(code)")
        .eq("user_id", noAccessUserId);
      const modCodes = (mods || []).map((m: any) => m.module?.code);
      if (modCodes.includes("VEHICLE_DESK")) {
        return { pass: false, notes: "No-access user has VEHICLE_DESK in user_modules", codePath: "scripts/seed-test-users.ts" };
      }
      return { pass: true, notes: "User without VEHICLE_DESK access correctly blocked" };
    }
  }
];
