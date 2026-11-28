import { supabaseAdmin } from "@/lib/supabase/service_role";

export interface DirectoryUser {
  id: string;
  full_name: string | null;
  user_code: string | null;
  email: string | null;
  profile_photo: string | null;
  is_active: boolean | null;
  is_deleted: boolean | null;
}

/**
 * Fetches only active, non-deleted users eligible for NEW assignments,
 * enrollments, approvals, watchers, and operational pickers.
 */
export async function getActiveEligibleUsers(limit = 500): Promise<DirectoryUser[]> {
  const { data, error } = await supabaseAdmin
    .from("user_master")
    .select("id, full_name, user_code, email, profile_photo, is_active, is_deleted")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("full_name", { ascending: true })
    .limit(limit);

  if (error || !data) {
    console.error("[user-directory] getActiveEligibleUsers failed:", error);
    return [];
  }
  return data as DirectoryUser[];
}

/**
 * Validates that every supplied user ID belongs to an active, non-deleted user.
 * Used to enforce inactive-user restrictions at backend/API boundaries for NEW operations.
 */
export async function assertUsersActive(
  userIds: (string | null | undefined)[]
): Promise<{ ok: true } | { ok: false; inactiveUserIds: string[]; error: string }> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id && id.trim()))));
  if (ids.length === 0) return { ok: true };

  const { data, error } = await supabaseAdmin
    .from("user_master")
    .select("id, full_name, is_active, is_deleted")
    .in("id", ids);

  if (error) {
    console.error("[user-directory] assertUsersActive query failed:", error);
    return { ok: false, inactiveUserIds: ids, error: "Could not verify user active status." };
  }

  const byId = new Map((data || []).map((u: any) => [u.id, u]));
  const inactiveUserIds = ids.filter((id) => {
    const u = byId.get(id);
    return !u || u.is_deleted === true || u.is_active === false;
  });

  if (inactiveUserIds.length > 0) {
    const names = inactiveUserIds
      .map((id) => byId.get(id)?.full_name || id)
      .join(", ");
    return {
      ok: false,
      inactiveUserIds,
      error: `Deactivated or removed users cannot be assigned to new activities: ${names}`,
    };
  }

  return { ok: true };
}

/**
 * Resolves historical user identities (creator, approver, assignee, actor) WITHOUT
 * filtering out deactivated users, ensuring audit logs, reports, and historical records
 * permanently retain original user references.
 */
export async function resolveHistoricalUsers(
  userIds: (string | null | undefined)[]
): Promise<Map<string, DirectoryUser>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id && id.trim()))));
  const map = new Map<string, DirectoryUser>();
  if (ids.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("user_master")
    .select("id, full_name, user_code, email, profile_photo, is_active, is_deleted")
    .in("id", ids);

  if (error || !data) {
    console.error("[user-directory] resolveHistoricalUsers failed:", error);
    return map;
  }

  for (const row of data as DirectoryUser[]) {
    map.set(row.id, row);
  }
  return map;
}
