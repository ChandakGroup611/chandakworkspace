import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

const DEFAULT_SUPABASE_URL = "https://tkovzymkubxtpcgynkgd.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY);

const DEFAULT_MODULES = [
  {
    id: "mod-task",
    code: "TASK_WORKFLOW",
    name: "Task & Workspace Management",
    description: "Core Operations, Workspace, Tasks & Ticketing",
    icon: "FolderKanban",
    route_path: "/",
    display_order: 1,
    is_active: true,
    is_default: true,
  },
  {
    id: "mod-vehicle",
    code: "VEHICLE_DESK",
    name: "Vehicle Management Desk",
    description: "Fleet, Trips & Maintenance Logistics",
    icon: "Car",
    route_path: "/vehicle",
    display_order: 2,
    is_active: true,
    is_default: false,
  },
  {
    id: "mod-design",
    code: "DESIGN_TRACKING",
    name: "Design & Drawing Tracking",
    description: "Architecture, Drawing Registers & Approvals",
    icon: "Compass",
    route_path: "/design/matrix",
    display_order: 3,
    is_active: true,
    is_default: false,
  },
  {
    id: "mod-dashboards",
    code: "DASHBOARDS",
    name: "Dashboards",
    description: "Department budget & expense dashboards on live IN4 data",
    icon: "LineChart",
    route_path: "/dashboards",
    display_order: 4,
    is_active: true,
    is_default: false,
  },
  {
    id: "mod-meet",
    code: "CHANDAK_MEET",
    name: "Chandak Meet",
    description: "Meetings, Agendas, Points with Carry-Forward, Decisions & Action Items",
    icon: "Video",
    route_path: "/meet",
    display_order: 5,
    is_active: true,
    is_default: false,
  },
];

export async function GET(request: NextRequest) {
  try {
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

    const { data: { user } } = await supabase.auth.getUser();
    const userIdParam = request.nextUrl.searchParams.get("userId");
    const targetUserId = user?.id || userIdParam;

    let userProfile = null;
    let isAdmin = false;
    let userAssignments: any[] = [];
    let hasDashboardPerms = false;

    if (targetUserId) {
      const { data: profile } = await supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, role_id, role:roles(code)")
        .eq("id", targetUserId)
        .maybeSingle();

      userProfile = profile;
      let rawRoleCode = (profile?.role as any)?.code || "";
      if (!rawRoleCode && profile?.role_id) {
        const { data: fallbackRole } = await supabaseAdmin
          .from("roles")
          .select("code")
          .eq("id", profile.role_id)
          .maybeSingle();
        if (fallbackRole?.code) {
          rawRoleCode = fallbackRole.code;
        }
      }
      const roleCode = String(rawRoleCode || "").toUpperCase();
      isAdmin = ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN", "ADMIN_ROLE"].includes(roleCode);

      const { data: assignments } = await supabaseAdmin
        .from("user_modules")
        .select("module_id, is_default, module:modules_master(code)")
        .eq("user_id", targetUserId);

      userAssignments = assignments || [];

      if (!isAdmin) {
        const { data: dashPerms } = await supabaseAdmin
          .from("user_permissions_snapshot")
          .select("permission_code")
          .eq("user_id", targetUserId)
          .like("permission_code", "DASH_%");
        hasDashboardPerms = Array.isArray(dashPerms) && dashPerms.length > 0;
      }
    }

    // Fetch active modules from modules_master
    const { data: fetchedModules } = await supabaseAdmin
      .from("modules_master")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    const allActive = fetchedModules && fetchedModules.length > 0 ? fetchedModules : DEFAULT_MODULES;
    const assignedModuleIds = new Set(userAssignments.map(a => a.module_id));
    const defaultAssignment = userAssignments.find(a => a.is_default);

    const ALLOWED_CORE_MODULE_CODES = new Set(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING", "DASHBOARDS", "CHANDAK_MEET"]);

    // Strict Authorization: Non-admins only see modules they are explicitly assigned
    const allowedModules = allActive
      .filter(m => {
        if (!ALLOWED_CORE_MODULE_CODES.has(m.code)) return false;
        if (isAdmin) return true;
        if (m.code === "DASHBOARDS" && hasDashboardPerms) return true;
        // Strict: Non-admin users MUST have an active entry in user_modules
        if (assignedModuleIds.size === 0) return m.code === "TASK_WORKFLOW";
        return assignedModuleIds.has(m.id) || assignedModuleIds.has(m.code);
      })
      .map(m => {
        let route = m.route_path;
        if (m.code === "TASK_WORKFLOW" && (!route || route === "/workspaces/tasks")) route = "/";
        if (m.code === "VEHICLE_DESK" && (!route || route === "/vehicle/dashboard")) route = "/vehicle";
        if (m.code === "DESIGN_TRACKING" && (!route || route === "/design/dashboard")) route = "/design/matrix";
        if (m.code === "DASHBOARDS" && !route) route = "/dashboards";
        if (m.code === "CHANDAK_MEET" && !route) route = "/meet";
        
        const isThisDefault = defaultAssignment 
          ? (defaultAssignment.module_id === m.id || defaultAssignment.module_id === m.code || (defaultAssignment.module && (defaultAssignment.module as any).code === m.code))
          : false;

        return {
          ...m,
          route_path: route,
          is_default: isThisDefault
        };
      });

    // Resolve explicit default module strictly from authorized modules
    const defaultModule = allowedModules.find(m => m.is_default) || null;
    const hasExplicitDefault = Boolean(defaultModule);

    const activeCookie = request.cookies.get("active_module")?.value;
    const isValidActive = activeCookie && allowedModules.some(m => m.code === activeCookie);
    const activeModuleCode = isValidActive ? activeCookie : (defaultModule?.code || allowedModules[0]?.code || "");

    return NextResponse.json({
      modules: allowedModules,
      defaultModule,
      hasExplicitDefault,
      activeModuleCode,
      isAdmin,
      userFullName: userProfile?.full_name,
      userEmail: userProfile?.email
    });
  } catch (err: any) {
    console.error("[API /api/modules] GET error:", err);
    return NextResponse.json({
      modules: DEFAULT_MODULES,
      defaultModule: DEFAULT_MODULES[0],
      hasExplicitDefault: false,
      activeModuleCode: "TASK_WORKFLOW",
      isAdmin: false
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { moduleCode, setAsDefault, userId: bodyUserId } = body || {};

    const targetCode = moduleCode || "TASK_WORKFLOW";

    const routeMap: Record<string, string> = {
      TASK_WORKFLOW: "/",
      VEHICLE_DESK: "/vehicle",
      DESIGN_TRACKING: "/design/matrix",
      DASHBOARDS: "/dashboards"
    };

    const redirectUrl = routeMap[targetCode] || "/";

    // If setAsDefault is requested, save to database
    if (setAsDefault) {
      try {
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
        const { data: { user } } = await supabase.auth.getUser();
        const effectiveUserId = user?.id || bodyUserId;
        if (effectiveUserId) {
          const { data: mod } = await supabaseAdmin
            .from("modules_master")
            .select("id")
            .eq("code", targetCode)
            .maybeSingle();

          if (mod?.id) {
            // Reset existing defaults for this user
            await supabaseAdmin
              .from("user_modules")
              .update({ is_default: false })
              .eq("user_id", effectiveUserId);

            // Check if record already exists
            const { data: existing } = await supabaseAdmin
              .from("user_modules")
              .select("id")
              .eq("user_id", effectiveUserId)
              .eq("module_id", mod.id)
              .maybeSingle();

            if (existing?.id) {
              await supabaseAdmin
                .from("user_modules")
                .update({ is_default: true })
                .eq("id", existing.id);
            } else {
              await supabaseAdmin
                .from("user_modules")
                .insert({
                  user_id: effectiveUserId,
                  module_id: mod.id,
                  is_default: true
                });
            }
          }
        }
      } catch (dbErr) {
        console.warn("[API /api/modules] DB default update error:", dbErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      moduleCode: targetCode
    });

    response.cookies.set("active_module", targetCode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
      httpOnly: false,
    });
    // a module has been opened in this browser session (see lib/module-gate.ts); no maxAge = session cookie
    response.cookies.set("module_chosen", "1", { path: "/", sameSite: "lax", httpOnly: false });

    return response;
  } catch (err: any) {
    console.error("[API /api/modules] POST error:", err);
    return NextResponse.json({
      success: true,
      redirectUrl: "/",
      moduleCode: "TASK_WORKFLOW"
    });
  }
}
