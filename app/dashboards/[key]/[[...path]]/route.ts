import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { engineUrl, getDashboard } from "@/lib/dashboards/registry";
import { getDashboardAccess, getPortalUserProfile, signDashboardToken, type DashboardAccess } from "@/lib/dashboards/access";

// =========================================================================
// /dashboards/<key>/<path>  →  dashboard engine on Azure
// 1. The Supabase session must be valid (same login as the rest of the portal).
// 2. The user needs DASH_<KEY>_VIEW (or _MANAGE) for this dashboard.
// 3. The request is forwarded with a 2-minute signed token carrying the user's
//    dashboard permissions and company scope. Portal cookies are NOT forwarded.
// The engine enforces the permissions again on every API call.
// =========================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const REQUEST_HEADERS = ["accept", "accept-language", "content-type", "x-requested-with", "if-none-match", "if-modified-since"];
const RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control", "etag", "last-modified", "location"];

type Ctx = { params: Promise<{ key: string; path?: string[] }> };

// A dashboard page makes many API calls. Checking the session with Supabase and re-reading the profile
// and dashboard permissions on every one of them made each call wait on several round trips, so the
// result is kept for a short time per session token (permissions already change with a 1-minute delay).
const BOUNCE_COOKIE = "dash_login_bounce";
const AUTH_TTL_MS = Number(process.env.DASHBOARD_AUTH_CACHE_MS ?? 60_000);
type Identity = { id: string; email: string; name: string; active: boolean };
const identityCache = new Map<string, { exp: number; who: Identity }>();
const accessCache = new Map<string, { exp: number; access: DashboardAccess }>();

function remember<T>(map: Map<string, { exp: number } & T>, key: string, value: T) {
  if (map.size > 1000) {
    const now = Date.now();
    for (const [k, v] of map) if (v.exp < now) map.delete(k);
    if (map.size > 1000) map.clear();
  }
  map.set(key, { exp: Date.now() + AUTH_TTL_MS, ...value } as { exp: number } & T);
}

type Who = { who: Identity | null; transient: boolean };

async function currentIdentity(): Promise<Who> {
  const supabase = createClient(await cookies());
  // Reads (and if needed refreshes) the session from the cookies; the token is then verified with
  // Supabase at most once a minute.
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return { who: null, transient: false };
  const tokenKey = createHash("sha256").update(token).digest("hex");
  const hit = identityCache.get(tokenKey);
  if (hit && hit.exp > Date.now()) return { who: hit.who, transient: false };

  const { data, error } = await supabase.auth.getUser(token);
  if (!data.user) {
    // A network hiccup or Supabase outage is not a sign-out: let the page retry instead of logging out.
    const status = (error as { status?: number } | null)?.status ?? 0;
    const retryable = !!error && (error.name === "AuthRetryableFetchError" || status === 0 || status >= 500);
    return { who: null, transient: retryable };
  }
  const profile = await getPortalUserProfile(data.user.id, data.user.email || "");
  const who: Identity = { id: data.user.id, email: profile.email, name: profile.name, active: profile.active };
  remember(identityCache, tokenKey, { who });
  return { who, transient: false };
}

async function accessFor(userId: string, def: NonNullable<ReturnType<typeof getDashboard>>) {
  const key = `${userId}:${def.key}`;
  const hit = accessCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.access;
  const access = await getDashboardAccess(userId, def);
  remember(accessCache, key, { access });
  return access;
}

function isApiPath(segments: string[]) {
  return segments[0] === "api";
}

function deny(api: boolean, status: number, message: string) {
  if (api) {
    return NextResponse.json({ error: status === 401 ? "signed_out" : "forbidden", message }, { status });
  }
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboards</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#f8fafc;color:#0f172a">
<div style="max-width:420px;text-align:center;padding:24px"><h1 style="font-size:20px;margin:0 0 8px">${status === 403 ? "No access" : "Dashboard unavailable"}</h1>
<p style="color:#475569;font-size:14px;line-height:1.5">${message}</p><p><a href="/dashboards" style="color:#6d2158;font-weight:600">Back to dashboards</a></p></div></body>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

async function handle(req: NextRequest, ctx: Ctx) {
  const { key, path = [] } = await ctx.params;
  const def = getDashboard(key);
  const api = isApiPath(path);
  if (!def) return deny(api, 404, "This dashboard does not exist.");

  // Static files (CSS, JS, chart library) carry no data; everything else needs a session.
  const isStatic = path[0] === "static";

  // Static files need no sign-in check at all (the engine serves them to anyone).
  const { who: user, transient } = isStatic ? { who: null, transient: false } : await currentIdentity();
  if (!user && !isStatic) {
    if (transient) return deny(api, 503, "Could not check your sign-in just now. Please try again in a moment.");
    if (api) return deny(true, 401, "Your session ended. Sign in again.");
    // Loop guard: if we already sent this browser to the login page a moment ago and it came straight
    // back (the login page thinks it is signed in), show an error instead of redirecting forever.
    if (req.cookies.get(BOUNCE_COOKIE)) {
      const r = deny(false, 401, "Your portal sign-in could not be confirmed for dashboards. Sign out of the portal, sign in again and retry. If it keeps happening, contact IT.");
      r.cookies.delete(BOUNCE_COOKIE);
      return r;
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    const r = NextResponse.redirect(login);
    r.cookies.set(BOUNCE_COOKIE, "1", { maxAge: 20, path: "/dashboards", httpOnly: true, sameSite: "lax", secure: true });
    return r;
  }

  const base = engineUrl(def);
  if (!base) return deny(api, 503, "This dashboard is not connected yet. Ask IT to set its engine address.");

  const headers = new Headers();
  for (const h of REQUEST_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) headers.set("x-forwarded-for", fwd);
  // Microsoft Dev Tunnels (used while testing) would otherwise show its warning page.
  headers.set("x-tunnel-skip-antiphishing-page", "true");

  if (user) {
    if (!user.active) return deny(api, 403, "Your portal account is disabled.");
    const access = await accessFor(user.id, def);
    if (!access.perms.includes("view")) {
      return deny(api, 403, `You don't have access to the ${def.name} dashboard. Ask your portal administrator.`);
    }
    headers.set("x-portal-auth", signDashboardToken(def, { id: user.id, email: user.email, name: user.name }, access));
  }

  // Only safe path segments reach the engine.
  if (path.some((s) => s === ".." || s === "." || s.includes("\\"))) return deny(api, 400, "Bad path.");
  const target = `${base}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return deny(api, 413, "Request too large.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      // Stay under the web server's 60 s gateway limit so users get our message, not nginx's 504.
      signal: AbortSignal.timeout(50_000),
    });
  } catch {
    return deny(api, 502, "The dashboard server is not reachable right now. Try again in a few minutes; if it continues, contact IT.");
  }

  // The engine refused the portal's pass and wants the user to sign in, but the user IS signed in to the
  // portal: following that redirect would loop. Explain instead (usually a secret or clock mismatch).
  if (upstream.status >= 300 && upstream.status < 400) {
    const to = upstream.headers.get("location") || "";
    let loginRedirect = false;
    try { const u = new URL(to, req.url); loginRedirect = u.pathname === "/login" && u.searchParams.has("next"); } catch { /* ignore */ }
    if (loginRedirect) {
      return deny(api, 502, "The dashboard server did not accept the portal sign-in. IT: check that DASHBOARD_PROXY_SECRET in the portal settings matches the dashboard server, and that the server clock is right.");
    }
  }

  const out = new Headers();
  for (const h of RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  // Engine redirects to its own paths become portal paths.
  // The engine already prefixes its links with /dashboards/<key> (APP_BASE_PATH).
  const loc = out.get("location");
  if (loc && loc.startsWith(base)) {
    const rest = loc.slice(base.length) || "/";
    out.set("location", rest.startsWith(`/dashboards/${def.key}`) ? rest : `/dashboards/${def.key}${rest}`);
  }
  if (!isStatic) out.set("cache-control", "no-store");
  out.set("x-content-type-options", "nosniff");
  out.set("referrer-policy", "same-origin");

  const res = new NextResponse(upstream.body, { status: upstream.status, headers: out });
  if (req.cookies.get(BOUNCE_COOKIE)) res.cookies.delete(BOUNCE_COOKIE);
  return res;
}

export { handle as GET, handle as POST, handle as HEAD };
