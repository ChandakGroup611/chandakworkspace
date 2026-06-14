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
  const permsToCheck = ['SLA_VIEW', 'LEARNING_VIEW', 'SETTINGS_MANAGE', 'MASTERS_VIEW', 'USERS_VIEW', 'REQUIREMENTS_VIEW'];
  
  const { data, error } = await supabase
    .from('permissions')
    .select('code');
    
  if (error) {
    console.error("Error fetching permissions:", error);
    process.exit(1);
  }
  
  const existingPerms = new Set(data.map(p => p.code));
  const missingPerms = permsToCheck.filter(p => !existingPerms.has(p));
  
  console.log("Existing permissions related to new modules:", permsToCheck.filter(p => existingPerms.has(p)));
  console.log("Missing permissions that need to be seeded:", missingPerms);
}

main();
