require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testTickets() {
  const defaultSelect = `
      *,
      creator:user_master!fk_tickets_creator(full_name, profile_photo),
      assignee:user_master!fk_tickets_assignee(full_name, profile_photo),
      department:departments(name),
      priority:priority_master(priority_name, priority_color),
      status:status_master(status_name, status_color, is_terminal)
  `;
  const { data, error } = await supabase.from('tickets').select(defaultSelect).limit(1);
  if (error) console.error("Tickets Error:", error);
  else console.log("Tickets OK:", data.length);
}

async function testTasks() {
  const defaultSelect = `
      *,
      status:status_master(status_name, status_color, status_order, is_closed),
      priority:priority_master(priority_name, priority_color, min_sla_hours, max_sla_hours, warning_sla_hours, sla_start_from),
      creator:user_master!created_by(full_name, profile_photo),
      assignees:task_assignees(user:user_master!user_id(full_name)),
      teams:task_teams(team:teams!team_id(team_name)),
      workspace:workspaces(workspace_name)
  `;
  const { data, error } = await supabase.from('tasks').select(defaultSelect).limit(1);
  if (error) console.error("Tasks Error:", error);
  else console.log("Tasks OK:", data.length);
}

testTickets().then(testTasks);
