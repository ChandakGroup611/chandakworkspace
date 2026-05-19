const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const SCOPES = {
  INFRA: 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1',
  ERP: 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2',
  OTHERS: 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'
};

async function fetchMastersForScope(scopeId, scopeName) {
  console.log(`\n--------------------------------------------`);
  console.log(`🔍 FETCHING MASTERS FOR: ${scopeName} (${scopeId})`);
  console.log(`--------------------------------------------`);

  // 1. Resolve architectural mapping for the scope
  const { data: mappings, error: mapError } = await supabase
    .from('scope_master_mapping')
    .select('master_key')
    .eq('scope_id', scopeId);
  
  if (mapError) {
    console.error(`Error fetching mappings for scope ${scopeName}:`, mapError.message);
    return;
  }
  
  const masterKeys = mappings.map(m => m.master_key);
  console.log(`Resolved Master Keys:`, masterKeys);

  // 2. Query each mapped master using our new fallback rules
  for (const key of masterKeys) {
    let tableName = '';
    switch (key) {
      case "issue_type": tableName = "issue_types"; break;
      case "issue_subtype": tableName = "issue_subtypes"; break;
      case "ticket_category": tableName = "ticket_categories"; break;
      case "ticket_subcategory": tableName = "ticket_subcategories"; break;
      case "workflow_state": tableName = "workflow_states"; break;
      case "master_priority": tableName = "master_priorities"; break;
      case "asset": tableName = "assets"; break;
      case "software_system": tableName = "software_systems"; break;
      case "software_module": tableName = "software_modules"; break;
      case "software_submodule": tableName = "software_submodules"; break;
    }

    if (!tableName) continue;

    let query = supabase.from(tableName).select('*');
    if (key === "workflow_state" || key === "master_priority") {
      query = query.or(`scope_id.eq.${scopeId},scope_id.is.null`);
    } else {
      query = query.eq("scope_id", scopeId);
    }

    const { data, error } = await query
      .eq("is_active", true)
      .eq("is_deleted", false);

    if (error) {
      console.error(`❌ Failed to fetch ${key}:`, error.message);
    } else {
      console.log(`✅ ${key.padEnd(20)}: ${data.length} records found`);
      if (data.length > 0) {
        console.log(`   Sample:`, data.slice(0, 2).map(r => `${r.name || r.code || r.id} (${r.code})`));
      }
    }
  }
}

async function verifyAll() {
  await fetchMastersForScope(SCOPES.INFRA, 'IT Infrastructure (INFRA)');
  await fetchMastersForScope(SCOPES.ERP, 'ERP & Software Systems (ERP)');
  await fetchMastersForScope(SCOPES.OTHERS, 'General Inquiries (OTHERS)');
  console.log(`\n🎉 Verification run completed successfully!`);
}

verifyAll();
