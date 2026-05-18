const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    processEnv[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = processEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Connecting to URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAnalysis() {
  try {
    console.log('\n--- 1. FETCHING USERS ---');
    const { data: users, error: errUsers } = await supabase
      .from('user_master')
      .select('id, full_name, email, user_code');
    if (errUsers) throw errUsers;
    console.log(users.map(u => `User: ${u.full_name} (${u.user_code}) | ID: ${u.id} | Email: ${u.email}`));

    console.log('\n--- 2. FETCHING WORKSPACES ---');
    const { data: workspaces, error: errWS } = await supabase
      .from('workspaces')
      .select('id, name, code, owner_id');
    if (errWS) throw errWS;
    console.log(workspaces.map(w => `WS: ${w.name} (${w.code}) | ID: ${w.id} | Owner: ${w.owner_id}`));

    console.log('\n--- 3. FETCHING TASKS AND ASSIGNEES ---');
    const { data: tasks, error: errTasks } = await supabase
      .from('workspace_tasks')
      .select(`
        id,
        code,
        title,
        workspace_id,
        assignee_id,
        creator_id,
        is_deleted
      `);
    if (errTasks) throw errTasks;

    const { data: assignees, error: errAss } = await supabase
      .from('task_assignees')
      .select('task_id, user_id');
    if (errAss) throw errAss;

    console.log(`Found ${tasks.length} tasks in total.`);
    tasks.forEach(t => {
      const taskAss = assignees.filter(a => a.task_id === t.id).map(a => a.user_id);
      const primaryUser = users.find(u => u.id === t.assignee_id);
      const creatorUser = users.find(u => u.id === t.creator_id);
      
      console.log(`Task: [${t.code}] "${t.title}" (ID: ${t.id})`);
      console.log(`  - Workspace ID: ${t.workspace_id}`);
      console.log(`  - Deleted: ${t.is_deleted}`);
      console.log(`  - Creator: ${creatorUser ? creatorUser.full_name : t.creator_id}`);
      console.log(`  - Primary Assignee Field: ${primaryUser ? primaryUser.full_name : (t.assignee_id || 'NULL')}`);
      console.log(`  - Multiple Assignees (task_assignees): [${taskAss.map(id => {
        const u = users.find(usr => usr.id === id);
        return u ? u.full_name : id;
      }).join(', ') || 'NONE'}]`);
    });

    console.log('\n--- 4. FETCHING RECENT NOTIFICATIONS ---');
    const { data: notifications, error: errNotif } = await supabase
      .from('task_notifications')
      .select('*')
      .limit(10);
    if (errNotif) {
      console.log('Could not fetch task_notifications (might be permission/schema difference):', errNotif.message);
    } else {
      console.log(`Found ${notifications.length} recent task_notifications:`);
      notifications.forEach(n => {
        const u = users.find(usr => usr.id === n.user_id);
        console.log(`  - User: ${u ? u.full_name : n.user_id} | Title: "${n.title}" | Read: ${n.is_read}`);
        console.log(`    Message: "${n.message}"`);
      });
    }

    console.log('\n--- 5. FETCHING EMAIL QUEUE ---');
    const { data: emails, error: errEmails } = await supabase
      .from('email_queue')
      .select('*')
      .limit(10);
    if (errEmails) {
      console.log('Could not fetch email_queue:', errEmails.message);
    } else {
      console.log(`Found ${emails.length} emails in queue:`);
      emails.forEach(e => {
        console.log(`  - To: ${e.recipient_email} | Subject: "${e.subject}" | Status: ${e.status}`);
      });
    }

  } catch (err) {
    console.error('Analysis failed:', err);
  }
}

runAnalysis();
