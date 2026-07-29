const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/adios/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) console.error(error);
  else console.log("Buckets:", data.map(b => b.name));

  const { data: atts, error: e2 } = await supabase.from('attachments').select('*').limit(5);
  console.log("Attachments:", atts?.length);
}

check();
