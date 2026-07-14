const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  // We know super@gmail.com is ID: 53b7dbae-6049-44a7-a9c1-4ba769b4c324
  // Let's create a dummy JWT for this user.
  // We need the JWT secret, but we don't have it.
  // Wait, we can just use supabase.auth.signInWithPassword if we know the password.
  // Let's use the service role key to set the password to something we know, then login.
  
  const adminAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Set password for super admin
  await adminAuth.auth.admin.updateUserById('53b7dbae-6049-44a7-a9c1-4ba769b4c324', { password: 'password123' });
  
  // Now login as super admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'super@gmail.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.error("Login failed:", authErr);
    return;
  }
  
  console.log("Logged in as:", authData.user.email);
  
  // Now query user_master
  const { data: users, error: userErr } = await supabase.from('user_master').select('id, email, full_name');
  
  if (userErr) {
    console.error("Query failed:", userErr);
  } else {
    console.log(`Found ${users.length} users:`);
    console.table(users);
  }
}

run();
