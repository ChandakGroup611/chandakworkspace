import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role to check policies

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching policies...');
  const { data, error } = await supabase.rpc('debug_rls_functions'); // wait, I don't know if this exists
  
  // just read from pg_policies via REST if possible?
  // No, can't query pg_policies via REST.
}

test();
