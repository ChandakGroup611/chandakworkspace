import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isApiRoute = pathname.startsWith("/api");
  const isAuthCallback = pathname.startsWith("/auth/callback");

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

  // If user is authenticated and trying to access login/register, redirect to home page
  if (user && isAuthPage) {
    const nextParam = request.nextUrl.searchParams.get("next") || "/";
    const redirectUrl = new URL(nextParam, request.url);
    const response = NextResponse.redirect(redirectUrl);
    
    // Copy refreshed Supabase cookies to avoid session desynchronization
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
    return response;
  }

  // Prevent browser caching for protected routes to avoid "Back Button" ghost sessions
  if (!isAuthPage && !isApiRoute && !isAuthCallback) {
    supabaseResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    supabaseResponse.headers.set("Pragma", "no-cache");
    supabaseResponse.headers.set("Expires", "0");
  }

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
