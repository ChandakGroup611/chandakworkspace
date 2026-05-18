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

async function checkERPData() {
  const erpId = 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2';
  console.log('Checking records for ERP scope...');
  
  const tables = ['software_systems', 'software_modules', 'software_submodules', 'ticket_categories'];
  for (const t of tables) {
    const { count } = await supabase
      .from(t)
      .select('*', { count: 'exact' })
      .eq('scope_id', erpId)
      .eq('is_active', true)
      .eq('is_deleted', false);
    console.log(`${t} in ERP:`, count);
  }
}

checkERPData();
