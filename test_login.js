const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Attempting to login with super@gmail.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'super@gmail.com',
    password: 'Password@123'
  });
  
  if (error) {
    console.error("Login failed:", error.message, error.status, error.code);
  } else {
    console.log("Login succeeded for:", data.user.id);
  }
}

main();
