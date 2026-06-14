const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTasks() {
  const { data: latestTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, subject, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
    
  console.log("Latest Tasks:", latestTasks);
  
  if (latestTasks && latestTasks.length > 0) {
    const taskIds = latestTasks.map(t => t.id);
    const { data: attachments } = await supabaseAdmin
      .from('task_attachments')
      .select('*')
      .in('task_id', taskIds);
    console.log("Attachments for latest tasks:", attachments);
    
    // Check if the source requirement has attachments
    const { data: reqTasks } = await supabaseAdmin
        .from('requirement_tasks')
        .select('*')
        .in('task_id', taskIds);
    console.log("Requirement links:", reqTasks);
    
    if (reqTasks && reqTasks.length > 0) {
        const reqIds = reqTasks.map(rt => rt.requirement_id);
        const { data: reqAtts } = await supabaseAdmin
            .from('attachments')
            .select('*')
            .eq('module_type', 'requirement')
            .in('record_id', reqIds);
        console.log("Source requirement attachments:", reqAtts);
    }
  }
}

inspectTasks();
