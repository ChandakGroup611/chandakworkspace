import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { MODULE_CHOSEN_COOKIE } from "@/lib/module-gate";

// Pages that never go through the module gate (sign-in flow, onboarding, public share links, shared user settings).
const GATE_EXEMPT = /^\/(select-module|login|register|auth\/|api\/|profile|settings|share\/|verify-drawing\/|offline|_next\/)/;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  // If user is not authenticated and trying to access protected routes, redirect to /login
  if (!user && !isAuthPage && !isApiRoute && !isAuthCallback) {
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

  const moduleChosen = request.cookies.get(MODULE_CHOSEN_COOKIE)?.value === "1";

  // If user is authenticated and trying to access login/register, redirect to active module or workspaces
  if (user && isAuthPage) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const activeModule = request.cookies.get("active_module")?.value;
    
    let defaultDest = "/";
    if (activeModule === "VEHICLE_DESK") defaultDest = "/vehicle";
    else if (activeModule === "DESIGN_TRACKING") defaultDest = "/design/matrix";
    else if (activeModule === "DASHBOARDS") defaultDest = "/dashboards";
    else if (activeModule === "CHANDAK_MEET") defaultDest = "/meet";

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
