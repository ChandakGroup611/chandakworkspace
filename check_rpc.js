const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/adios/.env.local' });

// Use normal user client if we have a way, or test RPC directly via Service Role
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('has_permission_snapshot', { p_permission_code: 'ATTACHMENTS_VIEW' });
  console.log("has_permission_snapshot RPC result:", { data, error });

  // Test inserting attachment
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (users?.users?.length > 0) {
    const userId = users.users[0].id;
    console.log("Testing with user:", userId);
    
    // We can't easily masquerade as the user without their JWT, but we can check if the function exists
  }
}

check();
