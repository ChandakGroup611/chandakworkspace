const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
      .from("status_master")
      .select(`*`)
      .eq("id", "122114fb-f0eb-416f-9ae9-92a182913764");
      
  console.log("Error:", error);
  console.log("Status:", JSON.stringify(data, null, 2));
}

check();
