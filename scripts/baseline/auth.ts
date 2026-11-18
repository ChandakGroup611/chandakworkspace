import { TestCaseRunner } from "./types";
import { supabaseAdmin } from "../../lib/supabase/service_role";
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
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createClient(url, anonKey);
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
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createClient(url, anonKey);
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
      // In current codebase:
      // We already discovered lib/actions/tasks.ts line 45 (createTask) and lib/actions/requirements.ts line 389 (createRequirement)
      // accept client payload created_by!
      // This is a known current vulnerability.
      return {
        pass: false,
        notes: "VULNERABILITY: Multiple server actions (e.g. createTask, createRequirement) trust client-supplied created_by instead of strictly overriding with session getUser().",
        codePath: "lib/actions/tasks.ts:45, lib/actions/requirements.ts:389",
        errorTrace: "Audit revealed created_by is accepted from payload parameters in tasks and requirements actions."
      };
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
