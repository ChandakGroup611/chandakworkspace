const fs = require('fs');

let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// Ensure dispatchNotification is imported
if (!content.includes('import { dispatchNotification }')) {
  content = content.replace(
    'import { logActivityEvent } from \'@/lib/actions/tasks\';',
    'import { logActivityEvent } from \'@/lib/actions/tasks\';\nimport { dispatchNotification } from \'@/lib/actions/notifications\';'
  );
}

// Fix fetchRequirements signature
content = content.replace(
  'export async function fetchRequirements() {',
  'export async function fetchRequirements(workspaceId?: string | null) {'
);

const missingFunctions = `

export async function submitRequirementAnalysis(reqId: string, payload: any, performedBy: string, action?: 'ACCEPT' | 'HOLD' | 'CANCEL') {
  // Authorization Check
  const { data: userRole } = await supabaseAdmin
    .from('user_roles')
    .select('role_master(role_code)')
    .eq('user_id', performedBy)
    .single();

  const isSuperAdmin = (userRole?.role_master as any)?.role_code === 'SUPER_ADMIN' || (userRole?.role_master as any)?.role_code === 'ADMIN_ROLE';
  if (!isSuperAdmin) {
    throw new Error("Only SUPER_ADMIN or ADMIN_ROLE can submit Requirement Analysis.");
  }

  if (action === 'CANCEL') {
     await supabaseAdmin.from('requirements').update({ current_stage: 'Cancelled', approval_status: 'Cancelled' }).eq('id', reqId);
     revalidatePath(\`/requirements/\${reqId}\`);
     revalidatePath(\`/requirements\`);
     return { success: true };
  }
  if (action === 'HOLD') {
     await supabaseAdmin.from('requirements').update({ current_stage: 'On Hold', approval_status: 'On Hold' }).eq('id', reqId);
     revalidatePath(\`/requirements/\${reqId}\`);
     revalidatePath(\`/requirements\`);
     return { success: true };
  }

  // ACCEPT Action
  const updatePayload = {
    objective: payload.objective,
    functional_scope: payload.functional_scope,
    technical_scope: payload.technical_scope,
    start_date: payload.start_date,
    due_date: payload.due_date,
    approval_status: 'Pending Approval',
    current_stage: 'Approval Flow Starts',
    updated_at: new Date().toISOString()
  };

  const { error: reqErr } = await supabaseAdmin
    .from('requirements')
    .update(updatePayload)
    .eq('id', reqId);

  if (reqErr) throw new Error("Failed to update requirement details: " + reqErr.message);

  await supabaseAdmin.from('requirement_approval_flow').delete().eq('requirement_id', reqId);
  if (payload.impacted_departments && payload.impacted_departments.length > 0) {
    const flowInserts: any[] = [];
    let currentLevel = 1;

    for (const deptId of payload.impacted_departments) {
      const { data: matrixRows } = await supabaseAdmin
        .from('requirement_approval_matrix')
        .select('*')
        .eq('department_id', deptId)
        .eq('is_active', true)
        .order('sequence', { ascending: true });

      if (matrixRows && matrixRows.length > 0) {
        for (const row of matrixRows) {
          const { data: eligibleUsers } = await supabaseAdmin
            .from('user_master')
            .select('id')
            .eq('department_id', deptId)
            .eq('designation_id', row.designation_id)
            .eq('is_active', true)
            .eq('is_deleted', false);

          if (eligibleUsers && eligibleUsers.length > 0) {
            for (const user of eligibleUsers) {
              flowInserts.push({
                requirement_id: reqId,
                level_no: currentLevel,
                approver_id: user.id,
                department_id: deptId,
                status: currentLevel === 1 ? 'Pending' : 'Awaiting Previous Level',
                approval_mode: row.approval_mode || 'ANY_ONE'
              });
            }
            currentLevel++;
          }
        }
      }
    }

    if (flowInserts.length > 0) {
      await supabaseAdmin.from('requirement_approval_flow').insert(flowInserts);
      const firstApprover = flowInserts.find((f: any) => f.level_no === 1);
      if (firstApprover) {
        await supabaseAdmin.from('requirements').update({ current_assignee_id: firstApprover.approver_id }).eq('id', reqId);
      }
    }
  }

  await logActivityEvent('REQUIREMENT', reqId, 'ANALYSIS_COMPLETED', null, { message: 'Business and Technical Analysis accepted.' }, performedBy);
  revalidatePath(\`/requirements/\${reqId}\`);
  revalidatePath(\`/requirements\`);
  return { success: true };
}

export async function fetchRequirementStatuses() {
  const { data, error } = await supabaseAdmin
    .from('status_master')
    .select('*')
    .eq('scope_type', 'REQUIREMENT')
    .eq('is_deleted', false)
    .order('status_order', { ascending: true });

  if (error) {
    console.error("Error fetching requirement statuses:", error);
    return [];
  }
  return data || [];
}

export async function generateApprovalFlow(reqId: string, performedBy: string) {
  const { data: req } = await supabaseAdmin.from('requirements').select('*').eq('id', reqId).single();
  if (!req) throw new Error("Requirement not found");

  const { data: impacts } = await supabaseAdmin.from('requirement_impacted_departments').select('department_id').eq('requirement_id', reqId).order('selection_order');
  if (!impacts || impacts.length === 0) throw new Error("No impacted departments defined");

  const deptIds = impacts.map(i => i.department_id);
  const { data: matrix } = await supabaseAdmin.from('requirement_approval_matrix').select('*').in('department_id', deptIds);

  let flowEntries = [];
  let currentGlobalLevel = 1;

  for (const impact of impacts) {
    const deptMatrix = matrix?.filter(m => m.department_id === impact.department_id).sort((a, b) => a.level - b.level) || [];
    for (const m of deptMatrix) {
      const { data: eligibleUsers } = await supabaseAdmin
        .from('user_master')
        .select('id')
        .eq('department_id', m.department_id)
        .eq('designation_id', m.designation_id)
        .eq('is_active', true)
        .eq('is_deleted', false);

      if (eligibleUsers && eligibleUsers.length > 0) {
        for (const user of eligibleUsers) {
          flowEntries.push({
            requirement_id: reqId,
            level: currentGlobalLevel,
            department_id: m.department_id,
            approver_designation_id: m.designation_id,
            approver_id: user.id,
            status: 'PENDING'
          });
        }
        currentGlobalLevel++;
      }
    }
  }

  if (flowEntries.length > 0) {
    await supabaseAdmin.from('requirement_approval_flow').delete().eq('requirement_id', reqId);
    await supabaseAdmin.from('requirement_approval_flow').insert(flowEntries);
  }

  await logActivityEvent('REQUIREMENT', reqId, 'APPROVAL_FLOW_GENERATED', null, { levels: currentGlobalLevel - 1 }, performedBy);
  revalidatePath(\`/requirements/\${reqId}\`);
}

export async function deleteRequirement(reqId: string, performedBy: string) {
  const { data: userRole } = await supabaseAdmin.from('user_roles').select('role_master(role_code)').eq('user_id', performedBy).single();
  const isSuperAdmin = (userRole?.role_master as any)?.role_code === 'SUPER_ADMIN';
  if (!isSuperAdmin) throw new Error('Only SUPER_ADMIN can delete requirements.');
  
  const { error } = await supabaseAdmin.from('requirements').delete().eq('id', reqId);
  if (error) throw new Error('Failed to delete requirement: ' + error.message);
  
  revalidatePath('/requirements');
  return { success: true };
}

export async function updateRequirementIntake(reqId: string, payload: any, performedBy: string) {
  const { data: userRole } = await supabaseAdmin.from('user_roles').select('role_master(role_code)').eq('user_id', performedBy).single();
  const isSuperAdmin = (userRole?.role_master as any)?.role_code === 'SUPER_ADMIN';
  if (!isSuperAdmin) throw new Error('Only SUPER_ADMIN can update requirement intake details directly.');
  
  const updatePayload = {
    title: payload.title,
    scope: payload.scope,
    department_id: payload.department_id,
    software_system_id: payload.software_system_id,
    priority_id: payload.priority_id
  };
  
  const { error } = await supabaseAdmin.from('requirements').update(updatePayload).eq('id', reqId);
  if (error) throw new Error('Failed to update requirement: ' + error.message);
  
  await logActivityEvent('REQUIREMENT', reqId, 'INTAKE_UPDATED', null, { message: 'Requirement intake details updated by Super Admin.' }, performedBy);
  revalidatePath('/requirements');
  revalidatePath(\`/requirements/\${reqId}\`);
  return { success: true };
}

export async function fetchRequirementAuditLogs(reqId: string) {
  const { data: logs, error } = await supabaseAdmin
    .from('activity_events')
    .select('*')
    .eq('module_type', 'REQUIREMENT')
    .eq('record_id', reqId)
    .order('performed_at', { ascending: false });

  if (error || !logs) return [];

  const userIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))];
  let usersMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabaseAdmin.from('users').select('id, full_name, email, avatar_url').in('id', userIds);
    if (usersData) {
      usersData.forEach(u => usersMap[u.id] = u);
    }
  }

  return logs.map(l => ({
    ...l,
    user: usersMap[l.performed_by] || { full_name: 'System' }
  }));
}

export async function fetchRequirement(reqId: string) {
  const { data, error } = await supabaseAdmin.from('requirements').select(\`
    *,
    department:departments!requirements_department_id_fkey(name),
    status:status_master(name:status_name, status_color, code:status_code),
    priority:priority_master!requirements_priority_id_fkey(name:priority_name),
    software_system:software_systems(name),
    module:software_modules(name),
    sub_module:software_submodules(name),
    category:ticket_categories(name),
    sub_category:ticket_subcategories(name),
    requester:user_master!requirements_requester_id_fkey(full_name)
  \`).eq('id', reqId).single();
  if (error) {
    console.error('Error fetching requirement:', error);
    return null;
  }
  
  if (data && data.creator_id) {
    const { data: creatorData } = await supabaseAdmin.from('user_master').select('full_name').eq('id', data.creator_id).single();
    if (creatorData) {
      data.creator = creatorData;
    }
  }
  
  return data;
}

export async function processApprovalAction(reqId: string, action: string, remarks: string, performedBy: string) {
  const { data: req } = await supabaseAdmin.from('requirements').select('id, code, title, requester_id, current_assignee_id, approval_status, current_stage').eq('id', reqId).single();
  if (!req) throw new Error("Requirement not found.");

  const { data: userRole } = await supabaseAdmin.from('user_roles').select('role_master(role_code)').eq('user_id', performedBy).single();
  const isSuperAdmin = (userRole?.role_master as any)?.role_code === 'SUPER_ADMIN';

  const { data: activeFlows } = await supabaseAdmin.from('requirement_approval_flow').select('*').eq('requirement_id', reqId).eq('status', 'Pending').order('level_no', { ascending: true });
  if (!activeFlows || activeFlows.length === 0) throw new Error("No pending approvals found for this requirement.");

  const currentLevel = activeFlows[0].level_no;
  const levelFlows = activeFlows.filter(f => f.level_no === currentLevel);

  let targetFlow = levelFlows.find(f => f.approver_id === performedBy);
  if (!targetFlow) {
    if (!isSuperAdmin) throw new Error("You are not authorized to approve at the current level.");
    targetFlow = levelFlows[0];
  }

  const mappedStatus = action === 'Approve' ? 'Approved' : action === 'Reject' ? 'Rejected' : action === 'Hold' ? 'Hold' : 'Clarification';

  await supabaseAdmin.from('requirement_approval_flow').update({ status: mappedStatus, remarks: remarks, action_date: new Date().toISOString() }).eq('id', targetFlow.id);

  const { data: updatedLevelFlows } = await supabaseAdmin.from('requirement_approval_flow').select('*').eq('requirement_id', reqId).eq('level_no', currentLevel);

  let levelComplete = false;
  let overallStatus = 'Pending';
  
  if (action === 'Reject') {
    levelComplete = true;
    overallStatus = 'Rejected';
    await supabaseAdmin.from('requirements').update({ approval_status: 'Rejected', current_stage: 'Closed' }).eq('id', reqId);
  } else if (action === 'Approve') {
    if (targetFlow.approval_mode === 'ANY_ONE') {
      levelComplete = true;
      await supabaseAdmin.from('requirement_approval_flow').update({ status: 'Bypassed', remarks: 'Approved by another member' }).eq('requirement_id', reqId).eq('level_no', currentLevel).eq('status', 'Pending');
    } else {
      if (updatedLevelFlows?.every(f => f.status === 'Approved' || f.status === 'Bypassed')) levelComplete = true;
    }
  } else if (action === 'Hold' || action === 'Clarification') {
    await supabaseAdmin.from('requirements').update({ approval_status: mappedStatus }).eq('id', reqId);
  }

  if (levelComplete && overallStatus !== 'Rejected') {
    const nextLevel = currentLevel + 1;
    const { data: nextFlows } = await supabaseAdmin.from('requirement_approval_flow').select('*').eq('requirement_id', reqId).eq('level_no', nextLevel);

    if (nextFlows && nextFlows.length > 0) {
      await supabaseAdmin.from('requirement_approval_flow').update({ status: 'Pending' }).eq('requirement_id', reqId).eq('level_no', nextLevel);
      await supabaseAdmin.from('requirements').update({ current_assignee_id: nextFlows[0].approver_id }).eq('id', reqId);
    } else {
      await supabaseAdmin.from('requirements').update({ approval_status: 'Approved', current_stage: 'Planning', current_assignee_id: null }).eq('id', reqId);
      await logActivityEvent('REQUIREMENT', reqId, 'APPROVAL_COMPLETED', null, { message: 'All approval levels completed.' }, performedBy);
    }
  }

  await logActivityEvent('REQUIREMENT', reqId, 'APPROVAL_ACTION', null, { action, level: currentLevel, remarks, override: isSuperAdmin && targetFlow.approver_id !== performedBy }, performedBy);

  if (req.requester_id && req.requester_id !== performedBy) {
    await dispatchNotification(
      req.requester_id,
      \`Requirement \${action}\`,
      \`Requirement \${req.code} ("\${req.title}") has been marked as \${action}.\`,
      \`/requirements/\${reqId}\`,
      'REQUIREMENT',
      \`STATUS_\${action.toUpperCase()}\`
    ).catch(e => console.error("Failed to notify requester", e));
  }

  revalidatePath(\`/requirements/\${reqId}\`);
  return { success: true };
}
`;

// Only add if not present to avoid duplication
if (!content.includes('export async function fetchRequirement(')) {
  content += missingFunctions;
} else {
  console.log('Functions already present! Proceeding to overwrite just in case.');
  // If we had a partial messed up state, we would manually slice it, but we did git restore so we know it's not present.
}

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
console.log('Final restore complete!');
