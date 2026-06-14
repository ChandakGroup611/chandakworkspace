const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('d:/adios/.env.local', 'utf8');
const supabaseUrlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const supabaseKeyMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());

async function check() {
  const { data: priorities } = await supabase.from('priority_master').select('*').eq('is_deleted', false);
  console.log("Priorities:");
  priorities.forEach(p => console.log(`${p.priority_name} - scope_id: ${p.scope_id}`));
  
  const { data: issueTypes } = await supabase.from('issue_types').select('*').eq('is_deleted', false);
  console.log("\nIssue Types:");
  issueTypes.forEach(i => console.log(`${i.name} - scope_id: ${i.scope_id}`));
}

check();
