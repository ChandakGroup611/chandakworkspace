// =========================================================================
// DASHBOARDS REGISTRY
// One entry per department dashboard served under /dashboards/<key>.
// Each dashboard engine runs on the Azure VM next to the IN4 SQL Server and only
// accepts requests signed by this portal (see lib/dashboards/access.ts).
// To add a department: add an entry here, add DASH_<PREFIX>_* permissions in a
// migration, deploy its engine and set its DASHBOARD_ENGINE_URL_<PREFIX> env var.
// =========================================================================

export type DashboardPermission = "view" | "details" | "export" | "schedule" | "chat" | "admin";

export const DASHBOARD_PERMISSIONS: DashboardPermission[] = ["view", "details", "export", "schedule", "chat", "admin"];

export interface DashboardDef {
  key: string;              // URL segment: /dashboards/<key>
  name: string;
  description: string;
  permissionPrefix: string; // permission codes are <prefix>_VIEW, <prefix>_EXPORT, ...
  engineUrlEnv: string;     // env var holding the engine's https base URL
  accent: string;
}

export const DASHBOARDS: DashboardDef[] = [
  {
    key: "it",
    name: "IT Budget & Expense",
    description: "IT budgets, bills, payments, work orders and vendors on live IN4 data.",
    permissionPrefix: "DASH_IT",
    engineUrlEnv: "DASHBOARD_ENGINE_URL_IT",
    accent: "#3B82F6",
  },
  {
    key: "mkt",
    name: "Marketing Budget & Expense",
    description: "Brand and project promotion budgets, certificates, agencies and payments.",
    permissionPrefix: "DASH_MKT",
    engineUrlEnv: "DASHBOARD_ENGINE_URL_MKT",
    accent: "#EC4899",
  },
];

export function getDashboard(key: string): DashboardDef | undefined {
  return DASHBOARDS.find((d) => d.key === key);
}

export function engineUrl(def: DashboardDef): string | null {
  const raw = (process.env[def.engineUrlEnv] || "").trim().replace(/\/+$/, "");
  return raw.startsWith("https://") || raw.startsWith("http://") ? raw : null;
}
