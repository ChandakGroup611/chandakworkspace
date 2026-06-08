const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runTrace() {
  // First get a user
  const { data: users } = await supabaseAdmin.from('user_master').select('id').limit(1);
  const uid = users[0]?.id;

  if (!uid) return console.log("No user found");

  // Create a client as the user
  const { data: { user, session }, error: authError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'admin@admin.com', // wait, we don't know the email.
  });
}
