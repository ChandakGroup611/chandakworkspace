import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: ws } = await supabase.from('workspaces').select('id, workspace_name').eq('workspace_name', 'Internal Audit').single();
  if (!ws) {
    console.log("Internal Audit workspace not found.");
    return;
  }
  console.log("Internal Audit Workspace ID:", ws.id);

  const { data: tasks, error } = await supabase.from('tasks').select('id, subject, workspace_id').eq('workspace_id', ws.id);
  console.log(`Tasks for Internal Audit: ${tasks?.length || 0}`);
  if (error) console.error(error);
}
check();
