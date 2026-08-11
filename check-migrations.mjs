import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
async function run() {
  const { data: q, error } = await supabase.from('email_queue').select('id, recipient_email, created_at, status').order('created_at', { ascending: false }).limit(5);
  console.log(error);
}
run();
