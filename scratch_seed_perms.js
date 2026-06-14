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
    { code: 'LEARNING_VIEW', module: 'LEARNING' },
    { code: 'SETTINGS_MANAGE', module: 'SETTINGS' }
  ];
  
  for (const perm of permsToInsert) {
    const { error: insertError } = await supabase
      .from('permissions')
      .upsert({
        code: perm.code,
        module: perm.module,
      }, { onConflict: 'code' });
      
    if (insertError) {
      console.error(`Error inserting ${perm.code}:`, insertError);
    } else {
      console.log(`Inserted/Updated permission ${perm.code}`);
    }
  }

  // Assign them to ROLE_ADMIN
  const { data: roleAdmin, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('code', 'ROLE_ADMIN')
    .single();
    
  if (roleError || !roleAdmin) {
    console.error("Could not find ROLE_ADMIN role", roleError);
    return;
  }
  
  for (const perm of permsToInsert) {
    const { error: linkError } = await supabase
      .from('role_permissions')
      .upsert({
        role_id: roleAdmin.id,
        permission_code: perm.code
      }, { onConflict: 'role_id, permission_code' });
      
    if (linkError) {
      console.error(`Error assigning ${perm.code} to ROLE_ADMIN:`, linkError);
    } else {
      console.log(`Assigned ${perm.code} to ROLE_ADMIN`);
    }
  }
}

main();
