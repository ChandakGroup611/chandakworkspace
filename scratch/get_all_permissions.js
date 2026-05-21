const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) config[key.trim()] = value.trim();
});

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermissions() {
  const { data: perms, error: err1 } = await supabase.from('permissions').select('*');
  const { data: roles, error: err2 } = await supabase.from('roles').select('*');
  
  if (err1 || err2) {
    console.error('Error:', err1?.message || err2?.message);
    return;
  }
  
  console.log('--- PERMISSIONS ---');
  console.log(JSON.stringify(perms, null, 2));
  console.log('--- ROLES ---');
  console.log(JSON.stringify(roles, null, 2));
}

checkPermissions();
