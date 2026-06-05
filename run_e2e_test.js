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

async function runE2E() {
  console.log("==================================================");
  console.log("🚀 STARTING FULL END-TO-END TRANSACTION LIFECYCLE 🚀");
  console.log("==================================================\n");

  const pwd = "TestPassword123!";
  const emailA = `user_a_${Date.now()}@adios.local`;
  const emailB = `user_b_${Date.now()}@adios.local`;
  const emailC = `user_c_${Date.now()}@adios.local`;

  let userA, userB, userC, wsId, taskId;

  try {
    console.log("🛠️  STEP 1: Provisioning Isolated Test Users...");
    const resA = await adminClient.auth.admin.createUser({ email: emailA, password: pwd, email_confirm: true });
    const resB = await adminClient.auth.admin.createUser({ email: emailB, password: pwd, email_confirm: true });
    const resC = await adminClient.auth.admin.createUser({ email: emailC, password: pwd, email_confirm: true });
    
    userA = resA.data.user; userB = resB.data.user; userC = resC.data.user;
    
    await adminClient.from('user_master').upsert([
      { id: userA.id, email: emailA, full_name: 'Test Exec A' },
      { id: userB.id, email: emailB, full_name: 'Test Exec B' },
      { id: userC.id, email: emailC, full_name: 'Test Exec C' }
    ]);
    console.log(`   ✅ Users created.`);

    console.log("\n🛠️  STEP 2: Creating Test Workspace...");
    const wsRes = await adminClient.from('workspaces').insert({
      workspace_name: 'E2E Test Workspace',
      workspace_code: 'E2E-WS',
      workspace_owner_id: userA.id
    }).select().single();
    wsId = wsRes.data.id;
    
    await adminClient.from('workspace_members').insert([
      { workspace_id: wsId, user_id: userA.id, role: 'WORKSPACE_OWNER' },
      { workspace_id: wsId, user_id: userB.id, role: 'WORKSPACE_MEMBER' }
    ]);
    console.log(`   ✅ Workspace created and User A (Owner), User B (Member) attached.`);

    console.log("\n🛠️  STEP 3: Creating Task and assigning Execution Team...");
    // Get valid status and priority
    const statusRes = await adminClient.from('status_master').select('id').limit(1).single();
    const priorityRes = await adminClient.from('priority_master').select('id').limit(1).single();
    
    const taskRes = await adminClient.from('tasks').insert({
      subject: 'E2E Validation Task',
      workspace_id: wsId,
      owner_id: userA.id,
      created_by: userA.id,
      status_id: statusRes.data.id,
      priority_id: priorityRes.data.id
    }).select().single();
    
    if (taskRes.error) {
       console.error("Failed to insert task:", taskRes.error);
       return;
    }
    
    taskId = taskRes.data.id;

    await adminClient.from('task_participants').insert({
      task_id: taskId,
      user_id: userB.id,
      participation_role: 'EXECUTOR'
    });
    console.log(`   ✅ Task created. User B assigned to Execution Team.`);

    console.log("\n==================================================");
    console.log("🔒 BEGIN RLS & FUNCTIONALITY VALIDATION 🔒");
    console.log("==================================================\n");

    const clientA = getClient(); await clientA.auth.signInWithPassword({ email: emailA, password: pwd });
    const clientB = getClient(); await clientB.auth.signInWithPassword({ email: emailB, password: pwd });
    const clientC = getClient(); await clientC.auth.signInWithPassword({ email: emailC, password: pwd });

    console.log("🔍 TEST 1: Cross-Workspace Leakage Check");
    const { data: wsC } = await clientC.from('workspaces').select('id');
    if (wsC && wsC.length > 0) {
      console.log(`   ❌ FAILED: User C (Outsider) can see ${wsC.length} workspaces!`);
    } else {
      console.log(`   ✅ PASSED: User C sees 0 workspaces. Cross-workspace leakage is FIXED.`);
    }

    console.log("\n🔍 TEST 2: Execution Team Edit Rights");
    const { data: taskB } = await clientB.from('tasks').select('id, subject').eq('id', taskId);
    if (!taskB || taskB.length === 0) {
      console.log(`   ❌ FAILED: User B (Executor) cannot see the task!`);
    } else {
      console.log(`   ✅ PASSED: User B can successfully SELECT the task.`);
    }
    
    const { error: updErrB } = await clientB.from('tasks').update({ subject: 'E2E Updated by Executor' }).eq('id', taskId);
    if (updErrB) {
      console.log(`   ❌ FAILED: User B (Executor) update rejected! Error: ${updErrB.message}`);
    } else {
      console.log(`   ✅ PASSED: User B successfully UPDATED the task. Execution Team blocker is FIXED.`);
    }

    const { data: updResC } = await clientC.from('tasks').update({ subject: 'Hacked by C' }).eq('id', taskId).select();
    if (updResC && updResC.length > 0) {
      console.log(`   ❌ FAILED: User C (Outsider) successfully modified the task!`);
    } else {
      console.log(`   ✅ PASSED: User C update strictly BLOCKED.`);
    }

    console.log("\n🔍 TEST 3: User Master Global Leakage Check");
    const { data: umC } = await clientC.from('user_master').select('id');
    if (umC && umC.length > 1) { 
      console.log(`   ❌ FAILED: User C sees ${umC.length} users in master! Policy is too open.`);
    } else {
      console.log(`   ✅ PASSED: User C only sees their own scoped data. User Master is FIXED.`);
    }

  } catch (err) {
    console.error("FATAL ERROR DURING E2E:", err);
  } finally {
    console.log("\n🧹 Cleaning up test data...");
    if (taskId) await adminClient.from('tasks').delete().eq('id', taskId);
    if (wsId) await adminClient.from('workspaces').delete().eq('id', wsId);
    if (userA) await adminClient.auth.admin.deleteUser(userA.id);
    if (userB) await adminClient.auth.admin.deleteUser(userB.id);
    if (userC) await adminClient.auth.admin.deleteUser(userC.id);
    console.log("   ✅ Cleanup complete.");
    
    console.log("\n==================================================");
    console.log("🏆 E2E CYCLE COMPLETE 🏆");
    console.log("==================================================");
  }
}

runE2E();
