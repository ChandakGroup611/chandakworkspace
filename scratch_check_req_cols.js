const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('d:/adios/.env.local', 'utf8');
const supabaseUrlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const supabaseKeyMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());

async function check() {
  const { data, error } = await supabase.rpc('get_schema');
  console.log("Using get_schema RPC...");
  // Let's just query a single requirement to see what keys exist.
  const { data: reqs } = await supabase.from('requirements').select('*').limit(1);
  console.log("Requirement columns:", reqs ? Object.keys(reqs[0] || {}) : "No reqs");
}

check();
