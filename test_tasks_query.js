const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuery() {
  const userId = '11111111-1111-1111-1111-111111111111';
  const workspaceIds = ['22222222-2222-2222-2222-222222222222'];
  const participantTaskIds = ['33333333-3333-3333-3333-333333333333'];

  const taskOrConditions = [`created_by.eq.${userId}`];
  if (workspaceIds.length > 0) taskOrConditions.push(`workspace_id.in.(${workspaceIds.join(',')})`);
  if (participantTaskIds.length > 0) taskOrConditions.push(`id.in.(${participantTaskIds.join(',')})`);

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id, created_at, created_by, assigned_to, subject,
      status_id, status_master(status_name),
      priority_id, priority:priority_master(priority_name),
      end_date
    `)
    .eq("is_deleted", false)
    .or(taskOrConditions.join(','))
    .order("created_at", { ascending: false });

  if (error) {
    console.error("ERROR details:");
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log("Success! Found rows:", data.length);
  }
}

testQuery();
