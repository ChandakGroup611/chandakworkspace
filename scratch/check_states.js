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

async function checkStates() {
  console.log('Fetching workflow_states...');
  const { data, error } = await supabase
    .from('workflow_states')
    .select('*')
    .order('code');
    
  if (error) {
    console.error('Error fetching states:', error);
    return;
  }
  
  console.log('Found states count:', data.length);
  console.table(data.map(d => ({ id: d.id, code: d.code, name: d.name, module: d.module })));
}

checkStates();
