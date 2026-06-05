const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function getClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function runTest() {
  const pwd = "TestPassword123!";
  const emailC = `user_c_${Date.now()}@adios.local`;
  
  console.log("Creating test user C:", emailC);
  const resC = await adminClient.auth.admin.createUser({ email: emailC, password: pwd, email_confirm: true });
  const userC = resC.data.user;
  
  await adminClient.from('user_master').upsert([
    { id: userC.id, email: emailC, full_name: 'Test Exec C' }
  ]);
  
  const clientC = getClient();
  await clientC.auth.signInWithPassword({ email: emailC, password: pwd });
  
  // Test what is_super_admin returns
  const { data: isAdmin, error: err1 } = await clientC.rpc('is_super_admin');
  console.log("Is User C Super Admin?", isAdmin, err1);

  // Test what roles they have
  const { data: um } = await adminClient.from('user_master').select('role_id, roles(code)').eq('id', userC.id).single();
  console.log("User C user_master record:", um);
  
  await adminClient.auth.admin.deleteUser(userC.id);
}
runTest();
