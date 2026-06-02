import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We use service role to bypass RLS, then we also use a user's token if we can
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: user } = await supabase.from('user_master').select('id').eq('email', 'miraz@chandakgroup.com').single();
  console.log("Miraz ID:", user?.id);

  // We cannot easily impersonate Miraz without his JWT.
  // But let's check ALL tasks first.
  const { data, error } = await supabase.from('tasks').select(`
    *, title:subject, status:status_master(name:status_name,code:status_code,status_color), priority:priority_master(name:priority_name,code:priority_code), creator:user_master!created_by(id,manager_id)`)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  console.log('Error:', error);
  console.log(`Found ${data?.length} tasks in total (bypassing RLS).`);
}

test().catch(console.error);
