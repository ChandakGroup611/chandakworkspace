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
    .like('email', 'deleted_%');

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
      // Fallback: If auth.users deletion fails (maybe due to foreign keys), try just unlinking identities directly in SQL?
      // Since we can't run raw SQL without pg, let's hope it works.
    } else {
      console.log(`  -> Successfully deleted from auth.users & auth.identities.`);
    }

    // Now, physically delete from user_master
    const { error: deleteMasterError } = await supabase
        .from('user_master')
        .delete()
        .eq('id', user.id);
        
    if (deleteMasterError) {
       console.log(`  -> Failed to physically delete from user_master (might be foreign keys): ${deleteMasterError.message}`);
    } else {
       console.log(`  -> Physically wiped from user_master.`);
    }
  }
  
  console.log("\nCleanup complete.");
}

main();
