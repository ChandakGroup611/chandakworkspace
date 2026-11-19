import { can, RecordScopeConstraint } from "../module-access";
import { TASK_WORKFLOW_MODULE, TASK_PERMISSIONS } from "./tasks";

export const REQUIREMENTS_MODULE = "REQUIREMENTS" as const;

export const REQUIREMENT_PERMISSIONS = {
  REQUIREMENTS_VIEW: TASK_PERMISSIONS.REQUIREMENTS_VIEW,
  REQUIREMENTS_CREATE: TASK_PERMISSIONS.REQUIREMENTS_CREATE,
  REQUIREMENTS_SUBMIT_UAT: TASK_PERMISSIONS.REQUIREMENTS_SUBMIT_UAT,
  REQUIREMENTS_APPROVE: TASK_PERMISSIONS.REQUIREMENTS_APPROVE,
  REQUIREMENTS_DELETE: TASK_PERMISSIONS.REQUIREMENTS_DELETE,
} as const;

export type RequirementPermission = keyof typeof REQUIREMENT_PERMISSIONS;

export async function canRequirement(
  userId: string,
  permission: RequirementPermission,
  record?: RecordScopeConstraint
): Promise<boolean> {
  const direct = await can(userId, REQUIREMENTS_MODULE as any, permission, record);
  if (direct) return true;
  return can(userId, TASK_WORKFLOW_MODULE, permission, record);
}
