import type { ModuleManifest } from "../types";

/**
 * Organization Budget — Module Manifest
 * Governance: Master Architecture Blueprint v2.0
 */
export const budgetManifest: ModuleManifest = {
  code: "ORG_BUDGET",
  name: "Organization Budget",
  description: "Project, tower and department budgets, versions, cost incurred, and financial reports",
  icon: "Wallet",
  routePath: "/budget",
  displayOrder: 6,
  status: "ACTIVE",
  rbacAdminRoute: "/budget/settings/rbac",
  scopeConfig: {
    supportedTypes: ["all", "projects"],
    defaultType: "all",
    entityLabel: "Project",
  },
  roles: [
    {
      code: "STANDARD",
      name: "Budget Viewer / Analyst",
      description: "Standard user who can view approved project budgets and export reports.",
      isSystem: true,
    },
    {
      code: "PREPARER",
      name: "Budget Preparer",
      description: "Drafts project and tower budgets, cost heads, and submits for approval.",
      isSystem: false,
    },
    {
      code: "DEPT_EDITOR",
      name: "Department Budget Editor",
      description: "Edits department-specific cost lines and workings.",
      isSystem: false,
    },
    {
      code: "APPROVER",
      name: "Budget Approver",
      description: "Reviews, approves, or rejects submitted project budgets.",
      isSystem: false,
    },
    {
      code: "BUDGET_ADMIN",
      name: "Budget Administrator",
      description: "Full administrative control over all budgets, cost heads, and settings.",
      isSystem: false,
    },
    {
      code: "VIEWER",
      name: "Budget Viewer",
      description: "Read-only access to view budgets.",
      isSystem: false,
    },
  ],
  permissions: [
    { code: "BUDGET_VIEW", name: "View Budgets", category: "VIEW", description: "View project budgets, summary cards, and cost heads" },
    { code: "BUDGET_PROJECT_MANAGE", name: "Manage Projects", category: "ADMINISTER", description: "Add and configure budget projects and towers" },
    { code: "COST_HEADS_MANAGE", name: "Manage Cost Heads", category: "CONFIGURE", description: "Configure chart of accounts and cost head masters" },
    { code: "BUDGET_PREPARE", name: "Prepare Budgets", category: "CREATE", description: "Create and draft new budget versions and line items" },
    { code: "BUDGET_DEPT_EDIT", name: "Edit Department Budgets", category: "EDIT", description: "Edit department line item workings and allocations" },
    { code: "BUDGET_SUBMIT", name: "Submit Budgets", category: "APPROVE", description: "Submit drafted budget versions for management approval" },
    { code: "BUDGET_APPROVE", name: "Approve Budgets", category: "APPROVE", description: "Formally approve, freeze, or reject budget versions", isSensitive: true },
    { code: "INCURRED_MANAGE", name: "Manage Incurred Actuals", category: "EDIT", description: "Import and sync actual costs from ERP/IN4" },
    { code: "BUDGET_REPORTS_EXPORT", name: "Export Reports", category: "EXPORT", description: "Export budget variance and variance summaries" },
    { code: "BUDGET_SETTINGS", name: "Manage Budget Settings", category: "CONFIGURE", description: "Configure financial thresholds and module RBAC", isSensitive: true },
  ],
  defaultPolicies: {
    STANDARD: [
      "BUDGET_VIEW",
      "BUDGET_REPORTS_EXPORT",
    ],
    VIEWER: [
      "BUDGET_VIEW",
    ],
    DEPT_EDITOR: [
      "BUDGET_VIEW",
      "BUDGET_DEPT_EDIT",
    ],
    PREPARER: [
      "BUDGET_VIEW",
      "BUDGET_PREPARE",
      "BUDGET_DEPT_EDIT",
      "BUDGET_SUBMIT",
      "BUDGET_REPORTS_EXPORT",
    ],
    APPROVER: [
      "BUDGET_VIEW",
      "BUDGET_APPROVE",
      "BUDGET_REPORTS_EXPORT",
    ],
    BUDGET_ADMIN: [
      "BUDGET_VIEW",
      "BUDGET_PROJECT_MANAGE",
      "COST_HEADS_MANAGE",
      "BUDGET_PREPARE",
      "BUDGET_DEPT_EDIT",
      "BUDGET_SUBMIT",
      "BUDGET_APPROVE",
      "INCURRED_MANAGE",
      "BUDGET_REPORTS_EXPORT",
      "BUDGET_SETTINGS",
    ],
  },
};

export default budgetManifest;
