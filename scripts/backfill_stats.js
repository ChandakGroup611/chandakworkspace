const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Backfilling workspace statistics...");
  
  // 1. Fetch all workspaces
  const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('id');
  if (wsError) throw wsError;

  for (const w of workspaces) {
    const { data: sw } = await supabase.from('workspaces').select('id', { count: 'exact' }).eq('parent_workspace_id', w.id);
    const { data: t } = await supabase.from('tasks').select('id', { count: 'exact' }).eq('workspace_id', w.id).is('parent_task_id', null).eq('is_deleted', false);
    const { data: st } = await supabase.from('tasks').select('id', { count: 'exact' }).eq('workspace_id', w.id).not('parent_task_id', 'is', null).eq('is_deleted', false);
    const { data: m } = await supabase.from('workspace_members').select('id', { count: 'exact' }).eq('workspace_id', w.id);

    const sw_count = sw ? sw.length : 0;
    const t_count = t ? t.length : 0;
    const st_count = st ? st.length : 0;
    const m_count = m ? m.length : 0;

    const { error } = await supabase.from('workspace_statistics').update({
      subworkspace_count: sw_count,
      task_count: t_count,
      subtask_count: st_count,
      member_count: m_count
    }).eq('workspace_id', w.id);

    if (error) console.error("Error updating", w.id, error);
  }
  
  console.log("Done!");
}

run();
