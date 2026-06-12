"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { canModifyRequirement } from '@/lib/repositories/requirements';
import { logActivityEvent } from '@/lib/actions/tasks'; // Assuming we re-use the generic activity logger

export async function transitionRequirementStatus(reqId: string, newStatusId: string, performedBy: string) {
  const isAuthorized = await canModifyRequirement(reqId, performedBy);
  if (!isAuthorized) throw new Error("Unauthorized to transition requirement.");

  const { data: req } = await supabaseAdmin
    .from('requirements')
    .select('status_id')
    .eq('id', reqId)
    .single();

  if (!req) throw new Error("Requirement not found");

  const { data: transition } = await supabaseAdmin
    .from('workflow_transition_master')
    .select('*')
    .eq('from_status_id', req.status_id)
    .eq('to_status_id', newStatusId)
    .eq('is_active', true)
    .single();

  if (!transition) throw new Error("Invalid workflow transition.");

  // Check roles if required
  if (transition.allowed_role_id) {
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', performedBy)
      .eq('role_id', transition.allowed_role_id)
      .single();
    if (!roleCheck) throw new Error("Not authorized for this specific transition role.");
  }

  await supabaseAdmin
    .from('requirements')
    .update({ status_id: newStatusId, updated_at: new Date().toISOString() })
    .eq('id', reqId);

  await logActivityEvent('REQUIREMENT', reqId, 'STATUS_CHANGE', { status_id: req.status_id }, { status_id: newStatusId }, performedBy);
  revalidatePath(`/requirements/${reqId}`);
}

export async function generateRequirementTask(reqId: string, taskPayload: any, performedBy: string) {
  const isAuthorized = await canModifyRequirement(reqId, performedBy);
  if (!isAuthorized) throw new Error("Unauthorized to create tasks for this requirement.");

  // 1. Create the Task natively in the workspace
  const { createTask } = await import('@/lib/actions/tasks');
  const task = await createTask({
    ...taskPayload,
    created_by: performedBy
  });

  if (task && 'error' in task) {
    throw new Error((task as any).error);
  }

  // 2. Link Task to Requirement
  await supabaseAdmin.from('requirement_tasks').insert({
    requirement_id: reqId,
    task_id: task.id,
    linked_by: performedBy
  });

  // 3. Recalculate Completion Percentage
  await recalculateRequirementCompletion(reqId);

  await logActivityEvent('REQUIREMENT', reqId, 'TASK_GENERATED', null, { task_id: task.id, subject: task.subject }, performedBy);
  revalidatePath(`/requirements/${reqId}`);
  return task;
}

export async function recalculateRequirementCompletion(reqId: string) {
  const { data: links } = await supabaseAdmin
    .from('requirement_tasks')
    .select('task_id')
    .eq('requirement_id', reqId);

  if (!links || links.length === 0) return;

  const taskIds = links.map(l => l.task_id);
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('status_id, status_master(is_closed)')
    .in('id', taskIds);

  if (!tasks) return;

  const total = tasks.length;
  const completed = tasks.filter(t => (t.status_master as any)?.is_closed).length;
  const percentage = Math.round((completed / total) * 100);

  await supabaseAdmin.from('requirements').update({ completion_percentage: percentage }).eq('id', reqId);
}

export async function handleRequirementUAT(reqId: string, result: 'PASS' | 'FAIL', comments: string, performedBy: string) {
  const isAuthorized = await canModifyRequirement(reqId, performedBy);
  if (!isAuthorized) throw new Error("Unauthorized to perform UAT.");

  if (result === 'PASS') {
    // Look up closed/completed state
    const { data: closedState } = await supabaseAdmin.from('status_master').select('id').eq('status_code', 'CLOSED').eq('scope_type', 'REQUIREMENT').single();
    if (closedState) {
      await supabaseAdmin.from('requirements').update({ status_id: closedState.id }).eq('id', reqId);
    }
    await logActivityEvent('REQUIREMENT', reqId, 'UAT_PASS', null, { comments }, performedBy);
  } else {
    // FAIL -> Reopen cascade
    const { data: reopenState } = await supabaseAdmin.from('status_master').select('id').eq('is_reopen', true).eq('scope_type', 'REQUIREMENT').single();
    if (reopenState) {
      await supabaseAdmin.from('requirements').update({ status_id: reopenState.id }).eq('id', reqId);
    }

    // Cascade reopen to all linked tasks
    const { data: links } = await supabaseAdmin.from('requirement_tasks').select('task_id').eq('requirement_id', reqId);
    if (links && links.length > 0) {
      const taskIds = links.map(l => l.task_id);
      const { data: taskReopenState } = await supabaseAdmin.from('status_master').select('id').eq('is_reopen', true).eq('scope_type', 'TASK').single();
      if (taskReopenState) {
        await supabaseAdmin.from('tasks').update({ status_id: taskReopenState.id }).in('id', taskIds);
      }
    }

    await logActivityEvent('REQUIREMENT', reqId, 'UAT_FAIL', null, { comments }, performedBy);
    await recalculateRequirementCompletion(reqId); // Should drop back since tasks are reopened
  }

  revalidatePath(`/requirements/${reqId}`);
}

export async function fetchRequirements(workspaceId: string) {
  // Use filter on custom_fields since workspace_id column doesn't exist natively on requirements yet
  const { data, error } = await supabaseAdmin
    .from('requirements')
    .select(`
      *,
      status:status_master(name:status_name, status_color, code:status_code)
    `)
    .contains('custom_fields', { workspace_id: workspaceId })
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching requirements:", error);
    return [];
  }
  return data || [];
}

export async function createRequirement(payload: {
  workspace_id: string;
  sub_workspace_id?: string;
  requirement_code?: string;
  title: string;
  objective: string;
  functional_scope: string;
  technical_scope?: string;
  business_value?: string;
  risk_assessment?: string;
  custom_fields?: any;
  created_by: string;
  status_id?: string;
}) {
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
        .limit(1);
      
      if (firstActive && firstActive.length > 0) {
        statusId = firstActive[0].id;
      }
    }
  }

  // Find a valid department_id since the schema requires it and it's missing from the UI payload
  const { data: dept } = await supabaseAdmin.from('departments').select('id').limit(1).single();
  const departmentId = dept?.id;

  const code = payload.requirement_code || `REQ-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

  const customFields = {
    ...(payload.custom_fields || {}),
    workspace_id: payload.workspace_id,
    sub_workspace_id: payload.sub_workspace_id,
    business_value: payload.business_value,
    risk_assessment: payload.risk_assessment
  };

  const { data, error } = await supabaseAdmin
    .from('requirements')
    .insert([{
      code: code,
      title: payload.title,
      objective: payload.objective,
      functional_scope: payload.functional_scope,
      technical_scope: payload.technical_scope,
      custom_fields: customFields,
      creator_id: payload.created_by,
      status_id: (statusId && statusId.trim()) ? statusId : null,
      department_id: departmentId
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating requirement:", error);
    throw error;
  }
  
  await logActivityEvent('REQUIREMENT', data.id, 'CREATED', null, { title: data.title }, payload.created_by);
  revalidatePath('/requirements');
  return data;
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
      // Resolve eligible users from user_master
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
  revalidatePath(`/requirements/${reqId}`);
}


export async function submitRequirementAnalysis(reqId: string, payload: any, performedBy: string) {
  // 1. Authorization Check
  const { data: userRole } = await supabaseAdmin
    .from('user_roles')
    .select('role_master(role_code)')
    .eq('user_id', performedBy)
    .single();

  const isSuperAdmin = (userRole?.role_master as any)?.role_code === 'SUPER_ADMIN';
  if (!isSuperAdmin) {
    // Also check for Requirement Analyst role in future
    throw new Error("Only SUPER_ADMIN or authorized analysts can submit Requirement Analysis.");
  }

  // 2. Prepare Update Payload
  const updatePayload = {
    requirement_type_id: payload.requirement_type_id || null,
    objective: payload.objective,
    business_impact: payload.business_impact,
    business_value_id: payload.business_value_id || null,
    business_criticality_id: payload.business_criticality_id || null,
    functional_scope: payload.functional_scope,
    technical_scope: payload.technical_scope,
    risk_assessment: payload.risk_assessment,
    budget_impact: payload.budget_impact,
    estimated_effort: payload.estimated_effort,
    estimated_cost: payload.estimated_cost ? Number(payload.estimated_cost) : null,
    estimated_resources: payload.estimated_resources,
    regulatory_mapping: payload.regulatory_mapping,
    dependency_notes: payload.dependency_notes,
    start_date: payload.start_date,
    due_date: payload.due_date,
    expected_completion_date: payload.expected_completion_date || null,
    approval_status: 'Pending',
    updated_at: new Date().toISOString()
  };

  // 3. Update Requirement Record
  const { error: reqErr } = await supabaseAdmin
    .from('requirements')
    .update(updatePayload)
    .eq('id', reqId);

  if (reqErr) throw new Error("Failed to update requirement details: " + reqErr.message);

  // 4. Update Impacted Departments (Order Preservation)
  await supabaseAdmin.from('requirement_impacted_departments').delete().eq('requirement_id', reqId);
  if (payload.impacted_departments && payload.impacted_departments.length > 0) {
    const deptInserts = payload.impacted_departments.map((deptId: string, index: number) => ({
      requirement_id: reqId,
      department_id: deptId,
      display_order: index + 1
    }));
    await supabaseAdmin.from('requirement_impacted_departments').insert(deptInserts);
  }

  // 5. Build Dynamic Approval Snapshot
  await supabaseAdmin.from('requirement_approval_flow').delete().eq('requirement_id', reqId);
  if (payload.impacted_departments && payload.impacted_departments.length > 0) {
    const flowInserts: any[] = [];
    let currentLevel = 1;

    for (const deptId of payload.impacted_departments) {
      // Fetch the Approval Matrix for this department
      const { data: matrixRows } = await supabaseAdmin
        .from('requirement_approval_matrix')
        .select('*')
        .eq('department_id', deptId)
        .eq('is_active', true)
        .order('sequence', { ascending: true });

      if (matrixRows && matrixRows.length > 0) {
        for (const row of matrixRows) {
          // Resolve users by Designation and Department
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
      
      // Update Current Assignee to Level 1 Approvers (if it's ANY_ONE, assign it to the first active, else leave as null or store multiple in a JSON array)
      // Since `current_assignee_id` is a single UUID, we might assign it to the first user or create a generic routing.
      // For now, assign to the first pending user at level 1
      const firstApprover = flowInserts.find(f => f.level_no === 1);
      if (firstApprover) {
        await supabaseAdmin.from('requirements').update({ current_assignee_id: firstApprover.approver_id }).eq('id', reqId);
      }
    }
  }

  // 6. Handle Watchers, Stakeholders, CC
  const userMappings = [
    ...(payload.watchers || []).map((id: string) => ({ requirement_id: reqId, user_id: id, mapping_type: 'WATCHER' })),
    ...(payload.stakeholders || []).map((id: string) => ({ requirement_id: reqId, user_id: id, mapping_type: 'STAKEHOLDER' })),
    ...(payload.cc_users || []).map((id: string) => ({ requirement_id: reqId, user_id: id, mapping_type: 'CC' }))
  ];

  if (userMappings.length > 0) {
    // Delete existing
    await supabaseAdmin.from('requirement_watchers').delete().eq('requirement_id', reqId);
    await supabaseAdmin.from('requirement_watchers').insert(userMappings);
  }

  // 7. Audit Logging
  await logActivityEvent('REQUIREMENT', reqId, 'ANALYSIS_COMPLETED', null, { message: 'Business and Technical Analysis submitted.' }, performedBy);
  await logActivityEvent('REQUIREMENT', reqId, 'APPROVAL_INITIATED', null, { message: 'Dynamic Approval Snapshot generated based on Impacted Departments.' }, performedBy);

  revalidatePath(`/requirements/${reqId}`);
  revalidatePath(`/requirements`);
  return { success: true };
}


export async function processApprovalAction(reqId: string, action: string, remarks: string, performedBy: string) {
  // 1. Resolve Requirement
  const { data: req } = await supabaseAdmin
    .from('requirements')
    .select('id, code, current_assignee_id, approval_status, current_stage')
    .eq('id', reqId)
    .single();

  if (!req) throw new Error("Requirement not found.");

  // 2. Authorization Check (Is Active Approver OR Super Admin)
  const { data: userRole } = await supabaseAdmin
    .from('user_roles')
    .select('role_master(role_code)')
    .eq('user_id', performedBy)
    .single();

  const isSuperAdmin = (userRole?.role_master as any)?.role_code === 'SUPER_ADMIN';

  // Find the active approval row for this user
  const { data: activeFlows } = await supabaseAdmin
    .from('requirement_approval_flow')
    .select('*')
    .eq('requirement_id', reqId)
    .eq('status', 'Pending')
    .order('level_no', { ascending: true });

  if (!activeFlows || activeFlows.length === 0) {
    throw new Error("No pending approvals found for this requirement.");
  }

  const currentLevel = activeFlows[0].level_no;
  const levelFlows = activeFlows.filter(f => f.level_no === currentLevel);

  let targetFlow = levelFlows.find(f => f.approver_id === performedBy);
  if (!targetFlow) {
    if (!isSuperAdmin) {
      throw new Error("You are not authorized to approve at the current level.");
    }
    // Super Admin Override: Act on behalf of the first pending user at this level
    targetFlow = levelFlows[0];
  }

  // 3. Process Action
  const mappedStatus = action === 'Approve' ? 'Approved' :
                       action === 'Reject' ? 'Rejected' :
                       action === 'Hold' ? 'Hold' : 'Clarification';

  await supabaseAdmin
    .from('requirement_approval_flow')
    .update({
      status: mappedStatus,
      remarks: remarks,
      action_date: new Date().toISOString()
    })
    .eq('id', targetFlow.id);

  // Re-fetch level status to determine if we move to next level
  const { data: updatedLevelFlows } = await supabaseAdmin
    .from('requirement_approval_flow')
    .select('*')
    .eq('requirement_id', reqId)
    .eq('level_no', currentLevel);

  let levelComplete = false;
  let overallStatus = 'Pending';
  
  if (action === 'Reject') {
    levelComplete = true;
    overallStatus = 'Rejected';
    await supabaseAdmin.from('requirements').update({ approval_status: 'Rejected', current_stage: 'Closed' }).eq('id', reqId);
  } else if (action === 'Approve') {
    // Check mode
    const mode = targetFlow.approval_mode;
    if (mode === 'ANY_ONE') {
      levelComplete = true;
      // Auto-approve or bypass remaining users in this level
      await supabaseAdmin.from('requirement_approval_flow')
        .update({ status: 'Bypassed', remarks: 'Approved by another member' })
        .eq('requirement_id', reqId)
        .eq('level_no', currentLevel)
        .eq('status', 'Pending');
    } else {
      // ALL mode
      const allApproved = updatedLevelFlows?.every(f => f.status === 'Approved' || f.status === 'Bypassed');
      if (allApproved) {
        levelComplete = true;
      }
    }
  } else if (action === 'Hold' || action === 'Clarification') {
    await supabaseAdmin.from('requirements').update({ approval_status: mappedStatus }).eq('id', reqId);
  }

  // 4. Move to Next Level if Complete
  if (levelComplete && overallStatus !== 'Rejected') {
    const nextLevel = currentLevel + 1;
    const { data: nextFlows } = await supabaseAdmin
      .from('requirement_approval_flow')
      .select('*')
      .eq('requirement_id', reqId)
      .eq('level_no', nextLevel);

    if (nextFlows && nextFlows.length > 0) {
      // Activate next level
      await supabaseAdmin
        .from('requirement_approval_flow')
        .update({ status: 'Pending' })
        .eq('requirement_id', reqId)
        .eq('level_no', nextLevel);
      
      // Assign to first user of next level
      await supabaseAdmin.from('requirements').update({ current_assignee_id: nextFlows[0].approver_id }).eq('id', reqId);
    } else {
      // Fully Approved
      await supabaseAdmin.from('requirements').update({ 
        approval_status: 'Approved',
        current_stage: 'Planning', // Move to Planning stage
        current_assignee_id: null // Unassign or reassign to Owner
      }).eq('id', reqId);
      
      await logActivityEvent('REQUIREMENT', reqId, 'APPROVAL_COMPLETED', null, { message: 'All approval levels completed.' }, performedBy);
    }
  }

  // 5. Audit Logging
  await logActivityEvent('REQUIREMENT', reqId, 'APPROVAL_ACTION', null, { 
    action, 
    level: currentLevel,
    remarks,
    override: isSuperAdmin && targetFlow.approver_id !== performedBy 
  }, performedBy);

  revalidatePath(`/requirements/${reqId}`);
  return { success: true };
}
