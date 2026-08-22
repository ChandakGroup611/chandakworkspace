const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('user_dashboard_preferences')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching user_dashboard_preferences:', error);
  } else {
    console.log('Success, table exists. Data:', data);
  }
}

checkSchema();
