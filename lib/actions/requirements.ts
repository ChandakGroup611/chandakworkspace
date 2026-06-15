"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { canModifyRequirement } from '@/lib/repositories/requirements';
import { logActivityEvent } from '@/lib/actions/tasks'; // Assuming we re-use the generic activity logger
import { dispatchNotification } from '@/lib/actions/notifications';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

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

export async function fetchRequirements(workspaceId?: string | null) {
  let query = supabaseAdmin
    .from('requirements')
    .select(`
      id, code, title, scope, approval_status, current_assignee_id, created_at, creator_id, requester_id,
      status:status_master(name:status_name, status_color, code:status_code),
      department:departments!requirements_department_id_fkey(name),
      priority:priority_master!requirements_priority_id_fkey(name:priority_name, priority_color),
      software_system:software_systems(name),
      module:software_modules(name),
      sub_module:software_submodules(name),
      category:ticket_categories(name),
      sub_category:ticket_subcategories(name),
      requester:user_master!requirements_requester_id_fkey(full_name),
      requirement_approval_flow(level, status)
    `)
    .order('created_at', { ascending: false });

  if (workspaceId) {
    query = query.contains('custom_fields', { workspace_id: workspaceId });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching requirements:", error);
    return [];
  }

  if (data && data.length > 0) {
    const creatorIds = [...new Set(data.map(d => d.creator_id).filter(Boolean))];
    if (creatorIds.length > 0) {
      const { data: users } = await supabaseAdmin.from('user_master').select('id, full_name').in('id', creatorIds);
      if (users) {
        const userMap: Record<string, any> = {};
        users.forEach(u => userMap[u.id] = u);
        data.forEach(d => {
          if (d.creator_id && userMap[d.creator_id]) {
            (d as any).creator = userMap[d.creator_id];
          }
        });
      }
    }
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
  custom_fields?: any;
  created_by: string;
  status_id?: string;
}) {
  const { hasPermission } = await import('@/lib/permissions');
  const isAuthorized = await hasPermission(payload.created_by, 'REQUIREMENTS_CREATE');
  if (!isAuthorized) throw new Error("Unauthorized: Missing REQUIREMENTS_CREATE capability.");

  if (!payload.title || !payload.title.trim()) throw new Error("Validation Error: Requirement title is required.");
  if (!payload.objective || !payload.objective.trim()) throw new Error("Validation Error: Requirement objective is required.");

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

  let code = payload.requirement_code;
  
  // Override code with sequential format: PREFIX-REQ-YYYY-XXXXXX
  let prefix = "OTH";
  const reqScope = (payload as any).scope;
  if (reqScope === "ERP/SOFTWARE" || reqScope === "ERP") prefix = "ERP";
  else if (reqScope === "INFRA") prefix = "INF";
  
  const year = new Date().getFullYear();
  const searchPrefix = `${prefix}-REQ-${year}-`;
  
  const { data: latestReqs } = await supabaseAdmin
    .from('requirements')
    .select('code')
    .ilike('code', `${searchPrefix}%`)
    .order('code', { ascending: false })
    .limit(1);
    
  let nextNum = 1;
  if (latestReqs && latestReqs.length > 0 && latestReqs[0].code) {
    const parts = latestReqs[0].code.split('-');
    if (parts.length >= 4) {
      const lastNum = parseInt(parts[3], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
  }
  
  code = `${searchPrefix}${nextNum.toString().padStart(6, '0')}`;

  const customFields = {
    ...(payload.custom_fields || {}),
    workspace_id: payload.workspace_id,
    sub_workspace_id: payload.sub_workspace_id,
    business_value: payload.business_value
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

export async function submitRequirementAnalysis(reqId: string, payload: any, performedBy: string, action?: 'ACCEPT' | 'HOLD' | 'CANCEL' | 'SAVE') {
  const { data: userRole } = await supabaseAdmin.from('user_roles').select('roles(code)').eq('user_id', performedBy).single();
  const isSuperAdmin = (userRole?.roles as any)?.code === 'SUPER_ADMIN' || (userRole?.roles as any)?.code === 'ROLE_SUPER_ADMIN' || (userRole?.roles as any)?.code === 'ADMIN_ROLE' || (userRole?.roles as any)?.code === 'ROLE_ADMIN';
  if (!isSuperAdmin) throw new Error("Only SUPER_ADMIN or ADMIN_ROLE can submit Requirement Analysis.");

  if (action === 'CANCEL') {
     await supabaseAdmin.from('requirements').update({ approval_status: 'Cancelled' }).eq('id', reqId);
     await supabaseAdmin.from('requirement_approval_flow').update({ status: 'Cancelled' }).eq('requirement_id', reqId).eq('status', 'Pending');
     await logActivityEvent('REQUIREMENT', reqId, 'ANALYSIS_CANCELLED', null, { message: 'Requirement Analysis Cancelled.', remarks: payload.analysis_remarks }, performedBy);
     revalidatePath(`/requirements/${reqId}`);
     revalidatePath(`/requirements`);
     return { success: true };
  }
  if (action === 'HOLD') {
     await supabaseAdmin.from('requirements').update({ approval_status: 'On Hold' }).eq('id', reqId);
     await supabaseAdmin.from('requirement_approval_flow').update({ status: 'On Hold' }).eq('requirement_id', reqId).eq('status', 'Pending');
     await logActivityEvent('REQUIREMENT', reqId, 'ANALYSIS_HELD', null, { message: 'Requirement Analysis placed On Hold.', remarks: payload.analysis_remarks }, performedBy);
     revalidatePath(`/requirements/${reqId}`);
     revalidatePath(`/requirements`);
     return { success: true };
  }

  const { data: currentReq } = await supabaseAdmin.from('requirements').select('custom_fields').eq('id', reqId).single();
  const existingCustomFields = currentReq?.custom_fields || {};

  const updatePayload: any = {
    objective: payload.objective,
    functional_scope: payload.functional_scope,
    technical_scope: payload.technical_scope,
    start_date: payload.start_date || null,
    due_date: payload.due_date || null,
    business_criticality_id: payload.business_criticality_id || null,
    estimated_effort: payload.estimated_effort || null,
    dependency_notes: payload.dependency_notes || null,
    requirement_type_id: payload.requirement_type_id || null,
    custom_fields: {
      ...existingCustomFields,
      business_value: payload.business_value_id || null,
      estimated_cost: payload.estimated_cost,
      impacted_departments: payload.impacted_departments,
      department_approvers: payload.department_approvers
    },
    updated_at: new Date().toISOString()
  };

  if (action === 'SAVE') {
    const { error: saveErr } = await supabaseAdmin.from('requirements').update(updatePayload).eq('id', reqId);
    if (saveErr) throw new Error("Failed to save requirement details: " + saveErr.message);
    await logActivityEvent('REQUIREMENT', reqId, 'ANALYSIS_SAVED', null, { message: 'Business Analysis drafted.', remarks: payload.analysis_remarks }, performedBy);
    revalidatePath(`/requirements/${reqId}`);
    return { success: true };
  }

  // We will update the requirement status after successfully inserting the flow
  if (payload.impacted_departments && payload.impacted_departments.length > 0) {
    const flowInserts: any[] = [];
    let currentLevel = 1;
    for (const deptId of payload.impacted_departments) {
      const approverIds = payload.department_approvers?.[deptId] || [];
      if (approverIds.length > 0) {
        for (const userId of approverIds) {
          flowInserts.push({ 
            requirement_id: reqId, 
            level: currentLevel, 
            approver_id: userId, 
            department_id: deptId, 
            status: currentLevel === 1 ? 'Pending' : 'Awaiting Previous Level'
          });
        }
        currentLevel++;
      }
    }
    if (flowInserts.length > 0) {
      await supabaseAdmin.from('requirement_approval_flow').delete().eq('requirement_id', reqId);
      const { error: flowErr } = await supabaseAdmin.from('requirement_approval_flow').insert(flowInserts);
      if (flowErr) throw new Error("Failed to insert approval flow: " + flowErr.message);
      
      updatePayload.approval_status = 'Pending Approval';
      const firstApprover = flowInserts.find((f: any) => f.level === 1);
      if (firstApprover) updatePayload.current_assignee_id = firstApprover.approver_id;
      
      const { error: reqErr } = await supabaseAdmin.from('requirements').update(updatePayload).eq('id', reqId);
      if (reqErr) throw new Error("Failed to update requirement details: " + reqErr.message);
    } else {
      throw new Error("Please select at least one approver for the impacted departments.");
    }
  }

  await logActivityEvent('REQUIREMENT', reqId, 'ANALYSIS_COMPLETED', null, { message: 'Business and Technical Analysis accepted.', remarks: payload.analysis_remarks }, performedBy);
  revalidatePath(`/requirements/${reqId}`);
  revalidatePath(`/requirements`);
  return { success: true };
}

export async function fetchRequirementStatuses() {
  const { data, error } = await supabaseAdmin.from('status_master').select('*').eq('scope_type', 'REQUIREMENT').eq('is_deleted', false).order('status_order', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function generateApprovalFlow(reqId: string, performedBy: string) {
  const { hasPermission } = await import('@/lib/permissions');
  const canManage = await hasPermission(performedBy, 'REQUIREMENTS_MANAGE');
  const { data: userRole } = await supabaseAdmin.from('user_roles').select('roles(code)').eq('user_id', performedBy).single();
  const isAdmin = (userRole?.roles as any)?.code === 'SUPER_ADMIN' || (userRole?.roles as any)?.code === 'ROLE_SUPER_ADMIN' || (userRole?.roles as any)?.code === 'ADMIN_ROLE' || (userRole?.roles as any)?.code === 'ROLE_ADMIN';
  if (!canManage && !isAdmin) {
      throw new Error("Unauthorized: You do not have permission to generate approval flows.");
  }

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
      const { data: eligibleUsers } = await supabaseAdmin.from('user_master').select('id').eq('department_id', m.department_id).eq('designation_id', m.designation_id).eq('is_active', true).eq('is_deleted', false);
      if (eligibleUsers && eligibleUsers.length > 0) {
        for (const user of eligibleUsers) flowEntries.push({ requirement_id: reqId, level: currentGlobalLevel, department_id: m.department_id, approver_designation_id: m.designation_id, approver_id: user.id, status: 'PENDING' });
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

export async function deleteRequirement(reqId: string, performedBy: string) {
  const { hasPermission } = await import('@/lib/permissions');
  const canDelete = await hasPermission(performedBy, 'REQUIREMENTS_DELETE');
  const { data: userRoles } = await supabaseAdmin.from('user_roles').select('roles(code)').eq('user_id', performedBy);
  const isSuperAdmin = userRoles?.some((ur: any) => ur.roles?.code === 'SUPER_ADMIN' || ur.roles?.code === 'ROLE_SUPER_ADMIN');
  
  if (!isSuperAdmin && !canDelete) throw new Error('Only SUPER_ADMIN or users with REQUIREMENTS_DELETE permission can delete requirements.');
  const { error } = await supabaseAdmin.from('requirements').delete().eq('id', reqId);
  if (error) throw new Error('Failed to delete requirement: ' + error.message);
  revalidatePath('/requirements');
  return { success: true };
}

export async function updateRequirementIntake(reqId: string, payload: any, performedBy: string) {
  const isAuthorized = await canModifyRequirement(reqId, performedBy);
  if (!isAuthorized) throw new Error('Unauthorized to update this requirement.');
  const updatePayload = { title: payload.title, scope: payload.scope, department_id: payload.department_id, software_system_id: payload.software_system_id, priority_id: payload.priority_id };
  const { error } = await supabaseAdmin.from('requirements').update(updatePayload).eq('id', reqId);
  if (error) throw new Error('Failed to update requirement: ' + error.message);
  await logActivityEvent('REQUIREMENT', reqId, 'INTAKE_UPDATED', null, { message: 'Requirement intake details updated by Super Admin.' }, performedBy);
  revalidatePath('/requirements');
  revalidatePath(`/requirements/${reqId}`);
  return { success: true };
}

export async function fetchRequirementAuditLogs(reqId: string) {
  const { unstable_noStore: noStore } = await import('next/cache');
  noStore();
  const { data: logs, error } = await supabaseAdmin.from('activity_events').select('*').eq('module_type', 'REQUIREMENT').eq('record_id', reqId).order('performed_at', { ascending: false });
  if (error || !logs) return [];
  const userIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))];
  let usersMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabaseAdmin.from('user_master').select('id, full_name, email, profile_photo').in('id', userIds);
    if (usersData) usersData.forEach(u => usersMap[u.id] = u);
  }
  return logs.map(l => ({ ...l, user: usersMap[l.performed_by] || { full_name: 'System' } }));
}

export async function fetchRequirement(reqId: string) {
  const { unstable_noStore: noStore } = await import('next/cache');
  noStore();
  const { data, error } = await supabaseAdmin.from('requirements').select(`
    *, department:departments!requirements_department_id_fkey(name), status:status_master(name:status_name, status_color, code:status_code), priority:priority_master!requirements_priority_id_fkey(name:priority_name, priority_color), software_system:software_systems(name), module:software_modules(name), sub_module:software_submodules(name), category:ticket_categories(name), sub_category:ticket_subcategories(name), requester:user_master!requirements_requester_id_fkey(full_name)
  `).eq('id', reqId).single();
  if (error) return null;
  if (data && data.creator_id) {
    const { data: creatorData } = await supabaseAdmin.from('user_master').select('full_name').eq('id', data.creator_id).single();
    if (creatorData) data.creator = creatorData;
  }
  return data;
}

export async function processApprovalAction(reqId: string, action: string, remarks: string, performedBy: string) {
  let finalReqId = reqId;
  if (!reqId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data: idLookup } = await supabaseAdmin.from('requirements').select('id').eq('code', reqId).single();
    if (!idLookup) throw new Error(`Requirement not found for code: '${reqId}'`);
    finalReqId = idLookup.id;
  }

  const { data: req, error: reqErr } = await supabaseAdmin.from('requirements').select('id, code, title, requester_id, current_assignee_id, approval_status').eq('id', finalReqId).single();
  if (reqErr) throw new Error(`Requirement lookup failed for reqId '${finalReqId}': ${reqErr.message}`);
  if (!req) throw new Error(`Requirement not found for reqId: '${finalReqId}'`);
  const { data: userRole } = await supabaseAdmin.from('user_roles').select('roles(code)').eq('user_id', performedBy).single();
  const isAdmin = (userRole?.roles as any)?.code === 'SUPER_ADMIN' || (userRole?.roles as any)?.code === 'ROLE_SUPER_ADMIN' || (userRole?.roles as any)?.code === 'ADMIN_ROLE' || (userRole?.roles as any)?.code === 'ROLE_ADMIN';

  if (action === 'SignOff') {
     if (!isAdmin) throw new Error("Only an administrator can Sign Off.");
     if (req.approval_status !== 'Pending SignOff') throw new Error("Requirement is not in Pending SignOff status.");
     await supabaseAdmin.from('requirements').update({ approval_status: 'Approved', current_assignee_id: null }).eq('id', finalReqId);
     await logActivityEvent('REQUIREMENT', finalReqId, 'APPROVAL_SIGNOFF', null, { remarks, override: true }, performedBy);
     if (req.requester_id && req.requester_id !== performedBy) {
       await dispatchNotification(req.requester_id, 'Requirement Signed Off', `Requirement ${req.code} has been completely Signed Off.`, `/requirements/${finalReqId}`, 'REQUIREMENT', 'STATUS_SIGNOFF').catch((e: any) => console.error(e));
     }
     revalidatePath(`/requirements/${finalReqId}`);
     return { success: true };
  }

  const { data: activeFlows } = await supabaseAdmin.from('requirement_approval_flow').select('*').eq('requirement_id', finalReqId).eq('status', 'Pending').order('level', { ascending: true });
  if (!activeFlows || activeFlows.length === 0) throw new Error("No pending approvals found for this requirement.");
  const currentLevel = activeFlows[0].level;
  const levelFlows = activeFlows.filter(f => f.level === currentLevel);
  let targetFlow = levelFlows.find(f => f.approver_id === performedBy);
  if (!targetFlow) {
    await logActivityEvent(
      'REQUIREMENT', 
      finalReqId, 
      'UNAUTHORIZED_APPROVAL_ATTEMPT', 
      null, 
      { 
        action_attempted: action, 
        approval_level: currentLevel,
        role: isAdmin ? 'ADMIN' : 'USER'
      }, 
      performedBy
    );
    throw new Error("You are not authorized to approve at the current level.");
  }
  const mappedStatus = action === 'Approve' ? 'Approved' : action === 'Reject' ? 'Rejected' : action === 'Hold' ? 'Hold' : 'Clarification';
  await supabaseAdmin.from('requirement_approval_flow').update({ status: mappedStatus, remarks: remarks, actioned_at: new Date().toISOString() }).eq('id', targetFlow.id);
  const { data: updatedLevelFlows } = await supabaseAdmin.from('requirement_approval_flow').select('*').eq('requirement_id', finalReqId).eq('level', currentLevel);
  let levelComplete = false;
  let overallStatus = 'Pending';
  if (action === 'Reject') {
    levelComplete = true; overallStatus = 'Rejected';
    await supabaseAdmin.from('requirements').update({ approval_status: 'Rejected' }).eq('id', finalReqId);
  } else if (action === 'Approve') {
    levelComplete = true;
    await supabaseAdmin.from('requirement_approval_flow').update({ status: 'Bypassed', remarks: 'Level completed by another approver' }).eq('requirement_id', finalReqId).eq('level', currentLevel).eq('status', 'Pending');
  } else if (action === 'Hold' || action === 'Clarification') {
    await supabaseAdmin.from('requirements').update({ approval_status: mappedStatus }).eq('id', finalReqId);
  }
  if (levelComplete && overallStatus !== 'Rejected') {
    const nextLevel = currentLevel + 1;
    const { data: nextFlows } = await supabaseAdmin.from('requirement_approval_flow').select('*').eq('requirement_id', finalReqId).eq('level', nextLevel);
    if (nextFlows && nextFlows.length > 0) {
      await supabaseAdmin.from('requirement_approval_flow').update({ status: 'Pending' }).eq('requirement_id', finalReqId).eq('level', nextLevel);
      await supabaseAdmin.from('requirements').update({ current_assignee_id: nextFlows[0].approver_id }).eq('id', finalReqId);
    } else {
      await supabaseAdmin.from('requirements').update({ approval_status: 'Pending SignOff', current_assignee_id: null }).eq('id', finalReqId);
      await logActivityEvent('REQUIREMENT', finalReqId, 'APPROVAL_COMPLETED', null, { message: 'All approval levels completed. Awaiting final SignOff.' }, performedBy);
    }
  }
  await logActivityEvent('REQUIREMENT', finalReqId, 'APPROVAL_ACTION', null, { action, level: currentLevel, remarks, override: isAdmin && targetFlow.approver_id !== performedBy }, performedBy);
  if (req.requester_id && req.requester_id !== performedBy) {
    await dispatchNotification(req.requester_id, `Requirement ${action}`, `Requirement ${req.code} ("${req.title}") has been marked as ${action}.`, `/requirements/${finalReqId}`, 'REQUIREMENT', `STATUS_${action.toUpperCase()}`).catch((e: any) => console.error("Failed to notify requester", e));
  }
  revalidatePath(`/requirements/${finalReqId}`);
  return { success: true };
}

export async function fetchRequirementApprovalFlow(reqId: string) {
  const { unstable_noStore: noStore } = await import('next/cache');
  noStore();
  const { data, error } = await supabaseAdmin
    .from('requirement_approval_flow')
    .select(`
      id, level, status, actioned_at, remarks, 
      approver:user_master!requirement_approval_flow_approver_id_fkey(id, full_name, profile_photo),
      department:departments!requirement_approval_flow_department_id_fkey(id, name)
    `)
    .eq('requirement_id', reqId)
    .order('level', { ascending: true });
    
  if (error) {
    console.error("Error fetching approval flow:", error);
    return [];
  }
  return data || [];
}

export async function createTaskFromRequirement(reqId: string, workspaceId: string, subWorkspaceId: string | null, taskPayload: any) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Import task creation logic dynamically to avoid circular dependencies if any
  const { createTask } = await import('@/lib/actions/tasks');

  const payload = {
    ...taskPayload,
    workspace_id: subWorkspaceId || workspaceId,
    sub_workspace_id: null,
    created_by: user.id
  };

  // If we're creating a task in a specific workspace, ensure the assignee has 
  // explicit membership in it to satisfy the strict validate_task_assignment trigger.
  if (payload.workspace_id && payload.assigned_to) {
     const { data: existingMember } = await supabaseAdmin
       .from('workspace_members')
       .select('id')
       .eq('workspace_id', payload.workspace_id)
       .eq('user_id', payload.assigned_to)
       .limit(1)
       .single();
       
     if (!existingMember) {
        await supabaseAdmin.from('workspace_members').insert({
           workspace_id: payload.workspace_id,
           user_id: payload.assigned_to,
           role: 'member',
           is_deleted: false,
           is_active: true
        });
     }
  }

  const taskResult = await createTask(payload);
  if (taskResult.error) {
    throw new Error(`Failed to create task: ${taskResult.error}`);
  }

  const taskId = taskResult.id;

  // Link the task to the requirement
  const { error: linkErr } = await supabaseAdmin.from('requirement_tasks').insert([{
    requirement_id: reqId,
    task_id: taskId,
    linked_by: user.id
  }]);

  if (linkErr) {
    throw new Error(`Failed to link task to requirement: ${linkErr.message}`);
  }

  // Log activity event
  await logActivityEvent('REQUIREMENT', reqId, 'TASK_CREATED', null, {
    task_id: taskId,
    task_name: taskResult.subject,
    workspace_id: workspaceId
  }, user.id);

  // Update requirement status to 'In Progress' if it is currently 'Approved'
  const { data: reqData } = await supabaseAdmin.from('requirements').select('approval_status').eq('id', reqId).single();
  if (reqData && reqData.approval_status === 'Approved') {
    await supabaseAdmin.from('requirements').update({ approval_status: 'In Progress' }).eq('id', reqId);
    await logActivityEvent('REQUIREMENT', reqId, 'STATUS_UPDATE', { status: 'Approved' }, { status: 'In Progress' }, user.id);
  }

  revalidatePath(`/requirements/${reqId}`);
  return { success: true, taskId };
}

export async function fetchLinkedTasks(reqId: string) {
  const { data, error } = await supabaseAdmin
    .from('requirement_tasks')
    .select(`
      task_id,
      linked_at,
      task:tasks(
        id,
        subject,
        status:status_master(name:status_name, status_color),
        assigned_to,
        end_date
      )
    `)
    .eq('requirement_id', reqId)
    .order('linked_at', { ascending: false });

  if (error) {
    console.error("fetchLinkedTasks error:", error);
    return [];
  }
  
  if (!data || data.length === 0) return [];
  
  // Extract all assignee IDs to fetch names
  const anyData = data as any[];
  const assigneeIds = anyData.map(r => r.task?.assigned_to).filter(Boolean);
  
  if (assigneeIds.length > 0) {
     const { data: users } = await supabaseAdmin
       .from('user_master')
       .select('id, full_name')
       .in('id', assigneeIds);
       
     if (users) {
        anyData.forEach(r => {
           if (r.task && r.task.assigned_to) {
              const u = users.find(user => user.id === r.task.assigned_to);
              r.task.assigned_to_user = u ? { full_name: u.full_name } : null;
           }
        });
     }
  }

  return anyData;
}
