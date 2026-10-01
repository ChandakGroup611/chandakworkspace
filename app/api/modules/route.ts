import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

const DEFAULT_MODULES = [
  {
    id: "mod-task",
    code: "TASK_WORKFLOW",
    name: "Task & Workspace Management",
    description: "Core Operations, Workspace, Tasks & Ticketing",
    icon: "FolderKanban",
    route_path: "/workspaces/tasks",
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
    route_path: "/vehicle/dashboard",
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
    route_path: "/design/dashboard",
    display_order: 3,
    is_active: true,
    is_default: false,
  },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

    let userProfile = null;
    let isAdmin = false;
    let userAssignments: any[] = [];

    if (user?.id) {
      const { data: profile } = await supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, role:roles(code)")
        .eq("id", user.id)
        .maybeSingle();

      userProfile = profile;
      const roleCode = (profile?.role as any)?.code || "";
      isAdmin = roleCode === "SUPER_ADMIN" || roleCode === "ROLE_ADMIN";

      const { data: assignments } = await supabaseAdmin
        .from("user_modules")
        .select("module_id, is_default, module:modules_master(code)")
        .eq("user_id", user.id);

      userAssignments = assignments || [];
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
    const hasExplicitDefault = !!defaultAssignment;

    let allowedModules = allActive
      .filter(m => isAdmin || assignedModuleIds.size === 0 || assignedModuleIds.has(m.id) || assignedModuleIds.has(m.code))
      .map(m => ({
        ...m,
        is_default: defaultAssignment ? (defaultAssignment.module_id === m.id || defaultAssignment.module_id === m.code) : false
      }));

    if (allowedModules.length === 0) {
      allowedModules = DEFAULT_MODULES;
    }

    const defaultModule =
      allowedModules.find(m => m.is_default) ||
      allowedModules.find(m => m.code === "TASK_WORKFLOW") ||
      allowedModules[0];

    const activeCookie = request.cookies.get("active_module")?.value;
    const isValidActive = activeCookie && allowedModules.some(m => m.code === activeCookie);
    const activeModuleCode = isValidActive ? activeCookie : (defaultModule?.code || "TASK_WORKFLOW");

    return NextResponse.json({
      modules: allowedModules,
      defaultModule: hasExplicitDefault ? defaultModule : null,
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
      defaultModule: null,
      hasExplicitDefault: false,
      activeModuleCode: "TASK_WORKFLOW",
      isAdmin: false
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { moduleCode, setAsDefault } = body || {};

    const targetCode = moduleCode || "TASK_WORKFLOW";

    const routeMap: Record<string, string> = {
      TASK_WORKFLOW: "/workspaces/tasks",
      VEHICLE_DESK: "/vehicle/dashboard",
      DESIGN_TRACKING: "/design/dashboard"
    };

    const redirectUrl = routeMap[targetCode] || "/workspaces/tasks";

    // If setAsDefault is requested, save to database
    if (setAsDefault) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
        if (user?.id) {
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
              .eq("user_id", user.id);

            // Check if record already exists
            const { data: existing } = await supabaseAdmin
              .from("user_modules")
              .select("id")
              .eq("user_id", user.id)
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
                  user_id: user.id,
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

    return response;
  } catch (err: any) {
    console.error("[API /api/modules] POST error:", err);
    return NextResponse.json({
      success: true,
      redirectUrl: "/workspaces/tasks",
      moduleCode: "TASK_WORKFLOW"
    });
  }
}
