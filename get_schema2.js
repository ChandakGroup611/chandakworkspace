const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'd:/adios/.env.local';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['task_assignments', 'task_members', 'workspace_tasks', 'sub_tasks'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table}: ERROR - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`Table ${table} columns:`, Object.keys(data[0]));
    } else {
      console.log(`Table ${table}: Empty but exists.`);
    }
  }
}
check();
