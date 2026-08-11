const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Checking tasks vs workspace_tasks...");
  const { data: t1, error: e1 } = await supabase.from('tasks').select('id, workspace_id').limit(2);
  console.log("tasks table:", e1 ? e1.message : `Found ${t1.length} rows`);
  
  const { data: t2, error: e2 } = await supabase.from('workspace_tasks').select('id, workspace_id').limit(2);
  console.log("workspace_tasks table:", e2 ? e2.message : `Found ${t2.length} rows`);

  // Check RLS on task_chat_messages
  console.log("Checking task_chat_messages RLS policies...");
  const { data: policies, error: pErr } = await supabase.rpc('execute_sql', {
    sql_query: "SELECT polname, polcmd, polqual, polwithcheck FROM pg_policy WHERE polrelid = 'public.task_chat_messages'::regclass;"
  });
  if (pErr) console.log("RLS policy query error:", pErr.message);
  else console.log("Policies:", policies);

  // Check task_mentions table
  const { data: mData, error: mErr } = await supabase.from('task_mentions').select('*').limit(2);
  console.log("task_mentions:", mErr ? mErr.message : mData);

  // Check notification_queue vs task_notifications
  const { data: nqData, error: nqErr } = await supabase.from('notification_queue').select('*').limit(2);
  console.log("notification_queue:", nqErr ? nqErr.message : nqData);
}

main().catch(console.error);
