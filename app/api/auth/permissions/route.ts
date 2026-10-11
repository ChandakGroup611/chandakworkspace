import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ profileData: null, secondaryRoles: [] }, { status: 200 });
    }

    const [profileRes, secondaryRolesRes] = await Promise.all([
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, profile_photo, is_deleted, created_at, role_id, role:roles(code, role_permissions(permissions(code)))")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("user_roles")
        .select("role:roles(code, role_permissions(permissions(code)))")
        .eq("user_id", user.id)
    ]);

    let profileData = profileRes.data;
    if (profileData && !profileData.role && profileData.role_id) {
      const { data: fallbackRole } = await supabaseAdmin
        .from("roles")
        .select("code, role_permissions(permissions(code))")
        .eq("id", profileData.role_id)
        .single();
      if (fallbackRole) {
        profileData.role = fallbackRole as any;
      }
    }

    return NextResponse.json({
      profileData: profileData || null,
      secondaryRoles: secondaryRolesRes.data || []
    });
  } catch (err: any) {
    console.error("[/api/auth/permissions] Error:", err);
    return NextResponse.json({ profileData: null, secondaryRoles: [] }, { status: 500 });
  }
}
