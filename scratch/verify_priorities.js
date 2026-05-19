const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("=== DIAGNOSTIC: PRIORITIES ===");
  const { data: prios } = await supabase.from("master_priorities").select("id, code, name, sla_target_minutes, is_active, is_deleted");
  console.log(prios);

  console.log("\n=== DIAGNOSTIC: WORKFLOW STATES ===");
  const { data: states } = await supabase.from("workflow_states").select("id, code, name, is_active, is_deleted");
  console.log(states);
}

run();
