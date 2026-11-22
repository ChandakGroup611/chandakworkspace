import type { ModuleManifest } from "../types";

/**
 * AMC & Subscriptions — Module Manifest
 * Governance: Master Architecture Blueprint v2.0 (Decoupled Top-Level Module)
 */
export const amcManifest: ModuleManifest = {
  code: "AMC",
  name: "AMC & Subscriptions",
  description: "Annual maintenance contracts, warranty tracking, and vendor service level agreements",
  icon: "ShieldAlert",
  routePath: "/amc",
  displayOrder: 7,
  status: "ACTIVE",
  rbacAdminRoute: "/amc/settings/rbac",
  scopeConfig: {
    supportedTypes: ["all"],
    defaultType: "all",
  },
  roles: [
    {
      code: "STANDARD",
      name: "AMC Member",
      description: "Standard team member who can view active maintenance contracts and warranty coverage.",
      isSystem: true,
    },
    {
      code: "AMC_ADMIN",
      name: "AMC Administrator",
      description: "Full administrative control to create, renew, and terminate maintenance contracts.",
      isSystem: false,
    },
  ],
  permissions: [
    { code: "AMC_VIEW", name: "View AMC Contracts", category: "VIEW", description: "View annual maintenance contracts, terms, and renewals" },
    { code: "AMC_MANAGE", name: "Manage AMC Contracts", category: "ADMINISTER", description: "Create, update, renew, and terminate AMC contracts", isSensitive: true },
  ],
  defaultPolicies: {
    STANDARD: [
      "AMC_VIEW",
    ],
    AMC_ADMIN: [
      "AMC_VIEW",
      "AMC_MANAGE",
    ],
  },
};

export default amcManifest;
