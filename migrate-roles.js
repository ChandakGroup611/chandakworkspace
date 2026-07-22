const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrateRoles() {
  console.log("Starting role migration...");
  
  // 1. Get all roles
  const { data: roles, error: rolesError } = await supabase.from('roles').select('id, code, is_system');
  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return;
  }
  
  const superAdminRole = roles.find(r => r.code === 'SUPER_ADMIN' && r.is_system === true) || 
                         roles.find(r => r.code === 'SUPER_ADMIN');
                         
  if (!superAdminRole) {
    console.error("Could not find canonical SUPER_ADMIN role.");
    return;
  }
  
  console.log("Canonical SUPER_ADMIN role ID:", superAdminRole.id);
  
  // 2. Identify legacy roles to merge
  const legacyCodes = ['ROLE_SUPER_ADMIN', 'ADMIN_ROLE', 'ROLE_ADMIN'];
  const legacyRoles = roles.filter(r => 
    (legacyCodes.includes(r.code) || r.code.startsWith('SUPER_ADMIN_CLONE_')) 
    && r.id !== superAdminRole.id
  );
  
  if (legacyRoles.length === 0) {
    console.log("No legacy super admin roles found to migrate.");
    return;
  }
  
  const legacyRoleIds = legacyRoles.map(r => r.id);
  console.log(`Found ${legacyRoles.length} legacy roles to migrate:`, legacyRoles.map(r => r.code));
  
  // 3. Update user_roles
  console.log("Updating user_roles...");
  const { data: userRolesToUpdate, error: urFetchErr } = await supabase
    .from('user_roles')
    .select('id, user_id, role_id')
    .in('role_id', legacyRoleIds);
    
  if (urFetchErr) {
    console.error("Error fetching user_roles:", urFetchErr);
  } else if (userRolesToUpdate && userRolesToUpdate.length > 0) {
    console.log(`Migrating ${userRolesToUpdate.length} user_roles...`);
    for (const ur of userRolesToUpdate) {
      // Check if user already has SUPER_ADMIN role to avoid unique constraint violations
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', ur.user_id)
        .eq('role_id', superAdminRole.id)
        .maybeSingle();
        
      if (existing) {
        // Just delete the legacy one
        await supabase.from('user_roles').delete().eq('id', ur.id);
      } else {
        // Update to canonical
        await supabase.from('user_roles').update({ role_id: superAdminRole.id }).eq('id', ur.id);
      }
    }
  }
  
  // 4. Update user_master (primary role_id)
  console.log("Updating user_master...");
  const { error: umUpdateErr } = await supabase
    .from('user_master')
    .update({ role_id: superAdminRole.id })
    .in('role_id', legacyRoleIds);
    
  if (umUpdateErr) {
    console.error("Error updating user_master:", umUpdateErr);
  } else {
    console.log("Successfully updated user_master primary roles.");
  }
  
  // 5. Soft delete legacy roles
  console.log("Soft deleting legacy roles...");
  const { error: roleDelErr } = await supabase
    .from('roles')
    .update({ 
      is_deleted: true, 
      is_active: false, 
      deleted_at: new Date().toISOString() 
    })
    .in('id', legacyRoleIds);
    
  if (roleDelErr) {
    console.error("Error soft deleting roles:", roleDelErr);
  } else {
    console.log("Successfully soft deleted legacy roles.");
  }
  
  console.log("Migration complete!");
}

migrateRoles();
