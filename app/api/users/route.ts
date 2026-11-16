import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getVisibleUsers, checkIsSuperAdmin } from "@/lib/repositories/users";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    let user: any = null;

    // 0. Try Authorization: Bearer <token> header from client-side session
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) {
        try {
          const { data: tokenUserData, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
          if (tokenUserData?.user && !tokenErr) {
            user = tokenUserData.user;
          }
        } catch (e) {}
      }
    }

    // 1. Try standard Next.js cookie store
    try {
      const cookieStore = await cookies();
      const supabaseServer = createClient(cookieStore);
      const { data } = await supabaseServer.auth.getUser();
      user = data?.user || null;
      if (!user) {
        const { data: sessionData } = await supabaseServer.auth.getSession();
        user = sessionData?.session?.user || null;
      }
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
      if (!user) {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user || null;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated. Please log in first." }, { status: 401 });
    }

    const isSuperAdmin = await checkIsSuperAdmin(user.id);
    const canManageUsers = isSuperAdmin || await hasPermission(user.id, "USERS_MANAGE");
    const userRights = {
      canView: isSuperAdmin || canManageUsers || await hasPermission(user.id, "USERS_VIEW") || await hasPermission(user.id, "USERS_CREATE") || await hasPermission(user.id, "USERS_UPDATE") || await hasPermission(user.id, "USERS_DELETE"),
      canCreate: canManageUsers || await hasPermission(user.id, "USERS_CREATE"),
      canUpdate: canManageUsers || await hasPermission(user.id, "USERS_UPDATE"),
      canDelete: canManageUsers || await hasPermission(user.id, "USERS_DELETE"),
    };

    const [users, [deptRes, desigRes, roleRes, astRes, modRes, modRolesRes]] = await Promise.all([
      getVisibleUsers(user.id, isSuperAdmin),
      Promise.all([
        supabaseAdmin.from("departments").select("id, code, name").eq("is_deleted", false),
        supabaseAdmin.from("designations").select("id, code, name, department_id").eq("is_deleted", false),
        supabaseAdmin.from("roles").select("id, code, name").eq("is_deleted", false),
        supabaseAdmin.from("assets").select("id, code, name, asset_tag, assigned_user_id").eq("is_deleted", false),
        supabaseAdmin.from("modules_master").select("id, code, name, description, icon, display_order").eq("is_active", true).order("display_order", { ascending: true }),
        supabaseAdmin.from("module_roles").select("module_code, role_code, name, description, permissions").order("role_code", { ascending: true })
      ])
    ]);

    return NextResponse.json({
      users: users || [],
      authUser: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      isSuperAdmin,
      userRights,
      departments: deptRes.data || [],
      designations: desigRes.data || [],
      roles: roleRes.data || [],
      assets: astRes.data || [],
      modules: modRes.data || [],
      moduleRoles: modRolesRes.data || []
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache"
      }
    });

  } catch (error: any) {
    console.error("[api/users] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
