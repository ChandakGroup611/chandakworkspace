const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(code)')
    .eq('user_id', '53b7dbae-6049-44a7-a9c1-4ba769b4c324');
  console.log("user_roles:", JSON.stringify(userRoles, null, 2));
}

main();
