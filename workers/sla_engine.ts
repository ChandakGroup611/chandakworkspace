import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Enterprise SLA Timer Engine
 * Implements the background Cron worker for SLA breach and warning notifications.
 * Runs on a scheduler to process Tickets and Tasks dynamically based on priority_master.
 */
export async function processSLATimers() {
  console.log("[SLA Engine] Starting SLA Timer Check...");

  // Process Tasks
  await processModuleSLA('tasks');
  // Process Tickets
  await processModuleSLA('tickets');
  // Process Requirements
  await processModuleSLA('requirements');

  console.log(`[SLA Engine] Completed SLA check.`);
}

async function processModuleSLA(moduleName: 'tasks' | 'tickets' | 'requirements') {
  const selectStr = moduleName === 'tickets' 
    ? 'id, created_at, status_id, priority_id, code, queue_owner_id, assignee_id, priority:priority_master(max_sla_hours, warning_sla_hours, sla_start_from)'
    : moduleName === 'requirements'
    ? 'id, created_at, status_id, priority_id, title, assigned_analyst_id, created_by, priority:priority_master(max_sla_hours, warning_sla_hours, sla_start_from)'
    : 'id, created_at, status_id, priority_id, subject, created_by, priority:priority_master(max_sla_hours, warning_sla_hours, sla_start_from)';

  const { data, error } = await supabaseAdmin
    .from(moduleName)
    .select(selectStr)
    .eq('is_deleted', false);

  if (error || !data) {
    console.error(`[SLA Engine] Error fetching active ${moduleName}:`, error);
    return;
  }

  const activeRecords = data as any[];

  const now = new Date().getTime();
  const notifications: any[] = [];

  for (const record of activeRecords) {
    if (!record.priority || !record.priority.max_sla_hours) continue;

    const slaHours = record.priority.max_sla_hours;
    const warningHours = record.priority.warning_sla_hours || (slaHours * 0.8);
    
    // Determine start time based on sla_start_from (FROM_CREATION or FROM_ASSIGNMENT)
    // Assuming FROM_CREATION for now unless assignment timestamp is tracked differently
    const startTime = new Date(record.created_at).getTime(); 
    
    const hoursElapsed = (now - startTime) / (1000 * 60 * 60);

  let ownerId = moduleName === 'tickets' 
    ? (record.assignee_id || record.queue_owner_id) 
    : (moduleName === 'requirements' ? record.assigned_analyst_id : record.created_by);

  // Try fetching assignees for tasks if needed
    if (moduleName === 'tasks') {
      const { data: assignees } = await supabaseAdmin
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', record.id)
        .eq('is_deleted', false);
      if (assignees && assignees.length > 0) {
        ownerId = assignees[0].user_id; // Notify primary assignee
      }
    }

    if (!ownerId) continue;

    const title = moduleName === 'tickets' ? record.code : moduleName === 'requirements' ? record.title : record.subject;

    if (hoursElapsed >= slaHours) {
      notifications.push({
        recipient_id: ownerId,
        payload: {
          type: 'SLA_BREACH',
          message: `${moduleName.toUpperCase()} ${title} has breached its SLA!`,
          record_id: record.id
        },
        status: 'pending'
      });
    } else if (hoursElapsed >= warningHours && hoursElapsed < slaHours) {
      notifications.push({
        recipient_id: ownerId,
        payload: {
          type: 'SLA_WARNING',
          message: `${moduleName.toUpperCase()} ${title} is approaching SLA breach.`,
          record_id: record.id
        },
        status: 'pending'
      });
    }
  }

  if (notifications.length > 0) {
    await supabaseAdmin.from('notification_queue').insert(notifications);
  }
}
