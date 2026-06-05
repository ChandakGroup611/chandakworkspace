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

const adminClient = createClient(supabaseUrl, serviceKey);

function getClient() {
  return createClient(supabaseUrl, anonKey);
}

async function runTest() {
  const pwd = "TestPassword123!";
  const emailC = `user_c_${Date.now()}@adios.local`;
  
  const resC = await adminClient.auth.admin.createUser({ email: emailC, password: pwd, email_confirm: true });
  const userC = resC.data.user;
  
  await adminClient.from('user_master').upsert([{ id: userC.id, email: emailC, full_name: 'Test C' }]);
  
  const clientC = getClient();
  await clientC.auth.signInWithPassword({ email: emailC, password: pwd });
  
  const { data: ws } = await clientC.from('workspaces').select('id');
  console.log("User C Workspaces:", ws ? ws.length : 0);

  const { data: tsk } = await clientC.from('tasks').select('id');
  console.log("User C Tasks:", tsk ? tsk.length : 0);

  await adminClient.auth.admin.deleteUser(userC.id);
}
runTest();
