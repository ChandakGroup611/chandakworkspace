import { can, RecordScopeConstraint } from "../module-access";
import { TASK_WORKFLOW_MODULE, TASK_PERMISSIONS } from "./tasks";

export const AMC_MODULE = "AMC" as const;

export const AMC_ROLES = {
  AMC_ADMIN: "AMC_ADMIN",
  STANDARD: "STANDARD",
} as const;

export const AMC_PERMISSIONS = {
  AMC_VIEW: TASK_PERMISSIONS.AMC_VIEW,
  AMC_MANAGE: TASK_PERMISSIONS.AMC_MANAGE,
} as const;

export type AmcPermission = keyof typeof AMC_PERMISSIONS;

export async function canAmc(
  userId: string,
  permission: AmcPermission,
  record?: RecordScopeConstraint
): Promise<boolean> {
  const direct = await can(userId, AMC_MODULE as any, permission, record);
  if (direct) return true;
  return can(userId, TASK_WORKFLOW_MODULE, permission, record);
}
