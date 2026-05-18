const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) config[key.trim()] = value.trim();
});

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('Logging in as admin@adios.local...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@adios.local',
    password: 'password123'
  });

  if (authErr) {
    console.error('Failed to log in:', authErr.message);
    return;
  }
  
  console.log('Logged in successfully! User ID:', authData.user.id);
  console.log('--- DIAGNOSING DATABASE AUDIT & NOTIFICATIONS ---');
  
  // 1. Fetch recent activity logs
  const { data: activityLogs, error: activityError } = await supabase
    .from('task_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (activityError) {
    console.error('Error fetching task_activity_logs:', activityError.message);
  } else {
    console.log('Recent Task Activity Logs:', JSON.stringify(activityLogs, null, 2));
  }

  // 2. Fetch recent audit logs
  const { data: auditLogs, error: auditError } = await supabase
    .from('task_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (auditError) {
    console.error('Error fetching task_audit_logs:', auditError.message);
  } else {
    console.log('Recent Task Audit Logs:', JSON.stringify(auditLogs, null, 2));
  }

  // 3. Fetch recent notifications
  const { data: notifications, error: notifError } = await supabase
    .from('task_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (notifError) {
    console.error('Error fetching task_notifications:', notifError.message);
  } else {
    console.log('Recent Task Notifications:', JSON.stringify(notifications, null, 2));
  }
}

diagnose();
