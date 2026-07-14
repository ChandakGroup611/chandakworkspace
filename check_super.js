const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  const superUser = users.users.find(u => u.email === 'super@gmail.com');
  if (superUser) {
    console.log("User super@gmail.com exists with ID:", superUser.id);
    console.log("Attempting to reset password to 'Password@123'...");
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(superUser.id, { password: 'Password@123' });
    if (updateError) {
      console.log("Failed to update password:", updateError);
    } else {
      console.log("Password successfully reset to 'Password@123' for super@gmail.com");
    }
  } else {
    console.log("User super@gmail.com DOES NOT EXIST in auth.users.");
    console.log("Creating user super@gmail.com...");
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: 'super@gmail.com',
      password: 'Password@123',
      email_confirm: true
    });
    if (createError) {
      console.log("Failed to create user:", createError);
    } else {
      console.log("Successfully created super@gmail.com with password 'Password@123'. ID:", data.user.id);
    }
  }
}

main();
