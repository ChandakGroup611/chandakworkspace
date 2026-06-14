const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

const newCreateRequirement = `export async function createRequirement(payload: any) {
  let statusId = payload.status_id;
  if (!statusId) {
    const { data: defaultStatus } = await supabaseAdmin
      .from('status_master')
      .select('id')
      .eq('scope_type', 'REQUIREMENT')
      .eq('is_deleted', false)
      .eq('is_default', true)
      .maybeSingle();

    if (defaultStatus) {
      statusId = defaultStatus.id;
    } else {
      const { data: firstActive } = await supabaseAdmin
        .from('status_master')
        .select('id')
        .eq('scope_type', 'REQUIREMENT')
        .eq('is_deleted', false)
        .order('status_order', { ascending: true })
        .limit(1);
      
      if (firstActive && firstActive.length > 0) {
        statusId = firstActive[0].id;
      }
    }
  }

  // Find a valid department_id for the user
  let departmentId = payload.department_id;
  if (!departmentId) {
    const { data: dept } = await supabaseAdmin.from('departments').select('id').limit(1).single();
    departmentId = dept?.id;
  }

  const code = payload.requirement_code || \`REQ-\${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}\`;

  const customFields = {
    ...(payload.custom_fields || {}),
    workspace_id: payload.workspace_id,
    sub_workspace_id: payload.sub_workspace_id,
    business_value: payload.business_value,
    risk_assessment: payload.risk_assessment
  };

  const { data, error } = await supabaseAdmin.rpc('create_requirement_transaction', {
    p_workspace_id: payload.workspace_id || '',
    p_sub_workspace_id: payload.sub_workspace_id || '',
    p_requirement_code: code,
    p_title: payload.title,
    p_objective: payload.objective,
    p_functional_scope: payload.functional_scope,
    p_technical_scope: payload.technical_scope || '',
    p_business_value: payload.business_value || '',
    p_risk_assessment: payload.risk_assessment || '',
    p_custom_fields: customFields,
    p_created_by: payload.created_by,
    p_status_id: statusId || null,
    p_department_id: departmentId || null,
    p_scope: payload.scope || null,
    p_software_system_id: payload.software_system_id || null,
    p_module_id: payload.module_id || null,
    p_sub_module_id: payload.sub_module_id || null,
    p_category_id: payload.category_id || null,
    p_sub_category_id: payload.sub_category_id || null,
    p_priority_id: payload.priority_id || null,
    p_requirement_reason: payload.requirement_reason || null,
    p_requirement_details: payload.requirement_details || null,
    p_requester_id: payload.requester_id || null,
    p_requester_department_id: payload.requester_department_id || null,
    p_requester_designation_id: payload.requester_designation_id || null,
    p_intake_snapshot: payload.intake_snapshot || {}
  });

  if (error) {
    console.error('Error creating requirement:', error);
    throw error;
  }
  
  await logActivityEvent('REQUIREMENT', data.id, 'CREATED', null, { title: payload.title }, payload.created_by);
  revalidatePath('/requirements');
  return data;
}

`;

const createStart = content.indexOf('export async function createRequirement(');
const nextFuncStart = content.indexOf('export async function fetchRequirements(');

if (createStart !== -1 && nextFuncStart !== -1) {
    const before = content.slice(0, createStart);
    const after = content.slice(nextFuncStart);
    fs.writeFileSync('d:/adios/lib/actions/requirements.ts', before + newCreateRequirement + after);
}
