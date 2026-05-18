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

async function run() {
  try {
    // 1. Fetch a workspace to link the task to
    const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('id').limit(1);
    if (wsError || !workspaces.length) {
      console.error("Could not fetch workspaces:", wsError?.message || "No workspaces");
      return;
    }
    const wsId = workspaces[0].id;
    console.log("Using Workspace ID:", wsId);

    // 2. Insert dummy task
    const { data: task, error: insertError } = await supabase.from('workspace_tasks').insert([{
      title: "Temp Inspection Task",
      workspace_id: wsId
    }]).select('*').single();

    if (insertError) {
      console.error("Error inserting task:", insertError.message);
      return;
    }

    console.log("=== SUCCESS! WORKSPACE_TASKS COLUMNS ===");
    console.log(Object.keys(task));
    console.log("=========================================");

    // 3. Delete the dummy task
    const { error: deleteError } = await supabase.from('workspace_tasks').delete().eq('id', task.id);
    if (deleteError) {
      console.error("Error deleting task:", deleteError.message);
    } else {
      console.log("Dummy task successfully deleted!");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
