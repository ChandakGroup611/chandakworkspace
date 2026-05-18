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

async function checkRead() {
  console.log('Checking read access with ANON key...');
  const { data, error } = await supabase.from('issue_types').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success, data:', data);
  }
}

checkRead();
