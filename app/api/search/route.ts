import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ results: [] }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const sanitizedTerm = `%${query.replace(/[%_]/g, "\\$&")}%`;

    // Perform scoped search across Tickets, Tasks, and Requirements
    const [ticketsRes, tasksRes, reqsRes] = await Promise.all([
      supabaseAdmin
        .from("tickets")
        .select("id, ticket_number, title, status, priority, department:departments(name)")
        .or(`title.ilike.${sanitizedTerm},ticket_number.ilike.${sanitizedTerm}`)
        .limit(5),
      supabaseAdmin
        .from("tasks")
        .select("id, task_number, title, status, priority, workspace:workspaces(title)")
        .or(`title.ilike.${sanitizedTerm},task_number.ilike.${sanitizedTerm}`)
        .limit(5),
      supabaseAdmin
        .from("requirements")
        .select("id, requirement_number, title, status, priority")
        .or(`title.ilike.${sanitizedTerm},requirement_number.ilike.${sanitizedTerm}`)
        .limit(5)
    ]);

    const results: any[] = [];

    if (ticketsRes.data) {
      ticketsRes.data.forEach((t: any) => {
        results.push({
          type: "TICKET",
          code: t.ticket_number || `TCK-${t.id.slice(0, 6)}`,
          title: t.title,
          status: t.status,
          metadata: {
            dept: t.department?.name,
            priority: t.priority
          },
          url: `/tickets/${t.id}`
        });
      });
    }

    if (tasksRes.data) {
      tasksRes.data.forEach((t: any) => {
        results.push({
          type: "TASK",
          code: t.task_number || `TSK-${t.id.slice(0, 6)}`,
          title: t.title,
          status: t.status,
          metadata: {
            workspace: t.workspace?.title,
            priority: t.priority
          },
          url: `/tasks/${t.id}`
        });
      });
    }

    if (reqsRes.data) {
      reqsRes.data.forEach((r: any) => {
        results.push({
          type: "REQUIREMENT",
          code: r.requirement_number || `REQ-${r.id.slice(0, 6)}`,
          title: r.title,
          status: r.status,
          metadata: {
            priority: r.priority
          },
          url: `/requirements/${r.id}`
        });
      });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[SearchRoute] Error executing search:", error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
