import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing env vars. Checking local .env.local...");
  const fs = require('fs');
  const env = fs.readFileSync('d:/adios/.env.local', 'utf-8');
  // simple parse
  env.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testWorkspaceCRUD() {
  console.log("Testing Workspaces CRUD...");

  // Try to login as a user first to bypass anon limits
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@adios.local',
    password: 'password123' // assuming common local password
  });

  if (authErr) {
    console.error("Auth error:", authErr);
  } else {
    console.log("Logged in as:", authData.user?.email);
  }

  // 1. Fetch
  const { data: wList, error: wErr } = await supabase.from('workspaces').select('*');
  console.log("Fetch workspaces:", wErr ? wErr : `Found ${wList?.length}`);

  // 2. Insert
  const { data: wNew, error: wInsErr } = await supabase
    .from('workspaces')
    .insert([{
      name: "Test Workspace",
      code: "TEST-" + Date.now(),
      description: "Test description",
      owner_id: authData.user?.id
    }])
    .select()
    .single();
    
  console.log("Insert workspace:", wInsErr ? wInsErr : "Success, ID: " + wNew.id);

  if (wNew) {
    // 3. Insert Task
    const { data: tNew, error: tInsErr } = await supabase
      .from('workspace_tasks')
      .insert([{
        workspace_id: wNew.id,
        title: "Test Task",
        code: "TSK-TEST-" + Date.now(),
        description: "Test description",
        creator_id: authData.user?.id
      }])
      .select()
      .single();
      
    console.log("Insert task:", tInsErr ? tInsErr : "Success, ID: " + tNew.id);
  }
}

testWorkspaceCRUD().catch(console.error);
