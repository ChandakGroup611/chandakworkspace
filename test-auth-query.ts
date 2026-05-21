import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, anonKey);

async function check() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'system@adios.enterprise',
    password: 'password123'
  });
  
  if (authErr) {
    console.log("Login failed:", authErr);
    
    // try to login with first user found via service key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    const adminSupabase = createClient(supabaseUrl, serviceKey);
    const { data: users } = await adminSupabase.from("user_master").select("email").limit(1);
    if (users && users.length > 0) {
      console.log("Found user:", users[0].email);
      // We can't really login without password. We can just print that we couldn't test.
    }
    return;
  }
  
  console.log("Logged in as:", authData.user?.email);
  
  const { data, error } = await supabase
    .from("user_master")
    .select("id, full_name, email, user_code")
    .limit(5);
    
  console.log("Select User Master Error:", error);
  console.log("Data:", data);
}

check();
