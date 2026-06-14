require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data, error } = await supabase.rpc('get_schema_columns', { table_name: 'requirement_approval_flow' }).catch(() => ({}));
  if (data) {
     console.log("Via RPC:", data);
  } else {
     const { data: cols } = await supabase.from('requirement_approval_flow').select('*').limit(1);
     console.log("Columns:", Object.keys(cols[0] || {}));
  }
}
inspect();
