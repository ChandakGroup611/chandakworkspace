import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data, error } = await supabase.from('tasks').select('id, creator:user_master!tasks_created_by_fkey(id, full_name)').limit(1);
  console.log('Result 1:', data, 'Error:', error?.message);
  
  const { data: data2, error: err2 } = await supabase.from('tasks').select('id, creator:user_master!created_by(id, full_name)').limit(1);
  console.log('Result 2:', data2, 'Error:', err2?.message);
}
run();
