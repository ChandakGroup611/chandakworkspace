import { can, RecordScopeConstraint } from "../module-access";

export const CHANDAK_MEET_MODULE = "CHANDAK_MEET" as const;

export const MEET_ROLES = {
  MEET_ADMIN: "MEET_ADMIN",
  ORGANISER: "ORGANISER",
  PARTICIPANT: "PARTICIPANT", // STANDARD (D8)
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
