import type { ModuleManifest } from "../types";

/**
 * Executive Dashboards — Module Manifest
 * Governance: Master Architecture Blueprint v2.0
 */
export const dashboardsManifest: ModuleManifest = {
  code: "DASHBOARDS",
  name: "Executive Dashboards",
  description: "Executive and departmental dashboards on live data (IT, Marketing, Admin, Engineering, SFDC)",
  icon: "LineChart",
  routePath: "/dashboards",
  displayOrder: 5,
  status: "ACTIVE",
  rbacAdminRoute: "/dashboards/settings/rbac",
  scopeConfig: {
    supportedTypes: ["all", "companies"],
    defaultType: "all",
    entityLabel: "Company",
  },
  roles: [
    {
      code: "STANDARD",
      name: "Dashboard Viewer",
      description: "Standard dashboard viewer with access to summary KPIs and drilldowns.",
      isSystem: true,
    },
    {
      code: "EDITOR",
      name: "Dashboard Analyst / Editor",
      description: "Full access to view, export data, configure views, and query conversational AI.",
      isSystem: false,
    },
  ],
  permissions: [
    { code: "VIEW", name: "View Dashboard", category: "VIEW", description: "View summary KPI cards and performance trends" },
    { code: "DETAILS", name: "View Details", category: "VIEW", description: "View granular tabular records and item breakdowns" },
    { code: "EXPORT", name: "Export Data", category: "EXPORT", description: "Export datasets to Excel, CSV, and PDF reports" },
    { code: "SCHEDULE", name: "Schedule Reports", category: "CREATE", description: "Configure automated email delivery schedules" },
    { code: "CHAT", name: "AI Analytics Assistant", category: "VIEW", description: "Ask conversational analytical questions via AI" },
    { code: "ADMIN", name: "Dashboard Administration", category: "CONFIGURE", description: "Configure data connections and module RBAC", isSensitive: true },
  ],
  defaultPolicies: {
    STANDARD: [
      "VIEW",
      "DETAILS",
    ],
    EDITOR: [
      "VIEW",
      "DETAILS",
      "EXPORT",
      "SCHEDULE",
      "CHAT",
    ],
  },
};

export default dashboardsManifest;
