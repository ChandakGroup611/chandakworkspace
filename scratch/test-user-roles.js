const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('user_master').select('id, full_name, email, role_id, manager_id').eq('id', '53b7dbae-6049-44a7-a9c1-4ba769b4c324');
  console.log("Creator:", data);
  
  const { data: d2 } = await supabase.from('user_master').select('id, full_name, email, role_id, manager_id').eq('id', '06cb4e59-b0b3-45d7-b929-c526fc33c429');
  console.log("Assignee:", d2);
  
  // Who is the logged in user? Let's check all users to see who might be logged in.
  const { data: users } = await supabase.from('user_master').select('id, full_name, email, role_id, manager_id');
  console.log("All users:", users);
}
check();
