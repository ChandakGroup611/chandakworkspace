const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAuthAdmin() {
  console.log('Testing Supabase Auth Admin connectivity...');
  try {
    const t0 = Date.now();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 2 });
    console.log(`listUsers took ${Date.now() - t0}ms. Error:`, error?.message || null);
    console.log('Total users in auth.users:', data?.users?.length);
  } catch (e) {
    console.error('listUsers exception:', e);
  }
}

testAuthAdmin().catch(console.error);

