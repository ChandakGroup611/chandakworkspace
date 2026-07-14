const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: userMaster, error: umError } = await supabase
    .from('user_master')
    .select('id')
    .eq('email', 'super@gmail.com')
    .single();
    
  if (userMaster) {
    console.log("Found super@gmail.com in user_master with ID:", userMaster.id);
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userMaster.id,
      { password: 'Password@123' }
    );
    if (updateError) {
      console.error("Failed to update password:", updateError);
    } else {
      console.log("Successfully reset password for super@gmail.com to Password@123");
    }
  } else {
    console.log("User not found in user_master. Trying to create...");
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'super@gmail.com',
      password: 'Password@123',
      email_confirm: true,
      user_metadata: { full_name: 'Super Admin' }
    });
    if (error) {
      console.log("Create user failed:", error);
    } else {
      console.log("Created successfully with password Password@123");
    }
  }
}

main();
