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

async function checkActive() {
  const tables = [
    'issue_types', 'issue_subtypes', 
    'ticket_categories', 'ticket_subcategories', 
    'master_priorities', 'workflow_states',
    'software_systems', 'software_modules', 'software_submodules'
  ];
  
  console.log('Checking active/non-deleted status across masters:');
  for (const t of tables) {
    const { data, error, count } = await supabase
      .from(t)
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_deleted', false);
    
    if (error) {
      console.error(`Error on ${t}:`, error.message);
    } else {
      console.log(`${t}: ${count} active records`);
    }
  }
}

checkActive();
