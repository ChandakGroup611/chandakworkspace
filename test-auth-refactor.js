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
      if (match) {
        env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  });
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("=========================================");
  console.log("Enterprise Authorization Refactor Tests");
  console.log("=========================================\n");

  // 1. Verify Views
  console.log("1. Validating Reporting Views Existence...");
  const views = [
    'vw_reports_assigned_to_me',
    'vw_reports_created_by_me',
    'vw_reports_workspace_wise',
    'vw_reports_sub_workspace_wise',
    'vw_reports_task_owner_wise',
    'vw_reports_open_tasks',
    'vw_reports_in_progress_tasks',
    'vw_reports_completed_tasks',
    'vw_reports_overdue_tasks',
    'vw_reports_sla_breached',
    'vw_reports_due_today',
    'vw_reports_due_this_week',
    'vw_reports_due_this_month',
    'vw_reports_user_productivity',
    'vw_reports_workspace_productivity',
    'vw_reports_sub_workspace_productivity'
  ];

  let missingViews = 0;
  for (const view of views) {
    const { error } = await supabase.from(view).select('*').limit(1);
    if (error && error.code === '42P01') {
      console.error(`❌ View missing: ${view}`);
      missingViews++;
    } else if (error && error.code !== '42P01') {
      console.log(`⚠️ View ${view} exists but had error (likely empty or RLS):`, error.message);
    } else {
      console.log(`✅ View exists: ${view}`);
    }
  }

  // 2. Verify Schema
  console.log("\n2. Validating Sub Workspace and Sub Tasks Schema...");
  const tables = ['sub_workspaces', 'sub_workspace_members', 'sub_tasks'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === '42P01') {
      console.error(`❌ Table missing: ${table}`);
    } else {
      console.log(`✅ Table exists: ${table}`);
    }
  }

  // 3. Check Tasks assigned_to
  console.log("\n3. Checking tasks schema for assigned_to...");
  const { data: taskData, error: taskErr } = await supabase.from('tasks').select('assigned_to').limit(1);
  if (taskErr) {
     if (taskErr.code === '42703') console.error("❌ tasks.assigned_to column missing.");
     else console.error("⚠️ tasks assigned_to error:", taskErr.message);
  } else {
     console.log("✅ tasks.assigned_to column exists.");
  }

  console.log("\nTests Complete.");
  if (missingViews > 0) {
    console.log("Please ensure you have run both migration files in the Supabase SQL editor.");
  }
}

runTests();
