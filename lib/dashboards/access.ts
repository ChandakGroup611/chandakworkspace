import { createHmac } from "crypto";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { DASHBOARD_PERMISSIONS, DASHBOARDS, type DashboardDef, type DashboardPermission } from "./registry";

// =========================================================================
// What a portal user may do in each dashboard, and the signed token that
// carries it to the dashboard engine.
// =========================================================================

export interface DashboardAccess {
  perms: DashboardPermission[];
  companies: number[] | null; // null = all companies
}

const PERM_SUFFIX: Record<DashboardPermission, string> = {
  view: "VIEW",
  details: "DETAILS",
  export: "EXPORT",
  schedule: "SCHEDULE",
  chat: "CHAT",
  admin: "ADMIN",
};

const TOKEN_TTL_SECONDS = 120;
const ISSUER = "chandakgroup-portal";

export async function getDashboardAccess(userId: string, def: DashboardDef): Promise<DashboardAccess> {
  const { can, getModuleRole } = await import("@/lib/permissions/module-access");

  // 1. Super Admin check: strictly SUPER_ADMIN / ROLE_SUPER_ADMIN (remove plain ADMIN / ROLE_ADMIN)
  const { data: um } = await supabaseAdmin
    .from("user_master")
    .select("role:roles(code)")
    .eq("id", userId)
    .maybeSingle();

  const roleCode = (Array.isArray(um?.role) ? (um?.role[0] as any)?.code : (um?.role as any)?.code)?.toUpperCase();
  const isSuperAdminRole = ["SUPER_ADMIN", "ROLE_SUPER_ADMIN"].includes(roleCode || "");
  const isSuperAdmin = isSuperAdminRole && (await hasPermission(userId, "SUPER_ADMIN"));

  // 2. User-wise dashboard access check:
  // Query both legacy dashboard_user_access and unified user_module_access.
  // Also check if this user has explicit custom dashboard assignments in user_module_access.
  const [legacyRes, umaRes, userDashboardEntriesRes] = await Promise.all([
    supabaseAdmin
      .from("dashboard_user_access")
      .select("company_ids")
      .eq("user_id", userId)
      .eq("dashboard_key", def.key)
      .maybeSingle(),
    supabaseAdmin
      .from("user_module_access")
      .select("role_code, scope")
      .eq("user_id", userId)
      .eq("module_code", "DASHBOARDS")
      .eq("dashboard_key", def.key)
      .maybeSingle(),
    supabaseAdmin
      .from("user_module_access")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("module_code", "DASHBOARDS")
  ]);

  const hasExplicitDashboardConfig = (userDashboardEntriesRes.count ?? 0) > 0;
  const isTicked = Boolean(legacyRes.data || umaRes.data);

  if (isSuperAdmin) {
    // If the Super Admin has explicit dashboard configurations in User Master,
    // enforce the selection: unticked dashboards are strictly denied.
    if (hasExplicitDashboardConfig && !isTicked) {
      return { perms: [], companies: [] };
    }
    // Default unconfigured Super Admin OR explicitly ticked dashboard:
    // universal access, all capabilities, and unrestricted company scope across the allowed dashboard
    return {
      perms: ["view", "details", "export", "schedule", "chat", "admin"],
      companies: null, // all companies
    };
  }

  if (!isTicked) {
    // Unticked dashboard: strictly forbidden regardless of role permissions
    return { perms: [], companies: [] };
  }

  // 3. User has this dashboard ticked. Now evaluate permitted actions inside this dashboard.
  const moduleRole = await getModuleRole(userId, "DASHBOARDS", def.key);
  const canViewByModule = await can(userId, "DASHBOARDS", "VIEW", { dashboard_key: def.key });
  const rolePerms = moduleRole ? moduleRole.permissions.map(p => p.toUpperCase()) : [];

  const manage = await hasPermission(userId, `${def.permissionPrefix}_MANAGE`);

  const perms: DashboardPermission[] = ["view"]; // Base view permission granted by user-wise tick
  if (rolePerms.includes("DETAILS") || canViewByModule) perms.push("details");

  for (const p of DASHBOARD_PERMISSIONS) {
    if (p === "view" || perms.includes(p)) continue;
    const permSuffix = PERM_SUFFIX[p];
    const hasRolePerm = rolePerms.includes(permSuffix) || (await hasPermission(userId, `${def.permissionPrefix}_${permSuffix}`));
    if (manage || hasRolePerm) {
      perms.push(p);
    } else if (legacyRes.data && (p === "details" || p === "export" || p === "chat" || p === "schedule")) {
      perms.push(p);
    }
  }

  // 4. Resolve company scoping for the ticked dashboard
  let companies: number[] | null = null;
  if (moduleRole && moduleRole.scope?.type === "companies" && Array.isArray(moduleRole.scope.company_ids)) {
    companies = moduleRole.scope.company_ids.map(Number).filter(Number.isFinite);
  } else if (legacyRes.data?.company_ids && Array.isArray(legacyRes.data.company_ids)) {
    companies = legacyRes.data.company_ids.map(Number).filter(Number.isFinite);
  }

  return { perms, companies };
}

export async function listAccessibleDashboards(userId: string) {
  const out: { def: DashboardDef; access: DashboardAccess }[] = [];
  for (const def of DASHBOARDS) {
    const access = await getDashboardAccess(userId, def);
    if (access.perms.includes("view")) out.push({ def, access });
  }
  return out;
}

export function signDashboardToken(
  def: DashboardDef,
  user: { id: string; email: string; name: string },
  access: DashboardAccess
): string {
  const secret = (process.env.DASHBOARD_PROXY_SECRET || "").trim();
  if (secret.length < 32) {
    throw new Error(
      "DASHBOARD_PROXY_SECRET is not set (needs at least 32 characters). Please configure the DASHBOARD_PROXY_SECRET secret in GitHub Secrets and Hostinger environment."
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const b64 = (v: string | Buffer) => Buffer.from(v).toString("base64url");
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64(
    JSON.stringify({
      iss: ISSUER,
      aud: def.key,
      sub: user.id,
      email: user.email,
      name: user.name,
      perms: access.perms,
      companies: access.companies,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    })
  );
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export async function getPortalUserProfile(userId: string, fallbackEmail: string) {
  const { data } = await supabaseAdmin
    .from("user_master")
    .select("full_name, email, is_deleted")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { full_name?: string; email?: string; is_deleted?: boolean } | null;
  return {
    email: (row?.email || fallbackEmail || "").toLowerCase(),
    name: row?.full_name || row?.email || fallbackEmail,
    active: !row?.is_deleted,
  };
}
