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

async function run10Scenarios() {
  console.log("==================================================");
  console.log("🚀 STARTING 10-SCENARIO END-TO-END VALIDATION 🚀");
  console.log("==================================================\n");

  const pwd = "TestPassword123!";
  const emailA = `owner_${Date.now()}@adios.local`;
  const emailB = `exec_${Date.now()}@adios.local`;
  const emailC = `outsider_${Date.now()}@adios.local`;

  let userA, userB, userC, wsId, taskId;

  try {
    console.log("🛠️  PROVISIONING DATA...");
    const resA = await adminClient.auth.admin.createUser({ email: emailA, password: pwd, email_confirm: true });
    const resB = await adminClient.auth.admin.createUser({ email: emailB, password: pwd, email_confirm: true });
    const resC = await adminClient.auth.admin.createUser({ email: emailC, password: pwd, email_confirm: true });
    
    userA = resA.data.user; userB = resB.data.user; userC = resC.data.user;
    
    await adminClient.from('user_master').upsert([
      { id: userA.id, email: emailA, full_name: 'Test Owner' },
      { id: userB.id, email: emailB, full_name: 'Test Exec' },
      { id: userC.id, email: emailC, full_name: 'Test Outsider' }
    ]);

    const wsRes = await adminClient.from('workspaces').insert({
      workspace_name: 'E2E Validation Workspace',
      workspace_code: 'E2E-WS',
      workspace_owner_id: userA.id
    }).select().single();
    wsId = wsRes.data.id;
    
    await adminClient.from('workspace_members').insert([
      { workspace_id: wsId, user_id: userA.id, role: 'WORKSPACE_OWNER' },
      { workspace_id: wsId, user_id: userB.id, role: 'WORKSPACE_MEMBER' }
    ]);

    const statusRes = await adminClient.from('status_master').select('id').limit(1).single();
    const priorityRes = await adminClient.from('priority_master').select('id').limit(1).single();
    
    const taskRes = await adminClient.from('tasks').insert({
      subject: 'E2E Scenario Task',
      workspace_id: wsId,
      owner_id: userA.id,
      created_by: userA.id,
      status_id: statusRes.data.id,
      priority_id: priorityRes.data.id
    }).select().single();
    taskId = taskRes.data.id;

    await adminClient.from('task_participants').insert({
      task_id: taskId,
      user_id: userB.id,
      participation_role: 'EXECUTOR'
    });

    const clientA = getClient(); await clientA.auth.signInWithPassword({ email: emailA, password: pwd });
    const clientB = getClient(); await clientB.auth.signInWithPassword({ email: emailB, password: pwd });
    const clientC = getClient(); await clientC.auth.signInWithPassword({ email: emailC, password: pwd });

    console.log("\n==================================================");
    console.log("🔒 EXECUTING 10 SCENARIOS 🔒");
    console.log("==================================================\n");

    // SCENARIO 1: Outsider Master Data Check
    const { data: s1 } = await clientC.from('user_master').select('id');
    console.log(`Scenario 1 (Master Leakage): Outsider sees ${s1 ? s1.length : 0} master records. (Expected: 1) -> ${s1 && s1.length === 1 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 2: Valid User Master Check
    const { data: s2 } = await clientA.from('user_master').select('id').eq('id', userA.id);
    console.log(`Scenario 2 (Master Access): Owner can read their own master record. -> ${s2 && s2.length === 1 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 3: Workspace Owner Visibility
    const { data: s3 } = await clientA.from('workspaces').select('id').eq('id', wsId);
    console.log(`Scenario 3 (Workspace Owner): Owner can see their workspace. -> ${s3 && s3.length === 1 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 4: Workspace Member Visibility
    const { data: s4 } = await clientB.from('workspaces').select('id').eq('id', wsId);
    console.log(`Scenario 4 (Workspace Member): Member can see assigned workspace. -> ${s4 && s4.length === 1 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 5: Workspace Outsider Leakage
    const { data: s5 } = await clientC.from('workspaces').select('id');
    console.log(`Scenario 5 (Workspace Isolation): Outsider sees ${s5 ? s5.length : 0} workspaces. (Expected: 0) -> ${s5 && s5.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 6: Task Owner Visibility
    const { data: s6 } = await clientA.from('tasks').select('id').eq('id', taskId);
    console.log(`Scenario 6 (Task Owner): Owner can see their task. -> ${s6 && s6.length === 1 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 7: Task Executor Visibility
    const { data: s7 } = await clientB.from('tasks').select('id').eq('id', taskId);
    console.log(`Scenario 7 (Task Executor): Executor can see assigned task. -> ${s7 && s7.length === 1 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 8: Task Outsider Leakage
    const { data: s8 } = await clientC.from('tasks').select('id');
    console.log(`Scenario 8 (Task Isolation): Outsider sees ${s8 ? s8.length : 0} tasks. (Expected: 0) -> ${s8 && s8.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 9: Execution Team Update Capability
    const { error: s9 } = await clientB.from('tasks').update({ subject: 'Exec Updated Status' }).eq('id', taskId);
    console.log(`Scenario 9 (Executive Edit Rights): Executor successfully updated the task. -> ${!s9 ? '✅ PASSED' : '❌ FAILED'}`);

    // SCENARIO 10: Outsider Tamper Prevention
    const { data: s10 } = await clientC.from('tasks').update({ subject: 'Hacked' }).eq('id', taskId).select();
    console.log(`Scenario 10 (Tamper Prevention): Outsider blocked from updating. -> ${s10 && s10.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);

  } catch (err) {
    console.error("FATAL ERROR DURING SCENARIOS:", err);
  } finally {
    console.log("\n🧹 Cleaning up test data...");
    if (taskId) await adminClient.from('tasks').delete().eq('id', taskId);
    if (wsId) await adminClient.from('workspaces').delete().eq('id', wsId);
    if (userA) await adminClient.auth.admin.deleteUser(userA.id);
    if (userB) await adminClient.auth.admin.deleteUser(userB.id);
    if (userC) await adminClient.auth.admin.deleteUser(userC.id);
  }
}

run10Scenarios();
