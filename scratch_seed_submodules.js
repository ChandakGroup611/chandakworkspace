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
    { code: 'REQUIREMENTS_APPROVALS_VIEW', name: 'View Approvals', module: 'REQUIREMENTS', submodule: 'Approvals', action: 'view' },
    { code: 'REQUIREMENTS_APPROVALS_CREATE', name: 'Create Approvals', module: 'REQUIREMENTS', submodule: 'Approvals', action: 'create' },
    { code: 'REQUIREMENTS_APPROVALS_UPDATE', name: 'Update Approvals', module: 'REQUIREMENTS', submodule: 'Approvals', action: 'update' },
    { code: 'REQUIREMENTS_APPROVALS_DELETE', name: 'Delete Approvals', module: 'REQUIREMENTS', submodule: 'Approvals', action: 'delete' },
    { code: 'COMPANIES_VIEW', name: 'View Companies', module: 'MASTERS', submodule: 'Company Master', action: 'view' },
    { code: 'COMPANIES_CREATE', name: 'Create Companies', module: 'MASTERS', submodule: 'Company Master', action: 'create' },
    { code: 'COMPANIES_UPDATE', name: 'Update Companies', module: 'MASTERS', submodule: 'Company Master', action: 'update' },
    { code: 'COMPANIES_DELETE', name: 'Delete Companies', module: 'MASTERS', submodule: 'Company Master', action: 'delete' },
    { code: 'SYSTEM_MASTERS_VIEW', name: 'View System Masters', module: 'MASTERS', submodule: 'System Master', action: 'view' },
    { code: 'SYSTEM_MASTERS_CREATE', name: 'Create System Masters', module: 'MASTERS', submodule: 'System Master', action: 'create' },
    { code: 'SYSTEM_MASTERS_UPDATE', name: 'Update System Masters', module: 'MASTERS', submodule: 'System Master', action: 'update' },
    { code: 'SYSTEM_MASTERS_DELETE', name: 'Delete System Masters', module: 'MASTERS', submodule: 'System Master', action: 'delete' },
    { code: 'SETTINGS_THEME_VIEW', name: 'View Theme Gallery', module: 'SETTINGS', submodule: 'Design Gallery', action: 'view' },
    { code: 'SETTINGS_THEME_UPDATE', name: 'Update Theme Gallery', module: 'SETTINGS', submodule: 'Design Gallery', action: 'update' },
    { code: 'SETTINGS_IDENTITY_VIEW', name: 'View Identity Settings', module: 'SETTINGS', submodule: 'Identity & Access', action: 'view' },
    { code: 'SETTINGS_IDENTITY_MANAGE', name: 'Manage Identity Settings', module: 'SETTINGS', submodule: 'Identity & Access', action: 'manage' },
    { code: 'SETTINGS_COMMUNICATION_VIEW', name: 'View Communication Settings', module: 'SETTINGS', submodule: 'Communication Center', action: 'view' },
    { code: 'SETTINGS_COMMUNICATION_MANAGE', name: 'Manage Communication Settings', module: 'SETTINGS', submodule: 'Communication Center', action: 'manage' },
    { code: 'SETTINGS_NOTIFICATIONS_VIEW', name: 'View Notification Settings', module: 'SETTINGS', submodule: 'Notifications', action: 'view' },
    { code: 'SETTINGS_NOTIFICATIONS_MANAGE', name: 'Manage Notification Settings', module: 'SETTINGS', submodule: 'Notifications', action: 'manage' },
    { code: 'ENROLLED_WORKSPACES_VIEW', name: 'View Enrolled Workspaces', module: 'WORKSPACES', submodule: 'Enrolled Workspaces', action: 'view' },
    { code: 'ENROLLED_WORKSPACES_MANAGE', name: 'Manage Enrolled Workspaces', module: 'WORKSPACES', submodule: 'Enrolled Workspaces', action: 'manage' }
  ];
  
  for (const perm of permsToInsert) {
    const { error: insertError } = await supabase
      .from('permissions')
      .upsert({
        code: perm.code,
        name: perm.name,
        module: perm.module,
        submodule: perm.submodule,
        action: perm.action,
        resource_type: 'PAGE'
      }, { onConflict: 'code' });
      
    if (insertError) {
      console.error(`Error inserting ${perm.code}:`, insertError);
    } else {
      console.log(`Inserted/Updated permission ${perm.code}`);
    }
  }

  // Also automatically grant these to SUPER_ADMIN so the admin doesn't lock themselves out immediately
  console.log("Granting new permissions to SUPER_ADMIN role...");
  const { data: superAdmin } = await supabase.from('roles').select('id').eq('code', 'SUPER_ADMIN').single();
  if (superAdmin) {
    for (const perm of permsToInsert) {
      const { data: pData } = await supabase.from('permissions').select('id').eq('code', perm.code).single();
      if (pData) {
        await supabase.from('role_permissions').upsert({ role_id: superAdmin.id, permission_id: pData.id }, { onConflict: 'role_id, permission_id' });
      }
    }
  }

  console.log("Seeding complete.");
}

main();
