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

async function checkIssueTypes() {
  console.log('Checking issue_types table...');
  const { data, error } = await supabase.from('issue_types').select('*');
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Data count:', data.length);
    console.log('Data scope distribution:');
    const dist = {};
    data.forEach(r => {
      dist[r.scope_id] = (dist[r.scope_id] || 0) + 1;
    });
    console.log(dist);
    console.log('Sample record:', data[0]);
  }
}

checkIssueTypes();
