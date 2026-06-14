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
  const permsToInsert = [
    { code: 'LEARNING_VIEW', name: 'Learning View', module: 'LEARNING', action: 'read' },
    { code: 'LEARNING_CREATE', name: 'Learning Create', module: 'LEARNING', action: 'create' },
    { code: 'LEARNING_UPDATE', name: 'Learning Update', module: 'LEARNING', action: 'update' },
    { code: 'LEARNING_DELETE', name: 'Learning Delete', module: 'LEARNING', action: 'delete' },
    { code: 'SETTINGS_MANAGE', name: 'Settings Manage', module: 'SETTINGS', action: 'manage' },
    { code: 'SETTINGS_UPDATE', name: 'Settings Update', module: 'SETTINGS', action: 'update' },
    { code: 'REPORTS_VIEW', name: 'Reports View', module: 'REPORTS', action: 'read' },
    { code: 'REPORTS_EXPORT', name: 'Reports Export', module: 'REPORTS', action: 'export' },
  ];
  
  for (const perm of permsToInsert) {
    const { error: insertError } = await supabase
      .from('permissions')
      .upsert({
        code: perm.code,
        name: perm.name,
        module: perm.module,
        action: perm.action,
      }, { onConflict: 'code' });
      
    if (insertError) {
      console.error(`Error inserting ${perm.code}:`, insertError);
    } else {
      console.log(`Inserted/Updated permission ${perm.code}`);
    }
  }

  console.log("Seeding complete.");
}

main();
