const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// 1. fetchRequirements
const fetchReqsStart = content.indexOf('export async function fetchRequirements(');
let temp = content.slice(fetchReqsStart);
const fetchReqsEnd = fetchReqsStart + temp.indexOf('\n}\n') + 2;
const oldFetchReqs = content.slice(fetchReqsStart, fetchReqsEnd + 1);

// 2. createRequirement
const createReqStart = content.indexOf('export async function createRequirement(');
temp = content.slice(createReqStart);
const createReqEnd = createReqStart + temp.indexOf('\n}\n') + 2;
const oldCreateReq = content.slice(createReqStart, createReqEnd + 1);

// 3. fetchRequirement (id)
const fetchReqIdStart = content.indexOf('export async function fetchRequirement(');
temp = content.slice(fetchReqIdStart);
const fetchReqIdEnd = fetchReqIdStart + temp.indexOf('\n}\n') + 2;
const oldFetchReqId = content.slice(fetchReqIdStart, fetchReqIdEnd + 1);

const newFetchRequirements = `export async function fetchRequirements(workspaceId?: string | null) {
  let query = supabaseAdmin
    .from('requirements')
    .select(\`
      *,
      status:status_master(name:status_name, status_color, code:status_code),
      department:departments!requirements_department_id_fkey(name),
      priority:priority_master!requirements_priority_id_fkey(name),
      software_system:software_systems!requirements_software_system_id_fkey(name),
      module:software_modules!requirements_module_id_fkey(name),
      sub_module:software_submodules!requirements_sub_module_id_fkey(name),
      category:ticket_categories!requirements_category_id_fkey(name),
      sub_category:ticket_subcategories!requirements_sub_category_id_fkey(name),
      requester:user_master!requirements_requester_id_fkey(full_name),
      requester_department:departments!requirements_requester_department_id_fkey(name)
    \`)
    .eq('is_deleted', false);

  if (workspaceId) {
    query = query.contains('custom_fields', { workspace_id: workspaceId });
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching requirements:', error);
    return [];
  }
  return data || [];
}
`;

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

const newFetchReqId = `export async function fetchRequirement(reqId: string) {
  const { data, error } = await supabaseAdmin
    .from('requirements')
    .select(\`
      *, 
      status:status_master(name:status_name, status_color, code:status_code),
      department:departments!requirements_department_id_fkey(name),
      priority:priority_master!requirements_priority_id_fkey(name),
      software_system:software_systems!requirements_software_system_id_fkey(name),
      module:software_modules!requirements_module_id_fkey(name),
      sub_module:software_submodules!requirements_sub_module_id_fkey(name),
      category:ticket_categories!requirements_category_id_fkey(name),
      sub_category:ticket_subcategories!requirements_sub_category_id_fkey(name),
      requester:user_master!requirements_requester_id_fkey(full_name),
      requester_department:departments!requirements_requester_department_id_fkey(name)
    \`)
    .eq('id', reqId)
    .single();

  if (error) {
    console.error('Error fetching requirement:', error);
    return null;
  }
  return data;
}
`;

content = content.replace(oldFetchReqs, newFetchRequirements);
content = content.replace(oldCreateReq, newCreateRequirement);
content = content.replace(oldFetchReqId, newFetchReqId);

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
