const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Use a cookie-like client or just the anon client if we want to simulate RLS, 
// but since the server action runs on the server under user context, we will instantiate a standard client
// using a dummy user session or just queries to verify schema correctness first.
async function run() {
  const userId = '59fd378e-4ebd-4994-9853-0e3b54a888fb'; // Anand Mohta
  
  try {
    console.log("Running workspace_members join query...");
    const { data: wsMembers, error: wsError } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id, workspaces!inner(id)")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .eq("workspaces.is_deleted", false);

    console.log("wsMembers Error:", wsError);
    console.log("wsMembers Count:", wsMembers?.length);

    console.log("Running task_participants join query...");
    const { data: taskParticipants, error: taskPartError } = await supabaseAdmin
      .from("task_participants")
      .select("task_id, tasks!inner(id)")
      .eq("user_id", userId)
      .eq("tasks.is_deleted", false);

    console.log("taskParticipants Error:", taskPartError);
    console.log("taskParticipants Count:", taskParticipants?.length);
    
  } catch (err) {
    console.error("Crash during execution:", err);
  }
}

run();
