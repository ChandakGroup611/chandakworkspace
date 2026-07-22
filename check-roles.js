const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRoles() {
  const { data, error } = await supabase.from('roles').select('*');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
checkRoles();
