import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let user: any = null;

    // 1. Try standard Next.js cookie store
    try {
      const cookieStore = await cookies();
      const supabaseServer = createClient(cookieStore);
      const { data } = await supabaseServer.auth.getUser();
      user = data?.user || null;
    } catch (e) {
      // Fallback to request-based client
    }

    // 2. Fallback to request headers/cookies if server client did not resolve user
    if (!user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tkovzymkubxtpcgynkgd.supabase.co";
      const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68");

      const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {},
          },
        }
      );

      const { data: { user: reqUser } } = await supabase.auth.getUser();
      user = reqUser;
    }

    if (!user) {
      return NextResponse.json({ profileData: null, secondaryRoles: [], snapshotPerms: [], isSuperAdmin: false }, { status: 200 });
    }

    const [profileRes, secondaryRolesRes, snapshotRes] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, profile_photo, is_deleted, created_at, role_id, role:roles(code, role_permissions(permissions(code)))")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("role:roles(code, role_permissions(permissions(code)))")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("user_permissions_snapshot")
        .select("permission_code")
        .eq("user_id", user.id)
    ]);

    let profileData = profileRes.data;
    if (profileData && !profileData.role && profileData.role_id) {
      const { data: fallbackRole } = await supabaseAdmin
        .from("roles")
        .select("code, role_permissions(permissions(code))")
        .eq("id", profileData.role_id)
        .maybeSingle();
      if (fallbackRole) {
        profileData.role = fallbackRole as any;
      }
    }

    const snapshotPerms = snapshotRes.data?.map(s => s.permission_code) || [];
    
    // Check if role is Super Admin
    const primaryCode = Array.isArray(profileData?.role) ? (profileData?.role[0] as any)?.code : (profileData?.role as any)?.code;
    const secondaryCodes = (secondaryRolesRes.data || []).map((r: any) => {
      return Array.isArray(r.role) ? r.role[0]?.code : r.role?.code;
    }).filter(Boolean);

    const allCodes = [primaryCode, ...secondaryCodes].filter(Boolean).map(c => c.toUpperCase());
    const isSuperAdmin = allCodes.some(c => 
      c === "SUPER_ADMIN" || c === "ROLE_SUPER_ADMIN"
    ) || snapshotPerms.includes("SUPER_ADMIN") || snapshotPerms.includes("SUPER_ADMIN_ACCESS");

    const [umaRes, legacyRes] = await Promise.all([
      supabaseAdmin
        .from("user_module_access")
        .select("dashboard_key")
        .eq("user_id", user.id)
        .eq("module_code", "DASHBOARDS")
        .not("dashboard_key", "is", null),
      supabaseAdmin
        .from("dashboard_user_access")
        .select("dashboard_key")
        .eq("user_id", user.id)
        .not("dashboard_key", "is", null)
    ]);

    const tickedDashboards = Array.from(new Set([
      ...(umaRes.data || []).map((d: any) => d.dashboard_key),
      ...(legacyRes.data || []).map((d: any) => d.dashboard_key)
    ].filter(Boolean)));

    return NextResponse.json({
      profileData: profileData || null,
      secondaryRoles: secondaryRolesRes.data || [],
      snapshotPerms,
      isSuperAdmin,
      tickedDashboards
    });
  } catch (err: any) {
    console.error("[/api/auth/permissions] Error:", err);
    return NextResponse.json({ profileData: null, secondaryRoles: [], snapshotPerms: [], isSuperAdmin: false }, { status: 500 });
  }
}
