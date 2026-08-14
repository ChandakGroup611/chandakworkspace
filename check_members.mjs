import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users } = await supabase.from('user_master').select('id, full_name, email');
  // just pick the user that owns the workspaces or check all users
  const wsIds = ['0e879046-fb97-47e5-a561-dce4f92450df', '06c93e7a-f9ad-4b46-8bd1-a207b58ce1f7'];
  
  const { data: members } = await supabase.from('workspace_members').select('user_id, workspace_id').in('workspace_id', wsIds);
  console.log(`Members in sub-workspaces: ${members?.length || 0}`);
}
check();
