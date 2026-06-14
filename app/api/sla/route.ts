import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const canView = await hasPermission(user.id, "SLA_VIEW");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: SLA View access required" }, { status: 403 });
    }

    // 1. Fetch Tasks for User
    // User can be owner, assignee, or in task_participants
    const { data: partData } = await supabase.from("task_participants").select("task_id").eq("user_id", user.id);
    const partTaskIds = partData ? partData.map((p: any) => p.task_id) : [];

    let tasksQuery = supabase
      .from("workspace_tasks")
      .select(`
        id, subject, due_date, status:workflow_states!inner(code, is_closed)
      `)
      .eq("is_deleted", false);

    if (partTaskIds.length > 0) {
      tasksQuery = tasksQuery.or(`id.in.(${partTaskIds.join(',')}),assignee_id.eq.${user.id},creator_id.eq.${user.id}`);
    } else {
      tasksQuery = tasksQuery.or(`assignee_id.eq.${user.id},creator_id.eq.${user.id}`);
    }

    const { data: tasks } = await tasksQuery;

    // 2. Fetch Tickets for User
    const { data: tickets } = await supabase
      .from("tickets")
      .select(`
        id, code, title, due_date, status:workflow_states!inner(code, is_closed)
      `)
      .eq("is_deleted", false)
      .or(`assignee_id.eq.${user.id},creator_id.eq.${user.id}`);

    // 3. Fetch Requirements for User
    const { data: requirements } = await supabase
      .from("requirements")
      .select(`
        id, code, title, due_date, status:workflow_states!inner(code, is_closed)
      `)
      .eq("is_deleted", false)
      .or(`creator_id.eq.${user.id}`);

    // Process everything into a uniform SLATracker format
    const now = new Date();
    // Set upcoming threshold to the end of 2 days from now (23:59:59.999)
    const upcomingThreshold = new Date();
    upcomingThreshold.setDate(now.getDate() + 2);
    upcomingThreshold.setHours(23, 59, 59, 999);

    const slas: any[] = [];

    const processItem = (item: any, type: string, displayId: string, title: string) => {
      // Skip completed/closed items
      if (item.status && item.status.is_closed) return;
      if (!item.due_date) return; // Skip items without a due date

      const dueDate = new Date(item.due_date);
      let status: "Healthy" | "Warning" | "Breached" = "Healthy";
      let tier = "Level 1";

      if (dueDate < now) {
        status = "Breached";
        tier = "Level 4";
      } else if (dueDate <= upcomingThreshold) {
        status = "Warning";
        tier = "Level 2";
      }

      // Calculate elapsed/remaining
      const diffMs = dueDate.getTime() - now.getTime();
      const diffHours = Math.abs(diffMs) / (1000 * 60 * 60);
      let timeText = "";
      if (diffMs < 0) {
        timeText = `${Math.round(diffHours)}h overdue`;
      } else {
        timeText = `${Math.round(diffHours)}h remaining`;
      }

      slas.push({
        id: item.id,
        displayId: displayId,
        targetEntity: title,
        type: type,
        allocatedWindow: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(dueDate),
        elapsedTime: timeText,
        status: status,
        escalationTier: tier,
        actionRecipient: "Assigned User",
        dueDate: item.due_date
      });
    };

    (tasks || []).forEach(t => processItem(t, "Task Resolution", "TSK-" + t.id.substring(0,6).toUpperCase(), t.subject));
    (tickets || []).forEach(t => processItem(t, "Ticket Resolution", t.code, t.title));
    (requirements || []).forEach(r => processItem(r, "Requirement Completion", r.code, r.title));

    // Sort by due date ASC
    slas.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return NextResponse.json({ slas });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
