const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Trying to create super@gmail.com...");
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'super@gmail.com',
    password: 'Password@123',
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin' }
  });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('User already exists')) {
      console.log("User already exists! We need to update their password.");
      
      // Since listUsers is broken, let's try to sign in to see if they exist.
      // We can't sign in if we don't know the password.
      // But we can reset the password by sending a recovery email? No, local supabase doesn't have an inbox.
      
      console.log("Error:", error.message);
      
      // Wait, is there a way to get the user ID by email? 
      // Supabase JS doesn't have getUserByEmail, but we can query public.user_master!
      const { data: userMaster, error: umError } = await supabase
        .from('user_master')
        .select('id')
        .eq('email', 'super@gmail.com')
        .single();
        
      if (userMaster) {
        console.log("Found user in user_master with ID:", userMaster.id);
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
        console.error("User not found in user_master either.");
      }
    } else {
      console.error("Create user failed:", error);
    }
  } else {
    console.log("Successfully created super@gmail.com! ID:", data.user.id);
    console.log("Password is: Password@123");
  }
}

main();
