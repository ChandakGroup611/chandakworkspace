const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
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
      return;
    }

    const users = authUsers.users;
    console.log(`Found ${users.length} users in auth.users.`);

    let syncedCount = 0;

    for (const user of users) {
      const fullName = user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || 'New Personnel';
      const userCode = 'USR-' + user.id.substring(0, 8);

      const { error: upsertError } = await supabase.from('user_master').upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        user_code: userCode,
        password_hash: 'SYNCED_FROM_AUTH_DUMMY_HASH',
        is_active: true,
        is_deleted: false
      }, { onConflict: 'id' });

      if (upsertError) {
        console.error(`Failed to sync user ${user.id}:`, upsertError);
      } else {
        syncedCount++;
      }
    }

    console.log(`Successfully synced ${syncedCount} users into user_master!`);

  } catch (err) {
    console.error("Script error:", err);
  }
}

run();
