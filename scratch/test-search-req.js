require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const defaultSelect = `
      *,
      department:departments(name),
      status:status_master(status_name, status_color),
      priority:priority_master(priority_name, priority_color),
      creator:user_master!created_by(full_name, profile_photo),
      analyst:user_master!assigned_analyst_id(full_name, profile_photo),
      watchers:requirement_watchers(user_id),
      approvers:requirement_approvals(approver_id, status)
  `;
  const { data, error } = await supabase.from('requirements').select(defaultSelect).limit(1);
  if (error) console.error("Requirements Error:", error);
  else console.log("Requirements OK:", data.length);
}
test();
