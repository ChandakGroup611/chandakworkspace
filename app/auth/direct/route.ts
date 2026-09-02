import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { verifyDirectAccessToken } from "@/lib/auth/direct-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectOrigin =
    forwardedHost && !isLocalEnv
      ? `${forwardedProto}://${forwardedHost}`
      : url.origin;

  if (!token) {
    return NextResponse.redirect(`${redirectOrigin}/login?error=missing-token`);
  }

  // 1. Verify token signature and expiration
  const { valid, payload, error: tokenErr } = verifyDirectAccessToken(token);

  if (!valid || !payload) {
    console.error("[DirectAuth] Token validation failed:", tokenErr);
    const errorParam = tokenErr === "Token expired" ? "token-expired" : "invalid-token";
    return NextResponse.redirect(`${redirectOrigin}/login?error=${errorParam}`);
  }

  const { userId, email, path: targetPath } = payload;
  const safeTargetPath = targetPath && targetPath.startsWith("/") ? targetPath : `/${targetPath || "workspaces"}`;

  try {
    // 2. Verify registered user in user_master
    const { data: userRecord, error: dbError } = await supabaseAdmin
      .from("user_master")
      .select("id, email, full_name, is_active, is_deleted")
      .eq("id", userId)
      .maybeSingle();

    if (dbError || !userRecord) {
      console.error("[DirectAuth] User not found in user_master:", userId, dbError);
      return NextResponse.redirect(`${redirectOrigin}/login?error=not-registered`);
    }

    if (userRecord.is_deleted || userRecord.is_active === false) {
      console.warn("[DirectAuth] User account disabled or deleted:", userId);
      return NextResponse.redirect(`${redirectOrigin}/login?error=account-disabled`);
    }

    // Prepare redirect response targeting the safe destination
    const destinationUrl = `${redirectOrigin}${safeTargetPath}`;
    let response = NextResponse.redirect(destinationUrl);

    // 3. Initialize Route-Handler compliant Supabase client that directly attaches cookies to the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie") || "";
            return cookieHeader
              .split(";")
              .map((c) => {
                const [name, ...val] = c.trim().split("=");
                return { name, value: val.join("=") };
              })
              .filter((c) => c.name);
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Check if current browser already has a valid session for this user
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser && currentUser.id === userRecord.id) {
      // Already logged in in this browser — return redirect directly
      return response;
    }

    // 4. Authenticate the user seamlessly via Supabase Admin Magiclink & verifyOtp
    const userEmail = userRecord.email || email;
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("[DirectAuth] Failed to generate admin magiclink:", linkErr);
      return NextResponse.redirect(
        `${redirectOrigin}/login?next=${encodeURIComponent(safeTargetPath)}`
      );
    }

    // Verify OTP on the server client — this triggers setAll to set all auth cookies on the response!
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyErr || !verifyData?.session) {
      console.error("[DirectAuth] Failed to verify OTP for session minting:", verifyErr);
      return NextResponse.redirect(
        `${redirectOrigin}/login?next=${encodeURIComponent(safeTargetPath)}`
      );
    }

    // 5. Return redirect response with session cookies attached
    return response;
  } catch (err: any) {
    console.error("[DirectAuth] Unexpected error during direct authentication:", err);
    return NextResponse.redirect(
      `${redirectOrigin}/login?next=${encodeURIComponent(safeTargetPath)}`
    );
  }
}
