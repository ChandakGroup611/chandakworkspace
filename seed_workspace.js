const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log('Seeding user accounts for Chandak Workspace...');
  
  const users = [
    { email: 'komalp@chandak.com', password: 'password123', name: 'Komal P', roles: ['SUPER_ADMIN'] },
    { email: 'global-ops@enterprise.internal', password: 'SecuredAdminPass2026!', name: 'Global Ops', roles: ['SUPER_ADMIN'] },
    { email: 'auditor-bridge@enterprise.internal', password: 'AuditSecurePass2026!', name: 'Auditor', roles: ['ROLE_AUDITOR'] }
  ];

  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        full_name: u.name,
        provisioned_roles: u.roles,
        user_code: 'USR-' + Math.floor(1000 + Math.random() * 9000)
      }
    });

    if (error) {
      if (error.message.includes('already exists')) {
         console.log('- User already exists:', u.email);
      } else {
         console.error('X Failed to create', u.email, ':', error.message);
      }
    } else {
      console.log('✓ Successfully created', u.email, 'with ID:', data.user.id);
    }
  }
  console.log('Done!');
}

seed();
