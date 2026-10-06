import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { engineUrl, getDashboard } from "@/lib/dashboards/registry";
import { getDashboardAccess, getPortalUserProfile, signDashboardToken } from "@/lib/dashboards/access";

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

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isStatic) {
    if (api) return deny(true, 401, "Your session ended. Sign in again.");
    const login = new URL("/login", req.url);
    login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
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
    const profile = await getPortalUserProfile(user.id, user.email || "");
    if (!profile.active) return deny(api, 403, "Your portal account is disabled.");
    const access = await getDashboardAccess(user.id, def);
    if (!access.perms.includes("view")) {
      return deny(api, 403, `You don't have access to the ${def.name} dashboard. Ask your portal administrator.`);
    }
    headers.set("x-portal-auth", signDashboardToken(def, { id: user.id, email: profile.email, name: profile.name }, access));
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
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    return deny(api, 502, "The dashboard engine is not responding. Try again in a minute.");
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

  return new NextResponse(upstream.body, { status: upstream.status, headers: out });
}

export { handle as GET, handle as POST, handle as HEAD };
