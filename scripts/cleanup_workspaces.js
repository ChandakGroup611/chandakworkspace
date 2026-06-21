const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching workspaces...");
  const { data: workspaces, error } = await supabase.from('workspaces').select('id, workspace_name, parent_workspace_id');
  if (error) {
    console.error("Error fetching", error);
    return;
  }

  let updatedCount = 0;

  for (const ws of workspaces) {
    if (ws.parent_workspace_id) {
      const parent = workspaces.find(p => p.id === ws.parent_workspace_id);
      if (parent) {
        // Strict prefix check
        const prefix = `${parent.workspace_name} - `;
        if (ws.workspace_name.startsWith(prefix)) {
          const newName = ws.workspace_name.substring(prefix.length).trim();
          console.log(`Updating '${ws.workspace_name}' -> '${newName}'`);
          const { error: updateError } = await supabase.from('workspaces').update({ workspace_name: newName }).eq('id', ws.id);
          if (updateError) {
            console.error(`Error updating ${ws.id}:`, updateError);
          } else {
            updatedCount++;
          }
        } else {
            // Relaxed prefix check for inconsistent spacing e.g. "Internal Audit -IA-Mahajan"
            const parts = ws.workspace_name.split(' -');
            if (parts.length > 1 && parts[0].trim() === parent.workspace_name.trim()) {
                let newName = ws.workspace_name.substring(parts[0].length + 2).trim();
                // strip leading dash if present
                if (newName.startsWith('-')) newName = newName.substring(1).trim();
                
                console.log(`Updating (Relaxed) '${ws.workspace_name}' -> '${newName}'`);
                const { error: updateError } = await supabase.from('workspaces').update({ workspace_name: newName }).eq('id', ws.id);
                if (updateError) {
                    console.error(`Error updating ${ws.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            }
        }
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} sub-workspaces.`);
}

run();
