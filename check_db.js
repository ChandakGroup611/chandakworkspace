const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  console.log("Creating test user in auth.users...");
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'test_trigger_crash_123@chandakgroup.com',
    password: 'password123',
    email_confirm: true
  });

  if (error) {
    console.error("FAILED to create user in auth.users. The trigger probably crashed!");
    console.error(error);
  } else {
    console.log("SUCCESSFULLY created user in auth.users:", data.user.id);
    
    // Check if user_master was created
    const { data: master, error: masterErr } = await supabase
      .from('user_master')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (masterErr) {
      console.error("FAILED to find user in user_master. Trigger did not insert it!", masterErr);
    } else {
      console.log("SUCCESSFULLY found user in user_master:", master);
    }
    
    // Cleanup
    await supabase.auth.admin.deleteUser(data.user.id);
  }
}

run();
