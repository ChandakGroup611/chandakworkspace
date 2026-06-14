const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('requirements')
    .update({ business_value_id: 'Test String' })
    .eq('code', 'NON_EXISTENT_123'); // Just to test type cast, it will evaluate the query
    
  console.log("Update Error:", error);
}

main();
