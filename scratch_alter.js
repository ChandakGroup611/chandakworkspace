const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.rpc('query_db', { query_text: "ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS html_body TEXT;" });
  if (error) console.error(error);
  else console.log("Done");
}
run();
