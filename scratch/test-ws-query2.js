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

async function check() {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*, status:workflow_states(name, code), company:companies(name, code), priority:master_priorities(name, code), department:departments(name, code, scope_id), owner:user_master(id, manager_id), workspace_members(user_id), workspace_teams(team_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Query failed:", error);
  } else {
    console.log("Query succeeded! Returned count:", data.length);
  }
}

check();
