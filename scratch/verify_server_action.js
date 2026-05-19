const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const scopeId = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'; // INFRA

async function fetchMastersByScopeTest() {
  console.log(`[Diagnostic] Starting fetch for Scope ID: ${scopeId}`);

  // 1. Fetch scope master mappings
  const { data: mappings, error: mapError } = await supabase
    .from("scope_master_mapping")
    .select("master_key")
    .eq("scope_id", scopeId);

  if (mapError) {
    console.error("Error fetching scope mappings:", mapError.message);
    return;
  }

  const masterKeys = mappings.map(m => m.master_key);
  console.log("Scope Master Keys:", masterKeys);

  // 2. Fetch master records for each key
  for (const key of masterKeys) {
    let tableName = "";
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

    if (!tableName) {
      console.log(`Skipped key (no table mapped): ${key}`);
      continue;
    }

    let query = supabase.from(tableName).select("*");
    if (key === "workflow_state" || key === "master_priority") {
      query = query.or(`scope_id.eq.${scopeId},scope_id.is.null`);
    } else {
      query = query.eq("scope_id", scopeId);
    }

    const { data, error } = await query
      .eq("is_active", true)
      .eq("is_deleted", false);

    if (error) {
      console.error(`❌ Error fetching master key "${key}" from table "${tableName}":`, error.message);
    } else {
      console.log(`✅ Master key "${key}" fetched successfully: ${data.length} records found`);
    }
  }
}

fetchMastersByScopeTest();
