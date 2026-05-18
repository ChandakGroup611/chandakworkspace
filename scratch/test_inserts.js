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

async function testInserts() {
  console.log('Testing insert on workspace_members...');
  const { data, error } = await supabase
    .from('workspace_members')
    .insert([{
      workspace_id: 'a1f8e8e8-a1a1-4a1a-b1b1-a1a1a1a1a1a1', // demo workspace
      user_id: '623fc865-eee6-4f72-b28a-314b0205b50b' // dummy uuid
    }]);
  console.log('workspace_members insert result:', error ? error.message : 'SUCCESS!');
}

testInserts();
