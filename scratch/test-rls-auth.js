const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

// Function to generate a JWT for a specific user to test RLS
const jwt = require('jsonwebtoken');

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS(userId) {
  // We don't have the JWT secret to sign a token, but Supabase JS v2 allows setting the auth session
  // Wait, service role bypasses RLS. We can't test RLS from service role.
  // But we CAN call a Postgres function to test it, or we can use the `is_super_admin()` RPC if it exists.
  
  // Let's create an RPC just for debugging
  await supabase.rpc('execute_sql', { sql: `
    CREATE OR REPLACE FUNCTION public.debug_rls(p_uid UUID)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE
      v_is_super BOOLEAN;
      v_role RECORD;
      v_tasks INT;
    BEGIN
      -- We can't mock auth.uid() easily in a normal function, but we can check the tables directly
      SELECT * INTO v_role FROM public.roles r JOIN public.user_master um ON um.role_id = r.id WHERE um.id = p_uid;
      
      -- Let's just return the user's role and if they have SUPER_ADMIN bypass
      RETURN jsonb_build_object(
        'user_id', p_uid,
        'role_code', v_role.code,
        'role_name', v_role.name
      );
    END;
    $$;
  `});
  
  // Actually, I'll just check if the user is in user_roles or user_master correctly
  const { data: role } = await supabase.from('user_master').select('role:roles(code)').eq('id', userId).single();
  const { data: urole } = await supabase.from('user_roles').select('role:roles(code)').eq('user_id', userId);
  
  console.log(`User ${userId}:`);
  console.log(`  user_master role:`, role);
  console.log(`  user_roles:`, urole);
}

testRLS('53b7dbae-6049-44a7-a9c1-4ba769b4c324'); // SUPER ADMIN
testRLS('d0ed39c4-4d4d-49f9-a86a-efa666c6c9d1'); // Anand Mohta
testRLS('06cb4e59-b0b3-45d7-b929-c526fc33c429'); // Rohit
