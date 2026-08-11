import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
async function run() {
  const { data: q } = await supabase.from('email_queue').select('*').order('created_at', { ascending: false }).limit(2);
  console.log('--- QUEUE ---');
  console.dir(q, { depth: null });
  const { data: l } = await supabase.from('email_delivery_logs').select('*').order('created_at', { ascending: false }).limit(2);
  console.log('--- LOGS ---');
  console.dir(l, { depth: null });
}
run();
