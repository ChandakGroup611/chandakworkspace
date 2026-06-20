require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  console.log("Starting test...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  console.log("URL:", supabaseUrl);
  console.log("KEY prefix:", supabaseKey ? supabaseKey.substring(0, 10) : "Missing");

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Calling getUser()...");
  try {
    const { data, error } = await supabase.auth.getUser();
    console.log("getUser() finished.");
    console.log("Data:", data);
    console.log("Error:", error);
  } catch (e) {
    console.log("Exception:", e);
  }
  process.exit(0);
}

main();
