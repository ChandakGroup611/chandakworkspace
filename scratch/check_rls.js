const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('query', { 
    query_text: "SELECT polname, polcmd, polqual, polwithcheck FROM pg_policy WHERE polrelid = 'user_master'::regclass;" 
  });
  console.log('RLS:', data || error);
}

check().catch(console.error);
