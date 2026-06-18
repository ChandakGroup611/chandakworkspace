require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addAnand() {
  const email = 'anand@gmail.com';
  const name = 'Anand Mohta';

  console.log(`Adding user: ${name} (${email})`);

  // 1. Create User in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    email_confirm: true,
    user_metadata: {
      name: name,
      full_name: name
    }
  });

  if (authError) {
    console.error('Error creating user in auth.users:', authError.message);
    if (!authError.message.includes('User already registered')) {
       return;
    }
  } else {
    console.log('Successfully created user in auth.users:', authData.user.id);
  }

  // Get user ID (either newly created or existing)
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }
  
  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error('User not found after creation.');
    return;
  }

  console.log('User ID is:', user.id);

  // 2. Insert into user_master
  const { data: masterData, error: masterError } = await supabase
    .from('user_master')
    .upsert({
      id: user.id,
      first_name: 'Anand',
      last_name: 'Mohta',
      email: email,
      is_active: true
    }, { onConflict: 'id' });

  if (masterError) {
    console.error('Error upserting user in user_master:', masterError.message);
  } else {
    console.log('Successfully added user to user_master!');
  }
}

addAnand();
