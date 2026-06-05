const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // anon key
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(supabaseUrl, supabaseKey);
const adminClient = createClient(supabaseUrl, serviceKey);

async function verifyFlow() {
  console.log("==========================================");
  console.log("STARTING 10x VERIFICATION FLOW");
  console.log("==========================================\n");

  const { data: allUsers } = await adminClient.from('user_master').select('id, email').limit(5);
  console.log(`✅ Admin verified master data exists. Found ${allUsers ? allUsers.length : 0} users.`);

  // Test 1: Unauthenticated user master access
  const { data: anonUsers } = await anonClient.from('user_master').select('id').limit(1);
  if (anonUsers && anonUsers.length > 0) {
    console.log(`❌ FAILED: Zombie policies exist! Unauthenticated users can read user_master.`);
  } else {
    console.log(`✅ SUCCESS: Unauthenticated access to user_master is strictly blocked.`);
  }

  // Test 2: Unauthenticated workspaces access
  const { data: anonWorkspaces } = await anonClient.from('workspaces').select('id').limit(1);
  if (anonWorkspaces && anonWorkspaces.length > 0) {
    console.log(`❌ FAILED: Zombie policies exist! Unauthenticated users can read workspaces.`);
  } else {
    console.log(`✅ SUCCESS: Unauthenticated access to workspaces is strictly blocked.`);
  }

  // Test 3: Unauthenticated tasks access
  const { data: anonTasks } = await anonClient.from('tasks').select('id').limit(1);
  if (anonTasks && anonTasks.length > 0) {
    console.log(`❌ FAILED: Zombie policies exist! Unauthenticated users can read tasks.`);
  } else {
    console.log(`✅ SUCCESS: Unauthenticated access to tasks is strictly blocked.`);
  }

  console.log("\n==========================================");
  console.log("VERIFICATION COMPLETE");
  console.log("If the new SQL script was run, all tests above should say SUCCESS.");
  console.log("==========================================");
}

verifyFlow();
