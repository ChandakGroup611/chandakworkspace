const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
// We need the service role key to bypass RLS and use auth admin API
const SUPABASE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  try {
    // Check auth.users count
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error("Auth Users Error:", authError);
    } else {
      console.log(`auth.users count: ${authUsers.users.length}`);
    }

    // Check user_master count
    const { data: userMaster, error: umError, count } = await supabase
      .from('user_master')
      .select('id', { count: 'exact' });
    
    if (umError) {
      console.error("user_master Error:", umError);
    } else {
      console.log(`user_master count: ${count}`);
    }

    if (authUsers && authUsers.users.length > 0 && count === 0) {
      console.log("Hypothesis confirmed: Users exist in auth.users but not in user_master.");
      console.log("This usually happens when users are imported/migrated without firing triggers.");
    }

  } catch (err) {
    console.error("Script error:", err);
  }
}

run();
