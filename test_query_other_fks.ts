import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data, error } = await supabase.from('tasks').select(`
    id,
    status:status_master(id, name:status_name),
    priority:priority_master(id, name:priority_name),
    workspace:workspaces(id, name:workspace_name)
  `).limit(1);
  console.log('Result:', data, 'Error:', error?.message);
}
run();
