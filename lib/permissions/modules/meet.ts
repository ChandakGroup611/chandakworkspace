import { can, RecordScopeConstraint, ModuleScope } from "../module-access";

export const CHANDAK_MEET_MODULE = "CHANDAK_MEET" as const;

export const MEET_ROLES = {
  MEET_ADMIN: "MEET_ADMIN",
  ORGANISER: "ORGANISER",
  STANDARD: "STANDARD",
  PARTICIPANT: "STANDARD", // Alias for backward compatibility during migration
  VIEWER: "VIEWER",
} as const;

export const MEET_PERMISSIONS = {
  MEETINGS_VIEW: "MEETINGS_VIEW",
  MEETINGS_CREATE: "MEETINGS_CREATE",
  MEETINGS_UPDATE: "MEETINGS_UPDATE",
  MEETINGS_DELETE: "MEETINGS_DELETE",
  SESSIONS_START_RUN: "SESSIONS_START_RUN",
  AGENDA_ADD_POINTS: "AGENDA_ADD_POINTS",
  MOM_RECORD_PUBLISH: "MOM_RECORD_PUBLISH",
  ACTION_ITEMS_ASSIGN: "ACTION_ITEMS_ASSIGN",
  ACTION_ITEMS_UPDATE: "ACTION_ITEMS_UPDATE",
  MEET_SETTINGS: "MEET_SETTINGS",
} as const;

export type MeetRole = keyof typeof MEET_ROLES;
export type MeetPermission = keyof typeof MEET_PERMISSIONS;

export async function canMeet(
  userId: string,
  permission: MeetPermission,
  record?: RecordScopeConstraint
): Promise<boolean> {
  return can(userId, CHANDAK_MEET_MODULE, permission, record);
}

/**
 * Apply query-level scope filter for Chandak Meet.
 * If user has scoped access (e.g. specific departments), enforces it directly in the Supabase query.
 */
export function applyMeetQueryScope<T>(query: T, scope?: ModuleScope | null): T {
  if (!scope || scope.type === "all") {
    return query;
  }
  if (scope.type === "departments" && scope.department_ids && scope.department_ids.length > 0) {
    return (query as any).in("department_id", scope.department_ids);
  }
  return query;
}
