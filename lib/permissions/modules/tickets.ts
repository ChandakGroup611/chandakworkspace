import { can, RecordScopeConstraint } from "../module-access";
import { TASK_WORKFLOW_MODULE, TASK_PERMISSIONS } from "./tasks";

export const TICKETS_MODULE = "TICKETS" as const;

export const TICKET_PERMISSIONS = {
  TICKETS_VIEW: TASK_PERMISSIONS.TICKETS_VIEW,
  TICKETS_CREATE: TASK_PERMISSIONS.TICKETS_CREATE,
  TICKETS_RESOLVE: TASK_PERMISSIONS.TICKETS_RESOLVE,
  TICKETS_DELETE: TASK_PERMISSIONS.TICKETS_DELETE,
} as const;

export type TicketPermission = keyof typeof TICKET_PERMISSIONS;

export async function canTicket(
  userId: string,
  permission: TicketPermission,
  record?: RecordScopeConstraint
): Promise<boolean> {
  // Checks under TICKETS or TASK_WORKFLOW
  const direct = await can(userId, TICKETS_MODULE as any, permission, record);
  if (direct) return true;
  return can(userId, TASK_WORKFLOW_MODULE, permission, record);
}
