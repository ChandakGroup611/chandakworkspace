require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data, error } = await supabase.from('requirements').select('*').limit(1);
  if (data && data.length > 0) {
     console.log("Requirement columns:", Object.keys(data[0]));
     console.log("Requirement sample:", data[0]);
  } else {
     console.log("No requirements found.");
  }
}
inspect();
