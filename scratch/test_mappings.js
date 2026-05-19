const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testFetch() {
  const scopeId = "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1"; // INFRA
  console.log("Starting test fetch of mappings directly...");

  const { data: mappings, error: mapError } = await supabase
    .from("scope_master_mapping")
    .select("master_key")
    .eq("scope_id", scopeId);

  if (mapError) {
    console.error("Error fetching mappings:", mapError);
    return;
  }

  console.log("Fetched mappings:", mappings);
  const masterKeys = mappings.map(m => m.master_key);

  const masterData = await Promise.all(masterKeys.map(async (key) => {
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
    
    if (!tableName) return { key, data: [] };

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("scope_id", scopeId)
      .eq("is_active", true)
      .eq("is_deleted", false);
    
    if (error) {
      console.warn(`[Masters] Failed to fetch ${key}:`, error.message);
      return { key, data: [] };
    }
    return { key, data: data || [] };
  }));

  console.log("Results of tables:");
  masterData.forEach(item => {
    console.log(`- ${item.key}: ${item.data.length} items`);
    if (item.data.length > 0) {
      console.log("  Sample:", item.data[0].name || item.data[0].code);
    }
  });
}

testFetch();
