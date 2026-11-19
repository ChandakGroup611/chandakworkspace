import { can, RecordScopeConstraint } from "../module-access";

export const ORG_BUDGET_MODULE = "ORG_BUDGET" as const;

export const BUDGET_ROLES = {
  BUDGET_ADMIN: "BUDGET_ADMIN",
  PREPARER: "PREPARER",
  DEPT_EDITOR: "DEPT_EDITOR",
  APPROVER: "APPROVER",
  VIEWER: "VIEWER", // STANDARD (D8)
} as const;

export const BUDGET_PERMISSIONS = {
  BUDGET_VIEW: "BUDGET_VIEW",
  BUDGET_PROJECT_MANAGE: "BUDGET_PROJECT_MANAGE",
  COST_HEADS_MANAGE: "COST_HEADS_MANAGE",
  BUDGET_PREPARE: "BUDGET_PREPARE",
  BUDGET_DEPT_EDIT: "BUDGET_DEPT_EDIT",
  BUDGET_SUBMIT: "BUDGET_SUBMIT",
  BUDGET_APPROVE: "BUDGET_APPROVE",
  INCURRED_MANAGE: "INCURRED_MANAGE",
  BUDGET_REPORTS_EXPORT: "BUDGET_REPORTS_EXPORT",
  BUDGET_SETTINGS: "BUDGET_SETTINGS",
} as const;

export type BudgetRole = keyof typeof BUDGET_ROLES;
export type BudgetPermission = keyof typeof BUDGET_PERMISSIONS;

export async function canBudget(
  userId: string,
  permission: BudgetPermission,
  record?: RecordScopeConstraint
): Promise<boolean> {
  return can(userId, ORG_BUDGET_MODULE, permission, record);
}
