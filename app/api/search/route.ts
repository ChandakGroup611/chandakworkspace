import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ results: [] }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const activeModule = (searchParams.get("module") || "").toUpperCase();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const sanitizedTerm = `%${query.replace(/[%_]/g, "\\$&")}%`;

    // Perform scoped search across Tickets, Tasks, Requirements, Vehicles, Meetings, and Budgets
    const [ticketsRes, tasksRes, reqsRes, vehiclesRes, meetingsRes, budgetsRes] = await Promise.all([
      supabaseAdmin
        .from("tickets")
        // status / priority live in status_master / priority_master (there are no status / priority columns)
        .select("id, code, title, status:status_master(status_name), priority:priority_master(priority_name), department:departments(name)")
        .or(`title.ilike.${sanitizedTerm},code.ilike.${sanitizedTerm}`)
        .eq("is_deleted", false)
        .limit(6),
      supabaseAdmin
        .from("tasks")
        // tasks use "subject" (not title); workspaces use workspace_name
        .select("id, code, subject, status:status_master(status_name), priority:priority_master(priority_name), workspace:workspaces(workspace_name)")
        .or(`subject.ilike.${sanitizedTerm},code.ilike.${sanitizedTerm}`)
        .eq("is_deleted", false)
        .limit(6),
      supabaseAdmin
        .from("requirements")
        .select("id, code, title, status:status_master(status_name), priority:priority_master!requirements_priority_id_fkey(priority_name)")
        .or(`title.ilike.${sanitizedTerm},code.ilike.${sanitizedTerm}`)
        .eq("is_deleted", false)
        .limit(6),
      supabaseAdmin
        .from("vehicles")
        .select("id, registration_number, make, model, variant, status, vin_chassis_number, registered_owner")
        .or(`registration_number.ilike.${sanitizedTerm},make.ilike.${sanitizedTerm},model.ilike.${sanitizedTerm},vin_chassis_number.ilike.${sanitizedTerm}`)
        .limit(6),
      supabaseAdmin
        .from("meet_meetings")
        .select("id, title")
        .ilike("title", sanitizedTerm)
        .limit(6),
      supabaseAdmin
        .from("budget_projects")
        .select("id, name, code")
        .or(`name.ilike.${sanitizedTerm},code.ilike.${sanitizedTerm}`)
        .limit(6),
    ]);

    const results: any[] = [];

    // 1. Vehicles
    if (vehiclesRes.data) {
      vehiclesRes.data.forEach((v: any) => {
        results.push({
          type: "VEHICLE",
          module: "VEHICLE",
          code: v.registration_number,
          title: `${v.make || ""} ${v.model || ""} ${v.variant ? `(${v.variant})` : ""}`.trim() || v.registration_number,
          status: v.status || "Active",
          metadata: {
            owner: v.registered_owner || undefined,
            vin: v.vin_chassis_number ? `VIN: ${v.vin_chassis_number.slice(-6)}` : undefined,
          },
          url: `/vehicle`,
        });
      });
    }

    // 2. Meetings
    if (meetingsRes.data) {
      meetingsRes.data.forEach((m: any) => {
        results.push({
          type: "MEETING",
          module: "MEET",
          code: "MEET",
          title: m.title,
          status: "Scheduled",
          metadata: {
            id: m.id.slice(0, 8),
          },
          url: `/meet/meetings/${m.id}`,
        });
      });
    }

    // 3. Organization Budgets
    if (budgetsRes.data) {
      budgetsRes.data.forEach((b: any) => {
        results.push({
          type: "BUDGET",
          module: "BUDGET",
          code: b.code || "BUDGET",
          title: b.name,
          status: "Active",
          metadata: {
            project: b.code,
          },
          url: `/budget/${b.id}/overview`,
        });
      });
    }

    // 4. Tickets
    if (ticketsRes.data) {
      ticketsRes.data.forEach((t: any) => {
        results.push({
          type: "TICKET",
          module: "TICKETS",
          code: t.code || `TCK-${t.id.slice(0, 6)}`,
          title: t.title,
          status: t.status?.status_name,
          metadata: {
            dept: t.department?.name,
            priority: t.priority?.priority_name,
          },
          url: `/tickets/${t.id}`,
        });
      });
    }

    // 5. Tasks
    if (tasksRes.data) {
      tasksRes.data.forEach((t: any) => {
        results.push({
          type: "TASK",
          module: "TASKS",
          code: t.code || `TSK-${t.id.slice(0, 6)}`,
          title: t.subject,
          status: t.status?.status_name,
          metadata: {
            workspace: t.workspace?.workspace_name,
            priority: t.priority?.priority_name,
          },
          url: `/tasks/${t.id}`,
        });
      });
    }

    // 6. Requirements
    if (reqsRes.data) {
      reqsRes.data.forEach((r: any) => {
        results.push({
          type: "REQUIREMENT",
          module: "REQUIREMENTS",
          code: r.code || `REQ-${r.id.slice(0, 6)}`,
          title: r.title,
          status: r.status?.status_name,
          metadata: {
            priority: r.priority?.priority_name,
          },
          url: `/requirements/${r.id}`,
        });
      });
    }

    // Sort results: prioritize items belonging to activeModule
    results.sort((a, b) => {
      const aMatch = activeModule && a.module === activeModule ? 1 : 0;
      const bMatch = activeModule && b.module === activeModule ? 1 : 0;
      return bMatch - aMatch;
    });

    return NextResponse.json({ results: results.slice(0, 20) });
  } catch (error: any) {
    console.error("[SearchRoute] Error executing search:", error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
