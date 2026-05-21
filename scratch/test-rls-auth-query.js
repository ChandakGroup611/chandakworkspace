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
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Login as Super Admin to simulate
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'avinashpisetech@gmail.com', // Replace with real test user if different
    password: 'Password@123'
  });
  if (authError) {
    console.log("Auth Error:", authError.message);
    return;
  }
  
  console.log("Logged in as:", authData.user.id);
  const { data, error } = await supabase
    .from("workspaces")
    .select('*')
    .limit(1);

  console.log("Workspaces Error:", JSON.stringify(error));
  
  const { data: tData, error: tError } = await supabase
    .from("workspace_tasks")
    .select('*')
    .limit(1);

  console.log("Tasks Error:", JSON.stringify(tError));
}
check();
