const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testQuery() {
  console.log("Starting DB column type diagnosis...");

  const { data, error } = await supabase
    .from("issue_types")
    .select("id, name, scope_id")
    .eq("scope_id", "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1")
    .limit(1);

  if (error) {
    console.error("Query failed with error:", error);
  } else {
    console.log("Query succeeded! Result data:", data);
  }
}

testQuery();
