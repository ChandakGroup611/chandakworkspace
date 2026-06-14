const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('d:/adios/.env.local', 'utf8');
const supabaseUrlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const supabaseKeyMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());

async function add() {
  const types = [
    { code: 'REQ_NEW_FEATURE', name: 'New Feature', description: 'Development of entirely new functionality.', is_active: true, is_deleted: false, scope_id: null },
    { code: 'REQ_ENHANCEMENT', name: 'Enhancement', description: 'Improvement or addition to an existing feature.', is_active: true, is_deleted: false, scope_id: null },
    { code: 'REQ_BUG_FIX', name: 'Bug Fix / Defect', description: 'Resolution of an unexpected behavior or error.', is_active: true, is_deleted: false, scope_id: null },
    { code: 'REQ_PROCESS_IMP', name: 'Process Improvement', description: 'Change to improve efficiency or workflow.', is_active: true, is_deleted: false, scope_id: null },
    { code: 'REQ_COMPLIANCE', name: 'Compliance / Regulatory', description: 'Change required to meet legal or regulatory standards.', is_active: true, is_deleted: false, scope_id: null },
    { code: 'REQ_DATA_REPORT', name: 'Data & Reporting', description: 'Creation or modification of reports and data analytics.', is_active: true, is_deleted: false, scope_id: null },
    { code: 'REQ_INTEGRATION', name: 'Integration', description: 'Connecting system with an external or third-party service.', is_active: true, is_deleted: false, scope_id: null },
    { code: 'REQ_SECURITY', name: 'Security', description: 'Implementation of security measures or addressing vulnerabilities.', is_active: true, is_deleted: false, scope_id: null }
  ];

  const { data, error } = await supabase.from('issue_types').insert(types).select();
  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Successfully inserted requirement types:", data.length);
  }
}

add();
