const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("=== DIAGNOSTIC: ISSUE SUBTYPES ===");
  const { data: subtypes } = await supabase.from("issue_subtypes").select("id, code, name, issue_type_id, scope_id");
  console.log(subtypes);

  console.log("\n=== DIAGNOSTIC: TICKET SUBCATEGORIES ===");
  const { data: subcats } = await supabase.from("ticket_subcategories").select("id, code, name, category_id, scope_id");
  console.log(subcats);
}

run();
