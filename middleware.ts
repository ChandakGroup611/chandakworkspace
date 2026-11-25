import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { MODULE_CHOSEN_COOKIE } from "@/lib/module-gate";

// Pages that never go through the module gate (sign-in flow, onboarding, public share links, shared user settings).
const GATE_EXEMPT = /^\/(select-module|login|register|auth\/|api\/|profile|settings|share\/|verify-drawing\/|offline|_next\/)/;

const API_METHOD_CONTRACT: Record<string, string[]> = {
  "/api/version": ["GET", "HEAD"],
  "/api/health": ["GET", "HEAD"],
  "/api/amc": ["POST", "DELETE"],
  "/api/auth/permissions": ["GET", "HEAD"],
  "/api/build-info": ["GET", "HEAD"],
  "/api/compliance": ["GET", "POST", "HEAD"],
  "/api/copilot/action/execute": ["POST"],
  "/api/copilot/chat": ["POST"],
  "/api/copilot/poc-stream": ["POST"],
  "/api/cron/fleet-compliance-audit": ["GET", "POST"],
  "/api/cron/meet-jobs": ["GET", "POST"],
  "/api/cron/process-email-queue": ["GET", "POST"],
  "/api/cron/tat-escalation": ["GET", "POST"],
  "/api/heartbeat": ["POST"],
  "/api/log-http-error": ["POST"],
  "/api/masters/scopes": ["GET", "HEAD"],
  "/api/mentions": ["POST"],
  "/api/migration/upload": ["POST"],
  "/api/modules": ["GET", "POST"],
  "/api/perf": ["GET", "HEAD"],
  "/api/requirements": ["GET", "HEAD"],
  "/api/revalidate-iam": ["GET", "HEAD"],
  "/api/search": ["GET", "HEAD"],
  "/api/session/conflict": ["POST"],
  "/api/session/register": ["POST"],
  "/api/sla": ["GET", "HEAD"],
  "/api/tickets": ["GET", "HEAD"],
  "/api/users": ["GET", "HEAD"],
  "/api/vehicle/create": ["POST"],
  "/api/vehicle/document-content": ["GET", "HEAD"],
  "/api/vehicle/documents": ["GET", "HEAD"],
  "/api/vehicle/documents/delete": ["POST"],
  "/api/vehicle/documents/update": ["POST"],
  "/api/vehicle/documents/upload": ["POST"],
  "/api/vehicle/image": ["GET", "HEAD"],
  "/api/vehicle/image/cutout": ["GET", "HEAD"],
  "/api/vehicle/lookup": ["GET", "HEAD"],
  "/api/vehicle/model-image": ["POST", "DELETE"],
  "/api/vehicle/model-image/auto": ["GET", "POST"],
  "/api/vehicle/model-image/candidates": ["GET", "HEAD"],
  "/api/vehicle/model-image/file": ["GET", "HEAD"],
  "/api/vehicle/model-image/preview": ["POST"],
  "/api/vehicle/model-images": ["GET", "HEAD"],
  "/api/webhooks/event-worker": ["POST"]
};

// R6: In-memory sliding window rate limiter per IP to block bot flood and brute-force
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastRateLimitCleanup = Date.now();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastRateLimitCleanup > 60_000) {
    lastRateLimitCleanup = now;
    for (const [k, v] of ipRateLimitMap.entries()) {
      if (now > v.resetAt) ipRateLimitMap.delete(k);
    }
  }

  const record = ipRateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";

  // Security Probe & Scanner Defense: Block malicious vulnerability scanners immediately
  const MALICIOUS_PROBE_REGEX = /^\/(\.env|\.git|\.aws|\.ssh|\.htaccess|\.htpasswd|\.DS_Store|wp-admin|wp-login|xmlrpc|phpmyadmin|cgi-bin|setup\.php|eval-stdin\.php|actuator|remote\/login)/i;
  if (MALICIOUS_PROBE_REGEX.test(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Block dangerous HTTP methods globally
  if (["TRACE", "TRACK", "CONNECT"].includes(method)) {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  // Rate limit /login POST (max 15 attempts / min per IP) to stop automated password brute-force
  if (pathname === "/login" && method === "POST") {
    if (isRateLimited(`login:${clientIp}`, 15, 60_000)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 1 minute before retrying." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  // Rate limit /api/session/conflict POST (max 30 requests / min per IP) to prevent user ID enumeration
  if (pathname === "/api/session/conflict" && method === "POST") {
    if (isRateLimited(`conflict:${clientIp}`, 30, 60_000)) {
      return NextResponse.json(
        { hasConflict: false, error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  // E3 Method Contract: Enforce 405 JSON on exact API routes
  if (API_METHOD_CONTRACT[pathname]) {
    const allowed = API_METHOD_CONTRACT[pathname];
    if (!allowed.includes(method)) {
      return NextResponse.json(
        { error: "Method Not Allowed", path: pathname, method, allowedMethods: allowed },
        { status: 405, headers: { Allow: allowed.join(", ") } }
      );
    }
  }

  // E3 Method Contract: Enforce 405 JSON on proxy attachment
  if (pathname.startsWith("/api/proxy-attachment/")) {
    const allowed = ["GET", "HEAD"];
    if (!allowed.includes(method)) {
      return NextResponse.json(
        { error: "Method Not Allowed", path: pathname, method, allowedMethods: allowed },
        { status: 405, headers: { Allow: allowed.join(", ") } }
      );
    }
  }

  // E3 Method Contract: Disallow destructive methods (PUT/DELETE/PATCH) on page routes
  const isApiOrSpecial = pathname.startsWith("/api") || pathname.startsWith("/auth") || pathname.startsWith("/dashboards") || pathname === "/sys-deploy-c7a8b9e1.php";
  if (!isApiOrSpecial && ["PUT", "DELETE", "PATCH"].includes(method)) {
    return NextResponse.json(
      { error: "Method Not Allowed", path: pathname, method, allowedMethods: ["GET", "HEAD", "POST"] },
      { status: 405, headers: { Allow: "GET, HEAD, POST" } }
    );
  }

  // R1: Skip Supabase getUser round trip for health endpoints, static assets, and RSC prefetch requests
  if (
    pathname === "/api/version" || 
    pathname === "/api/health" || 
    pathname === "/api/heartbeat" ||
    pathname === "/sys-deploy-c7a8b9e1.php"
  ) {
    return NextResponse.next();
  }

  // Skip round trip for static assets, robots, favicon
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ico|css|js|txt|xml|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Skip round trip for RSC prefetch requests (Next.js Link prefetch)
  const isPrefetch = request.headers.get("next-router-prefetch") === "1" ||
                     request.headers.get("purpose") === "prefetch" ||
                     request.headers.get("x-purpose") === "prefetch";
  if (isPrefetch) {
    return NextResponse.next();
  }

  // Dashboard engine calls and files: the /dashboards route checks the session itself (and refreshes
  // its cookies), so skip the extra Supabase round trip here.
  if (/^\/dashboards\/[^/]+\/(api|static|healthz)(\/|$)/.test(pathname)) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  const isAuthPage = pathname === "/login" || pathname === "/register";
  // Dashboard engine API calls (/dashboards/<key>/api/...) answer 401 JSON themselves.
  const isApiRoute = pathname.startsWith("/api") || /^\/dashboards\/[^/]+\/(api|static|healthz)(\/|$)/.test(pathname);
  const isAuthCallback = pathname.startsWith("/auth/");
  const isServerAction = Boolean(request.headers.get("next-action"));

  // If user is not authenticated and trying to access protected page routes, redirect to /login
  // Never redirect Server Action RPC calls to /login HTML, as that breaks the client action protocol with 307
  if (!user && !isAuthPage && !isApiRoute && !isAuthCallback && !isServerAction) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    const response = NextResponse.redirect(redirectUrl);
    
    // Copy refreshed Supabase cookies to avoid session desynchronization
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  }

  const activeModule = request.cookies.get("active_module")?.value;
  const hasActiveModule = Boolean(activeModule && ["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING", "DASHBOARDS", "CHANDAK_MEET", "ORG_BUDGET"].includes(activeModule));
  const moduleChosen = request.cookies.get(MODULE_CHOSEN_COOKIE)?.value === "1" || hasActiveModule;

  // If user is authenticated and trying to access login/register, redirect to active module or workspaces
  if (user && isAuthPage) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const activeModule = request.cookies.get("active_module")?.value;
    
    let defaultDest = "/";
    if (activeModule === "VEHICLE_DESK") defaultDest = "/vehicle";
    else if (activeModule === "DESIGN_TRACKING") defaultDest = "/design/matrix";
    else if (activeModule === "DASHBOARDS") defaultDest = "/dashboards";
    else if (activeModule === "CHANDAK_MEET") defaultDest = "/meet";
    else if (activeModule === "ORG_BUDGET") defaultDest = "/budget";

    // No module opened yet in this browser session: let the selection screen apply the default-module rule
    const target = !moduleChosen
      ? `/select-module${nextParam && nextParam !== "/" ? `?next=${encodeURIComponent(nextParam)}` : ""}`
      : nextParam && nextParam !== "/" ? nextParam : defaultDest;
    const redirectUrl = new URL(target, request.url);
    const response = NextResponse.redirect(redirectUrl);
    
    // Copy refreshed Supabase cookies to avoid session desynchronization
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  }

  // Module gate: a signed-in user who hasn't opened a module in this browser session (fresh sign-in,
  // or the browser was reopened with a remembered session) goes through the selection screen, which
  // opens their default module straight away or asks them to choose. Only full page loads are
  // redirected — never server actions, RSC/prefetch requests or API calls.
  const isDocumentGet =
    request.method === "GET" &&
    !request.headers.get("rsc") &&
    !request.headers.get("next-action") &&
    !request.headers.get("next-router-prefetch") &&
    !request.nextUrl.searchParams.has("_rsc") &&
    (request.headers.get("accept") || "").includes("text/html");
  if (user && !moduleChosen && isDocumentGet && !isApiRoute && !isAuthCallback && !GATE_EXEMPT.test(pathname + "/") && !/^\/dashboards\/[^/]+\/(api|static|healthz)(\/|$)/.test(pathname)) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = "/select-module";
    gateUrl.search = "";
    const here = pathname + request.nextUrl.search;
    if (here !== "/") gateUrl.searchParams.set("next", here);
    const response = NextResponse.redirect(gateUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  }

  // Dashboard engine static files (versioned CSS/JS, chart library) may be cached by the browser
  if (/^\/dashboards\/[^/]+\/static\//.test(pathname)) {
    return supabaseResponse;
  }

  // Prevent browser & CDN caching for all dynamic pages to ensure instant deploy reflection
  supabaseResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  supabaseResponse.headers.set("CDN-Cache-Control", "no-store");
  supabaseResponse.headers.set("Surrogate-Control", "no-store");
  supabaseResponse.headers.set("Pragma", "no-cache");
  supabaseResponse.headers.set("Expires", "0");

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
