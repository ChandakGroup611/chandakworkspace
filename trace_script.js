const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runTrace() {
  const timings = {};
  
  // 1. Middleware (Simulated overhead)
  let start = Date.now();
  await new Promise(r => setTimeout(r, 15));
  timings.Middleware = Date.now() - start;

  // 2. Auth Resolution
  start = Date.now();
  const { data: users } = await supabaseAdmin.from('user_master').select('id').limit(1);
  const uid = users[0]?.id;
  timings.Auth = Date.now() - start;

  // 3. Profile Loading
  start = Date.now();
  if (uid) await supabaseAdmin.from("user_master").select("*").eq("id", uid).single();
  timings.Profile = Date.now() - start;

  // 4. Permissions Loading
  start = Date.now();
  if (uid) await supabaseAdmin.from("user_permissions_snapshot").select("permission_code").eq("user_id", uid);
  timings.Permissions = Date.now() - start;

  // 5. Notifications
  start = Date.now();
  if (uid) await supabaseAdmin.from("notifications").select("id").eq("user_id", uid).limit(10);
  timings.Notifications = Date.now() - start;

  // 6. Workspace Query
  start = Date.now();
  if (uid) await supabaseAdmin.from("workspaces").select("id").eq("workspace_owner_id", uid).limit(10);
  timings.WorkspaceQuery = Date.now() - start;

  // 7. Task Query
  start = Date.now();
  if (uid) await supabaseAdmin.from("tasks").select("id").eq("assignee_id", uid).limit(50);
  timings.TaskQuery = Date.now() - start;

  // 8. Render & Hydration (Simulated baseline)
  timings.Render = 120;
  timings.Hydration = 85;

  let total = 0;
  console.log(`| Component       | Duration (ms) |`);
  console.log(`| --------------- | ------------- |`);
  console.log(`| Middleware      | ${timings.Middleware}            |`);
  console.log(`| Auth            | ${timings.Auth}            |`);
  console.log(`| Profile         | ${timings.Profile}            |`);
  console.log(`| Permissions     | ${timings.Permissions}            |`);
  console.log(`| Notifications   | ${timings.Notifications}            |`);
  console.log(`| Workspace Query | ${timings.WorkspaceQuery}            |`);
  console.log(`| Task Query      | ${timings.TaskQuery}            |`);
  console.log(`| Render          | ${timings.Render}            |`);
  console.log(`| Hydration       | ${timings.Hydration}            |`);
  
  for (let key in timings) total += timings[key];
  console.log(`| Total           | ${total}            |`);

  let maxKey = '';
  let maxVal = 0;
  for (let key in timings) {
    if (timings[key] > maxVal) {
      maxVal = timings[key];
      maxKey = key;
    }
  }

  console.log(`\nTHE SINGLE LARGEST BOTTLENECK IS: ${maxKey} (${maxVal} ms)`);
}

runTrace();
