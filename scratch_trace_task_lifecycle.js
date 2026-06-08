const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function profileTaskOpen(taskId, userId) {
  console.log("\n==================================");
  console.log("PHASE 1: TASK OPEN PROFILING");
  console.log("==================================");

  console.time("Task Query");
  const { data: task } = await supabase
    .from('tasks')
    .select(`
      *,
      status:status_master(id, name:status_name, code:status_code, is_closed),
      priority:priority_master(id, name:priority_name, color:priority_color),
      workspace:workspaces(id, name:workspace_name)
    `)
    .eq('id', taskId)
    .single();
  console.timeEnd("Task Query");

  if (!task) return;

  console.time("Creator Query");
  if (task.created_by) {
    await supabase.from('user_master').select('id, full_name, user_code').eq('id', task.created_by).single();
  }
  console.timeEnd("Creator Query");

  console.time("Workspace Membership Query (Permissions)");
  if (task.workspace_id) {
    await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();
  }
  console.timeEnd("Workspace Membership Query (Permissions)");

  console.time("Assignee Query");
  if (task.assigned_to) {
    await supabase.from('user_master').select('id, full_name, profile_photo').eq('id', task.assigned_to).single();
  }
  console.timeEnd("Assignee Query");

  console.time("Checklist Aggregation");
  await supabase.from('task_checklists').select('*', { count: 'exact', head: true }).eq('task_id', taskId);
  console.timeEnd("Checklist Aggregation");

  console.time("Attachment Aggregation");
  await supabase.from('task_attachments').select('*', { count: 'exact', head: true }).eq('task_id', taskId);
  console.timeEnd("Attachment Aggregation");

  console.time("Participants Query");
  const { data: participants } = await supabase.from('task_participants').select('user_id, participation_role').eq('task_id', taskId);
  console.timeEnd("Participants Query");

  console.time("Participant Users Query");
  if (participants && participants.length > 0) {
    const pIds = Array.from(new Set(participants.map(p => p.user_id)));
    await supabase.from('user_master').select('id, full_name, profile_photo').in('id', pIds);
  }
  console.timeEnd("Participant Users Query");

  console.time("Inherited Workspace Users Query");
  if (task.workspace_id) {
    const { data: wsMembers } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', task.workspace_id)
      .eq('is_deleted', false);
    if (wsMembers && wsMembers.length > 0) {
      const wsUserIds = Array.from(new Set(wsMembers.map(m => m.user_id)));
      await supabase.from('user_master').select('id, full_name, profile_photo').in('id', wsUserIds);
    }
  }
  console.timeEnd("Inherited Workspace Users Query");
}

async function profileTaskSave(taskId, userId) {
  console.log("\n==================================");
  console.log("PHASE 2: TASK SAVE PROFILING");
  console.log("==================================");

  console.time("Task Validation/Owner Check");
  const { data: task } = await supabase.from('tasks').select('assigned_to, subject').eq('id', taskId).single();
  console.timeEnd("Task Validation/Owner Check");

  console.time("Task Participant Check (Permissions)");
  await supabase
      .from('task_participants')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();
  console.timeEnd("Task Participant Check (Permissions)");

  console.time("Task Update Query");
  await supabase.from('tasks').update({ subject: "Updated Subject " + Date.now() }).eq('id', taskId);
  console.timeEnd("Task Update Query");

  console.time("Audit Log Trigger Fallback (Fix)");
  await supabase
    .from('task_activity_logs')
    .update({ actor_id: userId })
    .eq('task_id', taskId)
    .is('actor_id', null);
  console.timeEnd("Audit Log Trigger Fallback (Fix)");

  console.time("Activity Log Insert");
  await supabase.from('activity_events').insert({
      module_type: 'TASK',
      record_id: taskId,
      event_type: 'TITLE',
      old_value: { title: "Old" },
      new_value: { title: "New" },
      performed_by: userId
    });
  console.timeEnd("Activity Log Insert");
}

async function runProfiles() {
  const { data: task } = await supabase.from('tasks').select('id, assigned_to').limit(1).single();
  if (task) {
    const userId = task.assigned_to || "d0107e32-231a-46da-b088-75f1057e6bd3";
    await profileTaskOpen(task.id, userId);
    await profileTaskSave(task.id, userId);
  } else {
    console.log("No tasks found to profile.");
  }
}

runProfiles();
