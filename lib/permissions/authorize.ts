import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { can, ModuleCode, RecordScopeConstraint, getModuleRole } from "./module-access";

export interface SessionUser {
  id: string;
  email: string;
  isSuperAdmin?: boolean;
}

/**
 * Derives the authenticated user strictly from the incoming request cookies/session.
 * Never trusts client-supplied user IDs.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email || "",
    };
  } catch (err) {
    return null;
  }
}

/**
 * Authorize an operational action in a given module for the current session user.
 */
export async function authorize(
  moduleCode: ModuleCode,
  action: string,
  recordScope?: RecordScopeConstraint
): Promise<{ authorized: boolean; user: SessionUser | null; error?: string }> {
  const user = await getSessionUser();
  if (!user) {
    return { authorized: false, user: null, error: "Unauthenticated: Valid session required" };
  }

  const allowed = await can(user.id, moduleCode, action, recordScope);
  if (!allowed) {
    return {
      authorized: false,
      user,
      error: `Unauthorized: User lacks "${action}" permission on ${moduleCode}`,
    };
  }

  return { authorized: true, user };
}

/**
 * Standard defineAction wrapper for server actions.
 * Guarantees server-side session derivation, module authorization, and structured error handling.
 */
export function defineAction<TArgs, TResult>(
  moduleCode: ModuleCode,
  action: string,
  handler: (args: TArgs, user: SessionUser) => Promise<TResult>,
  getScope?: (args: TArgs) => RecordScopeConstraint
) {
  return async (args: TArgs): Promise<{ success: boolean; data?: TResult; error?: string }> => {
    const scope = getScope ? getScope(args) : undefined;
    const auth = await authorize(moduleCode, action, scope);
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Unauthorized" };
    }

    try {
      const result = await handler(args, auth.user);
      return { success: true, data: result };
    } catch (err: any) {
      console.error(`[defineAction] Error in ${moduleCode}:${action}:`, err);
      return { success: false, error: err.message || "Action execution failed" };
    }
  };
}
