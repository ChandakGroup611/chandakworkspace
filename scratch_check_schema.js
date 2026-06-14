require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { error } = await supabase.from('requirement_approval_flow').insert([{ requirement_id: '539e4e10-184a-4a52-b832-066f3e591f8f', level: 1 }]);
  console.log('Error:', error);
}
check();
