const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) throw authError;

  const { data: userMaster, error: umError } = await supabase.from('user_master').select('id');
  if (umError) throw umError;

  const umIds = new Set(userMaster.map(u => u.id));
  const missingUsers = users.filter(u => !umIds.has(u.id));

  console.log(`Auth users: ${users.length}`);
  console.log(`User Master users: ${userMaster.length}`);
  console.log(`Missing users in user_master: ${missingUsers.length}`);
}
check();
