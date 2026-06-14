const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  await supabase.from('ticket_categories').delete().eq('code', 'TEST_DUP');
  
  const { error: insertError } = await supabase.from('ticket_categories').insert({ code: 'TEST_DUP', name: 'Test', scope_id: 1 });
  if (insertError) console.log("Insert 1 error:", insertError);
  else console.log("Insert 1 success");
  
  const { error: dupError } = await supabase.from('ticket_categories').insert({ code: 'TEST_DUP', name: 'Test2', scope_id: 2 });
  if (dupError) console.log("Insert 2 error:", dupError);
  else console.log("Insert 2 success");
  
  await supabase.from('ticket_categories').delete().eq('code', 'TEST_DUP');
}
check();
