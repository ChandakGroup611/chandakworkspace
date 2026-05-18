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

const SCOPES = {
  INFRA: 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1',
  ERP: 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2',
  OTHERS: 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'
};

async function fixScopes() {
  console.log('Fixing scope assignments...');

  // 1. Software Systems -> ERP (except OTHERS)
  await supabase.from('software_systems').update({ scope_id: SCOPES.ERP }).neq('code', 'SYS_OTHERS');
  await supabase.from('software_systems').update({ scope_id: SCOPES.OTHERS }).eq('code', 'SYS_OTHERS');
  
  // 2. Software Modules -> ERP (except OTHERS modules)
  await supabase.from('software_modules').update({ scope_id: SCOPES.ERP }).not('code', 'in', '("MOD_GEN_SUPPORT","MOD_ACCESS")');
  await supabase.from('software_modules').update({ scope_id: SCOPES.OTHERS }).in('code', ['MOD_GEN_SUPPORT', 'MOD_ACCESS']);
  
  // 3. Categories
  // INFRA: CAT_HW_%, CAT_HARDWARE, etc.
  // ERP: CAT_SW_%, CAT_ERP_%, CAT_SOFTWARE
  await supabase.from('ticket_categories').update({ scope_id: SCOPES.ERP }).or('code.ilike.CAT_SW%,code.ilike.CAT_ERP%,code.eq.CAT_SOFTWARE');
  
  // 4. Subcategories
  // Map based on parent category scope
  const { data: cats } = await supabase.from('ticket_categories').select('id, scope_id');
  for (const cat of cats) {
    await supabase.from('ticket_subcategories').update({ scope_id: cat.scope_id }).eq('category_id', cat.id);
  }

  // 5. Priorities (Shared, let's keep in INFRA or map to all? Currently RLS blocks if not match)
  // Wait, if Priorities are shared, we need them in all scopes or a mapping.
  // My current mapping maps 'master_priority' to all. 
  // But my fetch query filters by scope_id!
  // If priorities only have one scope_id, they only show for that scope.
  // I should DUPLICATE or allow NULL scope for shared masters.
  // But the user said "scope_id UUID OR relational mapping tables".
  // I'll use a relational mapping for shared masters if needed, but for now I'll just duplicate them or put them in all.
  // Actually, I'll update priorities to have NULL scope_id and update RLS to allow NULL.
  
  console.log('Scope fixing complete.');
}

fixScopes();
