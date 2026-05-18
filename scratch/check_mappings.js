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

async function checkMappings() {
  console.log('Checking scope_master_mapping table...');
  const { data, error } = await supabase.from('scope_master_mapping').select('*');
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Data count:', data.length);
    console.log('Data sample:', data.slice(0, 3));
  }
}

checkMappings();
