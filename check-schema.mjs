import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
async function run() {
  const { data: q, error } = await supabase.from('email_queue').select('*').limit(1);
  if (error) console.error(error); else console.dir(q, { depth: null });
}
run();
