const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/adios/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: "SELECT * FROM pg_policies WHERE tablename = 'attachments';" });
  if (error) {
    // try fallback
    const { data: q } = await supabase.from('attachments').select('*').limit(1);
    console.log("fallback:", q);
  } else {
    console.log("Policies:", data);
  }
}

check();
