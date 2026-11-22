import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service_role';
import { logActivityEvent } from '@/lib/actions/tasks';
import { queueBusinessEvent } from '@/lib/actions/notification-engine';
import { todayIST, toISTDateString, countWorkingDaysIST } from '@/lib/utils/date-utils';

export const dynamic = 'force-dynamic';

function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: missing or invalid authorization header' },
      { status: 401 }
    );
  }

  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }

    // 1. Load active statutory holidays from sla_holidays
    const { data: holidayRows } = await supabaseAdmin
      .from('sla_holidays')
      .select('holiday_date');

    const holidaySet = new Set<string>((holidayRows || []).map((h: any) => h.holiday_date));
    const today = todayIST();

    let escalatedTickets = 0;
    let warnedTickets = 0;
    let escalatedTasks = 0;
    let warnedTasks = 0;
    let escalatedReqs = 0;
    let warnedReqs = 0;

    // =========================================================================
    // 2. TICKETS: Check TAT Escalation (Decision D9)
    // =========================================================================
    const { data: rawTickets } = await supabaseAdmin
      .from('tickets')
      .select(`
        id, code, title, created_at, status_id, department_id, assignee_id, creator_id,
        status:status_master(status_name, is_closed, is_terminal),
        priority:priority_master(priority_name, max_sla_hours, warning_sla_hours),
        department:departments(id, name, manager_id)
      `)
      .eq('is_deleted', false)
      .limit(500);

    const openTickets = (rawTickets || []).filter((t: any) => {
      const s = t.status as any;
      return !s?.is_closed && !s?.is_terminal;
    });

    for (const ticket of openTickets) {
      const startIST = toISTDateString(ticket.created_at) || today;
      const workingDaysElapsed = countWorkingDaysIST(startIST, today, holidaySet);

      // Default SLA for tickets: derived from priority max_sla_hours (e.g. 48h -> 2 working days), min 1
      const maxHours = (ticket.priority as any)?.max_sla_hours || 48;
      const targetWorkingDays = Math.max(1, Math.round(maxHours / 24));
      const ratio = workingDaysElapsed / targetWorkingDays;

      if (ratio >= 1.0) {
        // Red Breach (100% TAT elapsed)
        escalatedTickets++;

        await supabaseAdmin.from('tickets').update({
          tat_status: 'Breached',
          updated_at: new Date().toISOString()
        }).eq('id', ticket.id);

        // Escalate to department head (Decision D9)
        const deptHeadId = (ticket.department as any)?.manager_id;
        if (deptHeadId) {
          const alertPayload = {
            recipient_id: deptHeadId,
            payload: {
              title: `SLA Breach Escalation: Ticket ${ticket.code || ticket.id}`,
              message: `Ticket "${ticket.title}" in department ${(ticket.department as any)?.name || 'General'} has breached SLA (${workingDaysElapsed}/${targetWorkingDays} working days elapsed).`,
              type: 'TICKET_SLA_BREACH',
              severity: 'CRITICAL',
              entity_id: ticket.id,
              ticket_id: ticket.id,
              code: ticket.code
            },
            is_read: false
          };
          await supabaseAdmin.from('notification_queue').insert([alertPayload]);
        }

        // Trigger notification event
        queueBusinessEvent('Ticket', 'SLA Breached', {
          entity_id: ticket.id,
          triggering_user_id: ticket.creator_id,
          ticket_code: ticket.code,
          ticket_title: ticket.title,
          status_name: (ticket.status as any)?.status_name || 'Open',
          remarks: `SLA Breached: ${workingDaysElapsed}/${targetWorkingDays} working days elapsed.`
        }).catch(() => {});
      } else if (ratio >= 0.75) {
        // Amber Warning (75% TAT elapsed)
        warnedTickets++;
        await supabaseAdmin.from('tickets').update({
          tat_status: 'Warning',
          updated_at: new Date().toISOString()
        }).eq('id', ticket.id);
      }
    }

    // =========================================================================
    // 3. TASKS: Check TAT Escalation (Decision D9)
    // =========================================================================
    const { data: rawTasks } = await supabaseAdmin
      .from('tasks')
      .select(`
        id, task_code, subject, created_at, status_id, workspace_id, assigned_to, created_by,
        status:status_master!tasks_status_id_fkey(status_name, is_closed, is_terminal),
        priority:priority_master!tasks_priority_id_fkey(priority_name, max_sla_hours, warning_sla_hours),
        workspace:workspaces(id, workspace_name, workspace_owner_id)
      `)
      .eq('is_deleted', false)
      .limit(500);

    const openTasks = (rawTasks || []).filter((t: any) => {
      const s = t.status as any;
      return !s?.is_closed && !s?.is_terminal;
    });

    for (const task of openTasks) {
      const startIST = toISTDateString(task.created_at) || today;
      const workingDaysElapsed = countWorkingDaysIST(startIST, today, holidaySet);

      const maxHours = (task.priority as any)?.max_sla_hours || 72;
      const targetWorkingDays = Math.max(1, Math.round(maxHours / 24));
      const ratio = workingDaysElapsed / targetWorkingDays;

      if (ratio >= 1.0) {
        // Red Breach (100% TAT elapsed)
        escalatedTasks++;
        await supabaseAdmin.from('tasks').update({
          tat_status: 'Breached',
          updated_at: new Date().toISOString()
        }).eq('id', task.id);

        // Escalate to workspace owner (Decision D9)
        const wsOwnerId = (task.workspace as any)?.workspace_owner_id;
        if (wsOwnerId) {
          const alertPayload = {
            recipient_id: wsOwnerId,
            payload: {
              title: `Task SLA Breach Escalation: ${task.task_code || task.subject}`,
              message: `Task "${task.subject}" in workspace ${(task.workspace as any)?.workspace_name || 'General'} has breached SLA (${workingDaysElapsed}/${targetWorkingDays} working days elapsed).`,
              type: 'TASK_SLA_BREACH',
              severity: 'CRITICAL',
              entity_id: task.id,
              task_id: task.id
            },
            is_read: false
          };
          await supabaseAdmin.from('notification_queue').insert([alertPayload]);
        }

        queueBusinessEvent('Task', 'SLA Breached', {
          entity_id: task.id,
          triggering_user_id: task.created_by,
          task_code: task.task_code,
          task_name: task.subject,
          status_name: (task.status as any)?.status_name || 'Open',
          remarks: `SLA Breached: ${workingDaysElapsed}/${targetWorkingDays} working days elapsed.`
        }).catch(() => {});
      } else if (ratio >= 0.75) {
        // Amber Warning (75% TAT elapsed)
        warnedTasks++;
        await supabaseAdmin.from('tasks').update({
          tat_status: 'Warning',
          updated_at: new Date().toISOString()
        }).eq('id', task.id);
      }
    }

    // =========================================================================
    // 4. REQUIREMENTS: Check TAT Escalation (Decision D9)
    // =========================================================================
    const { data: rawReqs } = await supabaseAdmin
      .from('requirements')
      .select(`
        id, code, title, created_at, status_id, current_assignee_id, department_id, creator_id,
        status:status_master!status_id(status_name, is_closed),
        department:departments!requirements_department_id_fkey(id, name, manager_id)
      `)
      .neq('approval_status', 'Approved')
      .eq('is_deleted', false)
      .limit(500);

    const openReqs = (rawReqs || []).filter((r: any) => {
      const s = r.status as any;
      return !s?.is_closed && !s?.status_name?.toLowerCase().includes('close');
    });

    for (const req of openReqs) {
      const startIST = toISTDateString(req.created_at) || today;
      const workingDaysElapsed = countWorkingDaysIST(startIST, today, holidaySet);
      const targetWorkingDays = 7; // Standard 7 working days requirement SLA
      const ratio = workingDaysElapsed / targetWorkingDays;

      if (ratio >= 1.0) {
        escalatedReqs++;
        const overdueDays = workingDaysElapsed - targetWorkingDays;

        await supabaseAdmin.from('requirements').update({
          tat_status: 'Overdue',
          overdue_days: overdueDays,
          updated_at: new Date().toISOString()
        }).eq('id', req.id);

        await logActivityEvent(
          'REQUIREMENT',
          req.id,
          'ESCALATION_TRIGGERED',
          { tat_status: 'Pending' },
          { tat_status: 'Overdue', overdue_days: overdueDays, working_days_elapsed: workingDaysElapsed },
          'SYSTEM'
        );

        // Escalate to department head
        const deptHeadId = (req.department as any)?.manager_id;
        if (deptHeadId) {
          await supabaseAdmin.from('notification_queue').insert([{
            recipient_id: deptHeadId,
            payload: {
              title: `Requirement SLA Breach: ${req.code || req.title}`,
              message: `Requirement "${req.title}" has breached SLA (${workingDaysElapsed}/${targetWorkingDays} working days elapsed).`,
              type: 'REQUIREMENT_SLA_BREACH',
              severity: 'CRITICAL',
              entity_id: req.id
            },
            is_read: false
          }]);
        }
      } else if (ratio >= 0.75) {
        warnedReqs++;
        await supabaseAdmin.from('requirements').update({
          tat_status: 'Warning',
          updated_at: new Date().toISOString()
        }).eq('id', req.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'TAT Escalation Engine completed successfully.',
      metrics: {
        tickets: { processed: openTickets.length, warned: warnedTickets, escalated: escalatedTickets },
        tasks: { processed: openTasks.length, warned: warnedTasks, escalated: escalatedTasks },
        requirements: { processed: openReqs.length, warned: warnedReqs, escalated: escalatedReqs }
      }
    });
  } catch (err: any) {
    console.error("TAT Escalation Cron Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
