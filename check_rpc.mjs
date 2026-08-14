import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const rootId = '5be18006-b9e9-4fc5-b33b-2ddeeeaebac0';
  const { data: rpc, error: rpcErr } = await supabase.rpc('get_workspace_descendants', { root_id: rootId });
  console.log("RPC get_workspace_descendants for Internal Audit:", rpc);
  if (rpcErr) console.error("RPC Error:", rpcErr);
}
check();
