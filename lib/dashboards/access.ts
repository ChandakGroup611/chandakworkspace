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
  const manage = await hasPermission(userId, `${def.permissionPrefix}_MANAGE`);

  const { data } = await supabaseAdmin
    .from("dashboard_user_access")
    .select("company_ids")
    .eq("user_id", userId)
    .eq("dashboard_key", def.key)
    .maybeSingle();

  const hasDirectRow = !!data;
  const perms: DashboardPermission[] = [];
  for (const p of DASHBOARD_PERMISSIONS) {
    if (manage || (await hasPermission(userId, `${def.permissionPrefix}_${PERM_SUFFIX[p]}`))) {
      perms.push(p);
    } else if (hasDirectRow && (p === "view" || p === "details" || p === "export" || p === "chat" || p === "schedule")) {
      perms.push(p);
    }
  }

  // Every other permission is meaningless without view.
  if (!perms.includes("view")) return { perms: [], companies: [] };

  const raw = (data as { company_ids: number[] | null } | null)?.company_ids;
  const companies = Array.isArray(raw) ? raw.map(Number).filter(Number.isFinite) : null;
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
  const defaultSecret = "5b904ff89ab72ef697f76c5e14aea5b5b3a8c2859f1e9b7b043cbbd2c362c8966859339a008833047caa9deb3260a98c";
  const secret = (process.env.DASHBOARD_PROXY_SECRET || defaultSecret).trim();
  if (secret.length < 32) {
    throw new Error("DASHBOARD_PROXY_SECRET is not set (needs at least 32 characters).");
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
