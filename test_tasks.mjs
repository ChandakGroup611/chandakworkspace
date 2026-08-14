import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: workspaces } = await supabase.from('workspaces').select('id, workspace_name, workspace_owner_id');
  console.log("Workspaces:", workspaces);

  const { data: tasks, error: tErr } = await supabase.from('tasks').select('id, subject, workspace_id, is_deleted');
  console.log("Tasks:", tasks);
  if (tErr) console.error(tErr);

  // Check the RPC
  if (workspaces && workspaces.length > 0) {
    const { data: rpc, error: rpcErr } = await supabase.rpc('get_workspace_descendants', { root_id: workspaces[0].id });
    console.log("RPC get_workspace_descendants for", workspaces[0].workspace_name, ":", rpc);
    if (rpcErr) console.error("RPC Error:", rpcErr);
  }
}
check();
