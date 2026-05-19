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

async function executeUpdates() {
  console.log('🚀 Starting Scoped Master Database Realignment...');

  try {
    // 1. Globally Shared Masters: Priorities and Workflow States
    console.log('1. Setting global priorities and workflow states (scope_id = NULL)...');
    
    // Fetch all priorities
    const { data: priorities, error: prioErr } = await supabase.from('master_priorities').select('id');
    if (prioErr) throw prioErr;
    for (const p of priorities) {
      const { error } = await supabase.from('master_priorities').update({ scope_id: null }).eq('id', p.id);
      if (error) console.error(`Failed updating priority ${p.id}:`, error.message);
    }

    // Fetch all workflow states
    const { data: states, error: stateErr } = await supabase.from('workflow_states').select('id');
    if (stateErr) throw stateErr;
    for (const s of states) {
      const { error } = await supabase.from('workflow_states').update({ scope_id: null }).eq('id', s.id);
      if (error) console.error(`Failed updating workflow state ${s.id}:`, error.message);
    }

    // 2. Software Systems Alignment
    console.log('2. Aligning Software Systems...');
    const { error: sysOthersErr } = await supabase.from('software_systems').update({ scope_id: SCOPES.OTHERS }).eq('code', 'SYS_OTHERS');
    if (sysOthersErr) console.error('Error SYS_OTHERS:', sysOthersErr.message);

    const { error: sysErpErr } = await supabase.from('software_systems').update({ scope_id: SCOPES.ERP }).neq('code', 'SYS_OTHERS');
    if (sysErpErr) console.error('Error ERP systems:', sysErpErr.message);

    // 3. Software Modules Alignment
    console.log('3. Aligning Software Modules...');
    const { error: modOthersErr } = await supabase.from('software_modules').update({ scope_id: SCOPES.OTHERS }).in('code', ['MOD_GEN_SUPPORT', 'MOD_ACCESS']);
    if (modOthersErr) console.error('Error OTHERS modules:', modOthersErr.message);

    const { error: modErpErr } = await supabase.from('software_modules').update({ scope_id: SCOPES.ERP }).not('code', 'in', '("MOD_GEN_SUPPORT","MOD_ACCESS")');
    if (modErpErr) console.error('Error ERP modules:', modErpErr.message);

    // 4. Software Submodules Alignment
    console.log('4. Aligning Software Submodules based on parent modules...');
    const { data: modules, error: modGetErr } = await supabase.from('software_modules').select('id, scope_id');
    if (modGetErr) throw modGetErr;
    for (const m of modules) {
      const { error } = await supabase.from('software_submodules').update({ scope_id: m.scope_id }).eq('module_id', m.id);
      if (error) console.error(`Failed updating submodules for module ${m.id}:`, error.message);
    }

    // 5. Ticket Categories Alignment
    console.log('5. Aligning Ticket Categories...');
    const { error: catErpErr } = await supabase.from('ticket_categories').update({ scope_id: SCOPES.ERP }).in('code', ['ERP', 'BUG & ISSUE', 'REQUIREMENT', 'REPORTS']);
    if (catErpErr) console.error('Error ERP categories:', catErpErr.message);

    const { error: catInfraErr } = await supabase.from('ticket_categories').update({ scope_id: SCOPES.INFRA }).in('code', ['HARDWARE', 'CAT_HARDWARE', 'INSTALLATION', 'TEST']);
    if (catInfraErr) console.error('Error INFRA categories:', catInfraErr.message);

    // 6. Ticket Subcategories Alignment
    console.log('6. Aligning Ticket Subcategories based on parent categories...');
    const { data: categories, error: catGetErr } = await supabase.from('ticket_categories').select('id, scope_id');
    if (catGetErr) throw catGetErr;
    for (const c of categories) {
      const { error } = await supabase.from('ticket_subcategories').update({ scope_id: c.scope_id }).eq('category_id', c.id);
      if (error) console.error(`Failed updating subcategories for category ${c.id}:`, error.message);
    }

    // 7. Issue Types Alignment
    console.log('7. Aligning Issue Types...');
    const { error: typeOthersErr } = await supabase.from('issue_types').update({ scope_id: SCOPES.OTHERS }).in('code', ['TYPE_SERVICE_REQ', 'ISSUE']);
    if (typeOthersErr) console.error('Error OTHERS issue types:', typeOthersErr.message);

    const { error: typeErpErr } = await supabase.from('issue_types').update({ scope_id: SCOPES.ERP }).in('code', ['TYPE_REQUIREMENT', 'SOFTWARES']);
    if (typeErpErr) console.error('Error ERP issue types:', typeErpErr.message);

    const { error: typeInfraErr } = await supabase.from('issue_types').update({ scope_id: SCOPES.INFRA }).in('code', ['HARDWARE', 'LAPTOP NOT WORKING', 'OS', 'INSTALLATION']);
    if (typeInfraErr) console.error('Error INFRA issue types:', typeInfraErr.message);

    // 8. Issue Subtypes Alignment
    console.log('8. Aligning Issue Subtypes based on parent issue types...');
    const { data: types, error: typeGetErr } = await supabase.from('issue_types').select('id, scope_id');
    if (typeGetErr) throw typeGetErr;
    for (const t of types) {
      const { error } = await supabase.from('issue_subtypes').update({ scope_id: t.scope_id }).eq('issue_type_id', t.id);
      if (error) console.error(`Failed updating subtypes for issue type ${t.id}:`, error.message);
    }

    console.log('🎉 Scoped Master Database Realignment COMPLETE!');
  } catch (error) {
    console.error('❌ Failed executing updates:', error);
  }
}

executeUpdates();
