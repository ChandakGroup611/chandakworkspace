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

async function checkTable() {
  // We use rpc or just a select to see if it works
  const { data, error } = await supabase.from('ticket_scopes').select('*').limit(1);
  if (error) {
    console.error('Error selecting:', error.message);
  } else {
    console.log('Table exists, records:', data.length);
  }
}

checkTable();
