require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Fetching all users with some department_id logic or user_departments...');
  // Lets check if user_departments exists
  const { data, error } = await supabase.from('user_departments').select('*').limit(5);
  if (error) {
    console.error('user_departments table not found or error:', error.message);
  } else {
    console.log('user_departments:', data);
  }
}
check();
