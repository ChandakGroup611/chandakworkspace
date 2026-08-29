import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = 'd1b0c396-eeb2-4567-a6bd-cb04adb8327a'; // Avinash Pise
  const isSuperAdmin = true;

  // Simulate dashboardMetrics logic
  let tasksPromise = supabaseAdmin.from("tasks")
    .select(`id, created_at, created_by, assigned_to, subject, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), end_date`)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(5);
    
  let workspacesPromise = supabaseAdmin
        .from("workspaces")
        .select(`id, created_at, updated_at, workspace_name, parent_workspace_id, status_id, status_master(status_name), end_date`)
        .eq('is_deleted', false)
        .order("created_at", { ascending: false })
        .limit(5);

  const [tRes, wRes] = await Promise.all([tasksPromise, workspacesPromise]);
  console.log("Tasks sample:", tRes.data);
  console.log("Workspaces sample:", wRes.data);
}

run();
