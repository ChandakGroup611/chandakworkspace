import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: ws } = await supabase.from('workspaces').select('id, workspace_name, parent_workspace_id').ilike('workspace_name', '%Internal Audit%');
  console.log("Found workspaces matching 'Internal Audit':", ws);
  if (ws) {
    for (const w of ws) {
      const { data: tasks, error } = await supabase.from('tasks').select('id').eq('workspace_id', w.id);
      console.log(`Tasks for ${w.workspace_name}: ${tasks?.length || 0}`);
    }
  }
}
check();
