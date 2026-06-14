require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('activity_events').insert([{
      module_type: 'REQUIREMENT',
      record_id: '7bb3ae20-9eec-4216-b4b0-7d24af590fc6',
      event_type: 'ANALYSIS_COMPLETED',
      old_value: null,
      new_value: { test: true },
      performed_by: '53b7dbae-6049-44a7-a9c1-4ba769b4c324'
  }]);
  console.log('Error:', error);
  console.log('Data:', data);
}
check();
