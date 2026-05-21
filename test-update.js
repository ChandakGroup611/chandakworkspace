const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: roles } = await supabase.from('roles').select('id').limit(2);
  const newRole = roles && roles.length > 0 ? roles[0].id : null;
  
  const { data: users } = await supabase.from('user_master').select('id, role_id').not('role_id', 'is', null).limit(1);
  if (!users || users.length === 0) {
    console.log('No user found with a role_id');
    return;
  }
  const user = users[0];
  const targetRole = newRole !== user.role_id ? newRole : (roles.length > 1 ? roles[1].id : newRole);
  
  console.log('Attempting to update user', user.id, 'from role', user.role_id, 'to role', targetRole);

  const { data, error } = await supabase.from('user_master').update({ role_id: targetRole }).eq('id', user.id);
  
  if (error) {
    console.error('❌ Update failed with admin client:', error.message);
  } else {
    console.log('✅ Update succeeded with admin client!');
  }

  // Now let's try with ANON client (which enforces RLS)
  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  
  // We need to act as an authenticated user to hit the policy. Let's just try to update. Since anon has no session, it might fail early.
  // We will just do a SELECT. If check_user_permission is evaluated, it will crash.
  const { data: d2, error: e2 } = await anonClient.from('user_master').select('*').limit(1);
  if (e2) {
    console.error('❌ Select failed with anon client:', e2.message);
  } else {
    console.log('✅ Select succeeded with anon client!');
  }
}

check();
