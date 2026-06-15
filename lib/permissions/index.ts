import { supabaseAdmin } from "@/lib/supabase/service_role";

// =========================================================================
// BACKEND AUTHORIZATION LAYER
// 
// This layer is the single source of truth for visibility and action gating.
// It completely replaces complex DB-level RLS policies.
// =========================================================================

const permissionCache = new Map<string, { perms: Set<string>, role: string, expiresAt: number }>();
const CACHE_TTL_MS = 60000; // 1 minute cache for lightweight performance

/**
 * Internal helper to fetch and cache user permissions.
 */
async function getUserContext(userId: string): Promise<{ perms: Set<string>, role: string }> {
  const cached = permissionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { perms: cached.perms, role: cached.role };
  }

  const [roleRes, permRes] = await Promise.all([
    supabaseAdmin
      .from("user_master")
      .select("role:roles(code)")
      .eq("id", userId)
      .single(),
    supabaseAdmin
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", userId)
  ]);

  const dbRoleCode = Array.isArray(roleRes.data?.role) 
    ? (roleRes.data?.role[0] as any)?.code 
    : (roleRes.data?.role as any)?.code;

  const rawPerms = permRes.data?.map(r => r.permission_code) || [];
  
  // Expand permissions: UPDATE implies VIEW, DELETE implies VIEW, CREATE implies VIEW
  // NOTE: UPDATE does NOT imply CREATE, DELETE does NOT imply CREATE.
  const expanded = new Set<string>(rawPerms);
  for (const p of rawPerms) {
    if (p.endsWith("_MANAGE")) {
      const base = p.replace("_MANAGE", "");
      expanded.add(`${base}_VIEW`);
      expanded.add(`${base}_CREATE`);
      expanded.add(`${base}_UPDATE`);
      expanded.add(`${base}_DELETE`);
    } else if (p.endsWith("_CREATE") || p.endsWith("_UPDATE") || p.endsWith("_DELETE")) {
      const base = p.slice(0, p.lastIndexOf("_"));
      expanded.add(`${base}_VIEW`);
    }
  }

  const role = dbRoleCode || "USER";
  permissionCache.set(userId, { perms: expanded, role, expiresAt: Date.now() + CACHE_TTL_MS });

  return { perms: expanded, role };
}

/**
 * Validates if a user has a specific permission code.
 */
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  // BREAK GLASS EMERGENCY PATH
  if (process.env.BREAK_GLASS_MODE === 'true') {
    const { supabaseAdmin } = await import('@/lib/supabase/service_role');
    const { error } = await supabaseAdmin.from('activity_events').insert({
      module_type: 'SYSTEM',
      record_id: userId,
      event_type: 'EMERGENCY_OVERRIDE',
      old_value: null,
      new_value: { action: 'BREAK_GLASS_AUTHORIZATION', permission: permissionCode },
      performed_by: userId
    });
    if (error) console.error("Break glass log error", error);
    return true;
  }

  const ctx = await getUserContext(userId);
  
  // Strict IAM explicit snapshot check ONLY
  return ctx.perms.has(permissionCode);
}

/**
 * Validates if a user can access a specific ticket.
 */
export async function canAccessTicket(userId: string, ticketId: string): Promise<boolean> {
  if (process.env.BREAK_GLASS_MODE === 'true') return true;
  const ctx = await getUserContext(userId);

  const { data } = await supabaseAdmin
    .from("tickets")
    .select("creator_id, assignee_id, department_id")
    .eq("id", ticketId)
    .single();

  if (!data) return false;
  if (data.creator_id === userId || data.assignee_id === userId) return true;

  // Manager or Department check could be added here
  return false;
}

/**
 * Validates if a user can access a specific task.
 */
export async function canAccessTask(userId: string, taskId: string): Promise<boolean> {
  if (process.env.BREAK_GLASS_MODE === 'true') return true;
  const ctx = await getUserContext(userId);

  const { data } = await supabaseAdmin
    .from("tasks")
    .select("created_by, workspace_id, assignees:task_assignees(user_id)")
    .eq("id", taskId)
    .single();

  if (!data) return false;
  if (data.created_by === userId) return true;
  
  const assignees = data.assignees as any[];
  if (assignees?.some(a => a.user_id === userId)) return true;

  return canAccessWorkspace(userId, data.workspace_id);
}

/**
 * Validates if a user can access a specific workspace.
 */
export async function canAccessWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  if (process.env.BREAK_GLASS_MODE === 'true') return true;
  const ctx = await getUserContext(userId);

  const { data } = await supabaseAdmin
    .from("workspaces")
    .select("owner_id, visibility_settings")
    .eq("id", workspaceId)
    .single();

  if (!data) return false;
  if (data.owner_id === userId) return true;
  if (data.visibility_settings?.public) return true;

  const { count } = await supabaseAdmin
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  return (count && count > 0) ? true : false;
}

/**
 * Validates if a user can manage a specific workspace.
 */
export async function canManageWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  if (process.env.BREAK_GLASS_MODE === 'true') return true;
  const ctx = await getUserContext(userId);

  const { data } = await supabaseAdmin
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (data && data.owner_id === userId) return true;

  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  return member?.role === 'manager';
}
