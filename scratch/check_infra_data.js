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

async function checkScopeData() {
  const infraId = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1';
  console.log('Checking records for INFRA scope (active & non-deleted)...');
  
  const { data, count } = await supabase
    .from('issue_types')
    .select('*', { count: 'exact' })
    .eq('scope_id', infraId)
    .eq('is_active', true)
    .eq('is_deleted', false);
    
  console.log('Active Issue Types in INFRA:', count);
  console.log('Sample:', data);
}

checkScopeData();
