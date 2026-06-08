import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjczjbnnyfexzvxzcjqc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Load environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testParallelFetch(taskId) {
  console.log("Starting parallel fetch test for task:", taskId);
  const t0 = performance.now();

  const [
    { data: task, error },
    { count: checklistCount },
    { count: attachmentCount },
    { data: participants },
  ] = await Promise.all([
    supabaseAdmin.from('tasks').select(`
      *,
      status:status_master(id, name:status_name, code:status_code, is_closed),
      priority:priority_master(id, name:priority_name, color:priority_color),
      workspace:workspaces(id, name:workspace_name)
    `).eq('id', taskId).single(),
    supabaseAdmin.from('task_checklists').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
    supabaseAdmin.from('task_attachments').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
    supabaseAdmin.from('task_participants').select('user_id, participation_role').eq('task_id', taskId),
  ]);

  const t1 = performance.now();
  console.log(`Phase 1 (Parallel DB Queries): ${(t1 - t0).toFixed(2)}ms`);

  const uniqueUserIds = new Set();
  if (task?.created_by) uniqueUserIds.add(task.created_by);
  if (task?.assigned_to) uniqueUserIds.add(task.assigned_to);
  if (participants) participants.forEach(p => uniqueUserIds.add(p.user_id));

  let usersMap = new Map();
  if (uniqueUserIds.size > 0) {
    const { data: allUsers } = await supabaseAdmin.from('user_master').select('id, full_name, profile_photo, user_code').in('id', Array.from(uniqueUserIds));
    if (allUsers) allUsers.forEach(u => usersMap.set(u.id, u));
  }

  const t2 = performance.now();
  console.log(`Phase 2 (Single User Query): ${(t2 - t1).toFixed(2)}ms`);
  console.log(`Total Time: ${(t2 - t0).toFixed(2)}ms`);
}

async function run() {
  const { data: task } = await supabaseAdmin.from('tasks').select('id').limit(1).single();
  if (!task) {
    console.log("No tasks found");
    return;
  }
  await testParallelFetch(task.id);
}

run().catch(console.error);
