const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching all deleted/scrambled profiles in user_master...");
  
  const { data: badUsers, error } = await supabase
    .from('user_master')
    .select('id, email, full_name')
    .eq('is_deleted', true)
    .like('email', 'deleted_dup_%');

  if (error) {
    console.error("Failed to fetch bad users:", error);
    return;
  }

  console.log(`Found ${badUsers.length} scrambled profiles.`);

  for (const user of badUsers) {
    console.log(`\nObliterating ${user.email} (ID: ${user.id})...`);
    
    // First, delete from auth.users (this will cascade to auth.identities)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteAuthError) {
      console.error(`  -> Failed to delete from auth.users: ${deleteAuthError.message}`);
    } else {
      console.log(`  -> Successfully deleted from auth.users & auth.identities.`);
    }

    // Now, physically delete from user_master (or leave it as is_deleted=true, but 
    // it's better to physically delete the row if there are no foreign key restrictions, 
    // but there might be logs tied to it. Let's just leave it as is_deleted = true in user_master, 
    // the important part is we removed the auth.users and auth.identities record!)
  }
  
  console.log("\nCleanup complete. The Microsoft SSO will now bind to the correct active ID.");
}

main();
