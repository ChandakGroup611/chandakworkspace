const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('d:/adios/.env.local', 'utf8');
const supabaseUrlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const supabaseKeyMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());

async function add() {
  // First, delete the global requirement types we just added
  await supabase.from('issue_types').delete().is('scope_id', null).in('code', [
    'REQ_NEW_FEATURE', 'REQ_ENHANCEMENT', 'REQ_BUG_FIX', 'REQ_PROCESS_IMP', 
    'REQ_COMPLIANCE', 'REQ_DATA_REPORT', 'REQ_INTEGRATION', 'REQ_SECURITY'
  ]);

  const scopes = [
    'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', // IT INFRA
    'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', // ERP/SOFTWARE
    'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'  // OTHERS
  ];

  const types = [
    { code: 'REQ_NEW_FEATURE', name: 'New Feature', description: 'Development of entirely new functionality.', is_active: true, is_deleted: false },
    { code: 'REQ_ENHANCEMENT', name: 'Enhancement', description: 'Improvement or addition to an existing feature.', is_active: true, is_deleted: false },
    { code: 'REQ_BUG_FIX', name: 'Bug Fix / Defect', description: 'Resolution of an unexpected behavior or error.', is_active: true, is_deleted: false },
    { code: 'REQ_PROCESS_IMP', name: 'Process Improvement', description: 'Change to improve efficiency or workflow.', is_active: true, is_deleted: false },
    { code: 'REQ_COMPLIANCE', name: 'Compliance / Regulatory', description: 'Change required to meet legal or regulatory standards.', is_active: true, is_deleted: false },
    { code: 'REQ_DATA_REPORT', name: 'Data & Reporting', description: 'Creation or modification of reports and data analytics.', is_active: true, is_deleted: false },
    { code: 'REQ_INTEGRATION', name: 'Integration', description: 'Connecting system with an external or third-party service.', is_active: true, is_deleted: false },
    { code: 'REQ_SECURITY', name: 'Security', description: 'Implementation of security measures or addressing vulnerabilities.', is_active: true, is_deleted: false }
  ];

  const allTypes = [];
  for (const scope_id of scopes) {
    for (const t of types) {
      allTypes.push({ ...t, scope_id });
    }
  }

  const { data, error } = await supabase.from('issue_types').insert(allTypes).select();
  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Successfully inserted scoped requirement types:", data.length);
  }
}

add();
