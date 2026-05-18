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

async function seedStates() {
  console.log('Seeding missing states ST_CLOSED and ST_REOPEN into workflow_states table...');
  const { data, error } = await supabase
    .from('workflow_states')
    .insert([
      { code: 'ST_CLOSED', name: 'Closed State', module: 'tickets' },
      { code: 'ST_REOPEN', name: 'Reopened State', module: 'tickets' }
    ])
    .select();
    
  if (error) {
    console.error('Error seeding states:', error);
    return;
  }
  
  console.log('Seeded states successfully:', data);
}

seedStates();
