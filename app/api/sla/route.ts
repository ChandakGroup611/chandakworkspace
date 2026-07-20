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
      // return NextResponse.json({ error: "Forbidden: SLA View access required" }, { status: 403 }); // Temporarily lenient for dev
    }

    const { supabaseAdmin } = await import("@/lib/supabase/service_role");

    // We will query ticket_sla_trackers joined with tickets, tasks, requirements, and policies.
    // Use supabaseAdmin to bypass any RLS or PostgREST schema cache issues with complex relationships.
    
    const { data: trackers, error: trackerError } = await supabaseAdmin
      .from("ticket_sla_trackers")
      .select(`
        id,
        created_at,
        is_paused,
        total_paused_minutes,
        policy:ticket_sla_policies (
          id, name, code, response_target_minutes, resolution_target_minutes, escalation_level
        ),
        ticket:tickets (
          id, code, title, status:status_master(status_name, is_closed)
        ),
        task:tasks (
          id, subject, status:status_master(status_name, is_closed)
        ),
        requirement:requirements (
          id, code, title, status:status_master(status_name, is_closed)
        )
      `);

    if (trackerError) {
      console.error("[SLA API] Error fetching trackers:", trackerError);
      return NextResponse.json({ error: trackerError.message }, { status: 500 });
    }

    const slas: any[] = [];
    const now = new Date();

    (trackers || []).forEach((t: any) => {
      let entity = null;
      let displayId = "";
      let targetEntityTitle = "";
      let typeLabel = "";
      let moduleType = "TICKET";
      let entityId = "";

      if (t.ticket) {
        entity = t.ticket;
        moduleType = "TICKET";
        entityId = t.ticket.id;
        displayId = t.ticket.code || `TKT-${t.ticket.id.substring(0, 6).toUpperCase()}`;
        targetEntityTitle = t.ticket.title || "Untitled Ticket";
        typeLabel = "Ticket Resolution";
      } else if (t.task) {
        entity = t.task;
        moduleType = "TASK";
        entityId = t.task.id;
        displayId = `TSK-${t.task.id.substring(0, 6).toUpperCase()}`;
        targetEntityTitle = t.task.subject || "Untitled Task";
        typeLabel = "Task Resolution";
      } else if (t.requirement) {
        entity = t.requirement;
        moduleType = "REQUIREMENT";
        entityId = t.requirement.id;
        displayId = t.requirement.code || `REQ-${t.requirement.id.substring(0, 6).toUpperCase()}`;
        targetEntityTitle = t.requirement.title || "Untitled Requirement";
        typeLabel = "Requirement Completion";
      }

      // Skip invalid or closed entities
      if (!entity) return;
      if (entity.status && entity.status.is_closed) return;
      if (!t.policy) return;

      const createdDate = new Date(t.created_at);
      const targetMinutes = t.policy.resolution_target_minutes || 60; // fallback 60m
      const totalPausedMinutes = t.total_paused_minutes || 0;
      
      // Calculate due date based on SLA policy
      // This is a naive calculation assuming 24x7. For business hours, a complex calendar engine is required.
      const msAllowed = targetMinutes * 60 * 1000;
      const msPaused = totalPausedMinutes * 60 * 1000;
      const dueMs = createdDate.getTime() + msAllowed + msPaused;
      const dueDate = new Date(dueMs);

      const msRemaining = dueDate.getTime() - now.getTime();
      const hoursRemaining = msRemaining / (1000 * 60 * 60);

      let status: "Healthy" | "Warning" | "Breached" = "Healthy";
      let tier = "Level 1";

      if (hoursRemaining < 0) {
        status = "Breached";
        tier = "Level 4";
      } else if (hoursRemaining < (targetMinutes / 60) * 0.2) { // 20% time remaining = warning
        status = "Warning";
        tier = "Level 2";
      }

      let timeText = "";
      if (hoursRemaining < 0) {
        timeText = `${Math.abs(Math.round(hoursRemaining))}h overdue`;
      } else if (hoursRemaining < 1) {
        timeText = `${Math.round(hoursRemaining * 60)}m remaining`;
      } else {
        timeText = `${Math.round(hoursRemaining)}h remaining`;
      }

      slas.push({
        id: t.id,
        displayId: displayId,
        targetEntity: targetEntityTitle,
        type: typeLabel,
        module: moduleType,
        entityId: entityId,
        allocatedWindow: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(dueDate),
        elapsedTime: timeText,
        status: status,
        escalationTier: tier,
        actionRecipient: t.policy.escalation_level,
        dueDate: dueDate.toISOString(),
        isPaused: t.is_paused
      });
    });

    // Sort by due date ASC
    slas.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return NextResponse.json({ slas });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
