const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const supabaseUrlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrlMatch[1], supabaseKeyMatch[1]);

async function main() {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('module', { ascending: true });
    
  if (error) {
    console.error("Error fetching permissions:", error);
    process.exit(1);
  }
  
  console.log("ALL PERMISSIONS IN DB:");
  data.forEach(p => console.log(`- ${p.module}: ${p.code}`));
}

main();
