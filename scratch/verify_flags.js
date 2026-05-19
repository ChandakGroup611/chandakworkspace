const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("=== DIAGNOSTIC: ISSUE TYPES DETAILED ===");
  const { data: types } = await supabase.from("issue_types").select("id, code, name, is_active, is_deleted, scope_id");
  console.log(types);

  console.log("\n=== DIAGNOSTIC: TICKET CATEGORIES DETAILED ===");
  const { data: cats } = await supabase.from("ticket_categories").select("id, code, name, is_active, is_deleted, scope_id");
  console.log(cats);
}

run();
