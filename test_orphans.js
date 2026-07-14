const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: masters, error: mErr } = await supabaseAdmin.from('user_master').select('id, email, full_name');
  
  if (mErr) {
    console.error(mErr);
    return;
  }

  console.log(`Found ${masters.length} user_master records.`);

  // To check auth.users, we can use admin API to list users
  const { data: authUsersData, error: aErr } = await supabaseAdmin.auth.admin.listUsers();
  
  if (aErr) {
    console.error(aErr);
    return;
  }
  
  const authUsers = authUsersData.users;
  console.log(`Found ${authUsers.length} auth.users records.`);

  const orphanedMasters = masters.filter(m => !authUsers.some(a => a.id === m.id));
  console.log(`Found ${orphanedMasters.length} user_master records with NO matching auth.user ID:`);
  console.table(orphanedMasters.map(m => ({ id: m.id, email: m.email })));

  const duplicatedEmails = masters.filter(m => authUsers.some(a => a.email === m.email && a.id !== m.id));
  console.log(`Found ${duplicatedEmails.length} user_master records whose email exists in auth.users BUT with a DIFFERENT ID:`);
  console.table(duplicatedEmails.map(m => ({ id: m.id, email: m.email })));
}

run();
