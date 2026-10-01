import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getUserAllowedModules, setActiveModule } from "@/lib/actions/module-switcher";

export const dynamic = "force-dynamic";

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

    const modulesData = await getUserAllowedModules(user?.id);
    return NextResponse.json(modulesData);
  } catch (err: any) {
    console.error("[API /api/modules] GET error:", err);
    return NextResponse.json(
      {
        modules: [
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
        ],
        defaultModule: null,
        activeModuleCode: "TASK_WORKFLOW",
        isAdmin: false,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { moduleCode, setAsDefault } = body || {};

    if (!moduleCode) {
      return NextResponse.json({ success: false, error: "Missing moduleCode" }, { status: 400 });
    }

    const res = await setActiveModule(moduleCode, Boolean(setAsDefault));
    
    // Set cookie on response
    const response = NextResponse.json(res);
    response.cookies.set("active_module", moduleCode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err: any) {
    console.error("[API /api/modules] POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
