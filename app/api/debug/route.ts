import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Get Arun's user ID
  const { data: users, error: userError } = await supabase
    .from('user_master')
    .select('id, email, full_name')
    .eq('full_name', 'Arun')
    .limit(1);

  if (userError || !users || users.length === 0) {
    return NextResponse.json({ error: 'User Arun not found', details: userError });
  }

  const arunId = users[0].id;

  // 2. Impersonate Arun and run query
  const { data: rpcData, error: rpcError } = await supabase.rpc('execute_sql_query', {
    query: `
      BEGIN;
      SELECT set_config('request.jwt.claim.sub', '${arunId}', true);
      SELECT set_config('request.jwt.claim.role', 'authenticated', true);
      
      -- Try to fetch workspaces
      SELECT id FROM public.workspaces;
      COMMIT;
    `
  });

  return NextResponse.json({
    arunId,
    rpcData,
    rpcError
  });
}
