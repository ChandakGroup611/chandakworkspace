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
    .maybeSingle();

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

  if (!links || links.length === 0) {
    const { data: reqToUpdate } = await supabaseAdmin.from('requirements').select('custom_fields').eq('id', reqId).single();
    const customFields = reqToUpdate?.custom_fields || {};
    customFields.completion_percentage = 0;
    await supabaseAdmin.from('requirements').update({ custom_fields: customFields }).eq('id', reqId);
    return;
  }

  const taskIds = links.map(l => l.task_id);
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('status_id, status_master(is_closed)')
    .in('id', taskIds)
    .eq('is_deleted', false);

  if (!tasks) return;

  const total = tasks.length;
  const completed = tasks.filter(t => (t.status_master as any)?.is_closed).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  const { data: reqToUpdate } = await supabaseAdmin.from('requirements').select('custom_fields').eq('id', reqId).single();
  const customFields = reqToUpdate?.custom_fields || {};
  customFields.completion_percentage = percentage;
  await supabaseAdmin.from('requirements').update({ custom_fields: customFields }).eq('id', reqId);
}

export async function handleRequirementUAT(reqId: string, result: 'PASS' | 'FAIL', comments: string, performedBy: string) {
  const isAuthorized = await canModifyRequirement(reqId, performedBy);
  if (!isAuthorized) throw new Error("Unauthorized to perform UAT.");

  if (result === 'PASS') {
    // Look up closed/completed state
    const { data: closedState } = await supabaseAdmin.from('status_master').select('id').eq('status_code', 'CLOSED').eq('scope_type', 'REQUIREMENT').maybeSingle();
    
    const updateData: any = { approval_status: 'Ready to Put to Use' };
    if (closedState) {
      updateData.status_id = closedState.id;
    }
    
    await supabaseAdmin.from('requirements').update(updateData).eq('id', reqId);
    
    await logActivityEvent('REQUIREMENT', reqId, 'UAT_PASS', null, { comments }, performedBy);
  } else {
    // FAIL -> Reopen cascade
    const { data: reopenState } = await supabaseAdmin.from('status_master').select('id').eq('is_reopen', true).eq('scope_type', 'REQUIREMENT').maybeSingle();
    if (reopenState) {
      await supabaseAdmin.from('requirements').update({ status_id: reopenState.id }).eq('id', reqId);
    }

    // Cascade reopen to all linked tasks
    const { data: links } = await supabaseAdmin.from('requirement_tasks').select('task_id').eq('requirement_id', reqId);
    if (links && links.length > 0) {
      const taskIds = links.map(l => l.task_id);
      const { data: taskReopenState } = await supabaseAdmin.from('status_master').select('id').eq('is_reopen', true).eq('scope_type', 'TASK').maybeSingle();
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
      target_release,
      objective, functional_scope, technical_scope, is_deleted, deleted_at, deleted_by, updated_at, custom_fields, due_date,
      source_ticket_id, requester_department_id, requirement_reason, budget_impact, estimated_effort, dependency_notes,
      start_date, expected_completion_date, actual_completion_date, requirement_type_id, business_criticality_id, business_value_id,
      project_id, sprint_id, release_version, owner_id, coordinator_id, tat_status, overdue_days, remaining_days, regulatory_mapping,
      requirement_details, requester_designation_id, intake_snapshot, put_to_use_date, delete_reason, delete_batch_id, amendment_version, revised_details,
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
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (workspaceId) {
    query = query.contains('custom_fields', { workspace_id: workspaceId });
  }

  const { data, error } = await query; console.log('FETCH REQS RESULT:', error, data ? data.length : 0);

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
  software_system_id?: string | null;
  module_id?: string | null;
  sub_module_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  priority_id?: string | null;
  scope?: string;
  department_id?: string | null;
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

  // Ensure a valid department_id is set
  let departmentId = payload.department_id;
  if (!departmentId && payload.created_by) {
    const { data: userDept } = await supabaseAdmin.from('user_master').select('department_id').eq('id', payload.created_by).single();
    if (userDept?.department_id) {
      departmentId = userDept.department_id;
    }
  }
  if (!departmentId) {
    const { data: dept } = await supabaseAdmin.from('departments').select('id').limit(1).single();
    departmentId = dept?.id;
  }

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
      department_id: departmentId,
      scope: payload.scope || reqScope || null,
      software_system_id: payload.software_system_id || null,
      module_id: payload.module_id || null,
      sub_module_id: payload.sub_module_id || null,
      category_id: payload.category_id || null,
      sub_category_id: payload.sub_category_id || null,
      priority_id: payload.priority_id || null
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
  const { hasPermission } = await import('@/lib/permissions');
  const isSuperAdmin = await hasPermission(performedBy, 'SUPER_ADMIN');
  if (!isSuperAdmin) throw new Error("Only SUPER_ADMIN can submit Requirement Analysis.");

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

  const { data: currentReq } = await supabaseAdmin.from('requirements').select('custom_fields, code, title').eq('id', reqId).single();
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
          business_impact: payload.business_impact || null,
          budget_impact: payload.budget_impact || null,
          estimated_resources: payload.estimated_resources || null,
          requirement_domain: payload.requirement_domain || null,
          target_system: payload.target_system || null,
          integrations: payload.integrations || null,
          data_privacy: payload.data_privacy || null,
          software_cost: payload.software_cost || null,
          dev_cost: payload.dev_cost || null,
          target_environment: payload.target_environment || null,
          hardware_needs: payload.hardware_needs || null,
          capex_amount: payload.capex_amount || null,
          opex_amount: payload.opex_amount || null,
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
          currentLevel++;
        }
      }
    }
    if (flowInserts.length > 0) {
      updatePayload.approval_status = 'Pending Approval';
      const firstApprover = flowInserts.find((f: any) => f.level === 1);
      if (firstApprover) updatePayload.current_assignee_id = firstApprover.approver_id;
      
      const { error: reqErr } = await supabaseAdmin.from('requirements').update(updatePayload).eq('id', reqId);
      if (reqErr) throw new Error("Failed to update requirement details: " + reqErr.message);

      await supabaseAdmin.from('requirement_approval_flow').delete().eq('requirement_id', reqId);
      const { error: flowErr } = await supabaseAdmin.from('requirement_approval_flow').insert(flowInserts);
      if (flowErr) throw new Error("Failed to insert approval flow: " + flowErr.message);

      const { dispatchNotification } = await import('@/lib/actions/notifications');
      const l1Approvers = flowInserts.filter((f: any) => f.level === 1);
      for (const approver of l1Approvers) {
        await dispatchNotification(approver.approver_id, 'Requirement Approval Pending', `Requirement ${currentReq?.code || reqId} ("${currentReq?.title || 'Untitled'}") is awaiting your approval.`, `/requirements/${reqId}?tab=approval`, 'REQUIREMENT', 'APPROVAL_PENDING').catch((e: any) => console.error("Failed to notify approver", e));
      }
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
  const isAdmin = await hasPermission(performedBy, 'SUPER_ADMIN');
  if (!canManage && !isAdmin) {
      throw new Error("Unauthorized: You do not have permission to generate approval flows.");
  }

  const { data: req } = await supabaseAdmin.from('requirements').select('*').eq('id', reqId).single();
  if (!req) throw new Error("Requirement not found");
  if (['Approved', 'SignedOff', 'Closed', 'Cancelled', 'Rejected'].includes(req.approval_status)) {
    throw new Error("Cannot alter approval flow on a closed or finalized requirement.");
  }
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
  const isSuperAdmin = await hasPermission(performedBy, 'SUPER_ADMIN');
  
  if (!isSuperAdmin && !canDelete) throw new Error('Only SUPER_ADMIN or users with REQUIREMENTS_DELETE permission can delete requirements.');

  // Check cross-logic: Are there any active tasks raised against this requirement?
  // We check via the `requirement_tasks` pivot table and join with `tasks`
  const { data: activeTasks, error: taskError } = await supabaseAdmin
    .from('requirement_tasks')
    .select('task_id, tasks!inner(is_deleted)')
    .eq('requirement_id', reqId)
    .eq('tasks.is_deleted', false);
    
  if (taskError) throw new Error('Failed to verify cross-logic: ' + taskError.message);
  
  if (activeTasks && activeTasks.length > 0) {
    throw new Error('Cannot delete this requirement because there are active tasks raised against it. Please delete those tasks first.');
  }

  // Soft delete the requirement so it can be viewed in the Trash Data module
  const { error } = await supabaseAdmin.from('requirements').update({ is_deleted: true }).eq('id', reqId);
  if (error) throw new Error('Failed to delete requirement: ' + error.message);
  revalidatePath('/requirements');
  return { success: true };
}

export async function updateRequirementIntake(reqId: string, payload: any, performedBy: string) {
  const isAuthorized = await canModifyRequirement(reqId, performedBy);
  if (!isAuthorized) throw new Error('Unauthorized to update this requirement.');
  const updatePayload: any = { 
    title: payload.title, 
    scope: payload.scope, 
    department_id: payload.department_id, 
    software_system_id: payload.software_system_id, 
    priority_id: payload.priority_id 
  };
  
  // Conditionally add new fields if provided in payload
  const optionalFields = [
    'target_release', 'story_points', 'estimated_effort', 'estimated_cost', 
    'budget_impact', 'start_date', 'expected_completion_date', 
    'acceptance_criteria', 'dependency_notes', 'requirement_reason'
  ];
  
  optionalFields.forEach(field => {
    if (payload[field] !== undefined) {
      updatePayload[field] = payload[field];
    }
  });
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

export async function fetchRequirementAnalyticsData() {
  const { unstable_noStore: noStore } = await import('next/cache');
  noStore();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { hasPermission } = await import('@/lib/permissions');
  const adminEmails = ["avinash2@gmail.com", "avinash.pise98@gmail.com", "chrome_superadmin@adios.com"];
  const isSuperAdminEmail = adminEmails.includes(user.email || '');
  const isAdmin = isSuperAdminEmail || await hasPermission(user.id, 'SUPER_ADMIN');

  const { data, error } = await supabaseAdmin.from('requirements').select(`
    id, code, title, scope, approval_status, current_assignee_id, created_at, updated_at, due_date, start_date, creator_id, requester_id, custom_fields,
    status:status_master(name:status_name, status_color, code:status_code),
    department:departments!requirements_department_id_fkey(name),
    priority:priority_master!requirements_priority_id_fkey(name:priority_name, priority_color),
    software_system:software_systems(name),
    module:software_modules(name),
    sub_module:software_submodules(name),
    requester:user_master!requirements_requester_id_fkey(full_name),
    assignee:user_master!requirements_current_assignee_id_fkey(full_name),
    requirement_approval_flow(approver_id)
  `).order('created_at', { ascending: false });

  if (error) {
    console.error("fetchRequirementAnalyticsData Error:", error);
    return [];
  }

  let filteredData = data || [];
  if (!isAdmin) {
    filteredData = filteredData.filter((r: any) => {
      if (r.creator_id === user.id) return true;
      if (r.requester_id === user.id) return true;
      if (r.current_assignee_id === user.id) return true;
      if (r.requirement_approval_flow && r.requirement_approval_flow.some((flow: any) => flow.approver_id === user.id)) return true;
      return false;
    });
  }

  // Fetch linked tasks separately to avoid complex join errors
  const reqIds = filteredData.map(r => r.id);
  let tasksMap: Record<string, any[]> = {};
  
  if (reqIds.length > 0) {
    const { data: links } = await supabaseAdmin.from('requirement_tasks').select('requirement_id, task_id').in('requirement_id', reqIds);
    if (links && links.length > 0) {
      const taskIds = links.map(l => l.task_id);
      const { data: tasksData } = await supabaseAdmin.from('tasks').select('id, status_master(is_closed)').in('id', taskIds).eq('is_deleted', false);
      
      if (tasksData) {
        const taskObjMap: Record<string, any> = {};
        tasksData.forEach(t => taskObjMap[t.id] = t);
        
        links.forEach(l => {
          if (!tasksMap[l.requirement_id]) tasksMap[l.requirement_id] = [];
          if (taskObjMap[l.task_id]) {
            tasksMap[l.requirement_id].push(taskObjMap[l.task_id]);
          }
        });
      }
    }
  }

  return filteredData.map((d: any) => {
    const tasks = tasksMap[d.id] || [];
    const taskCount = tasks.length;
    const closedTasks = tasks.filter((t: any) => t.status_master?.is_closed).length;
    const openTasks = taskCount - closedTasks;
    
    let dueDays = "—";
    if (d.due_date) {
      const now = new Date();
      now.setHours(0,0,0,0);
      const due = new Date(d.due_date);
      due.setHours(0,0,0,0);
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        dueDays = `Overdue by ${Math.abs(diffDays)} days`;
      } else if (diffDays === 0) {
        dueDays = "Due Today";
      } else {
        dueDays = `${diffDays} days remaining`;
      }
    }

    return {
      ...d,
      task_count: taskCount,
      task_summary: taskCount > 0 ? `${openTasks} Open, ${closedTasks} Closed` : "No Tasks",
      due_days: dueDays,
      status_name: d.approval_status || 'Draft',
      department_name: d.department?.name || "—",
      priority_name: d.priority?.name || "—",
      system_name: d.software_system?.name || "—",
      module_name: d.module?.name || "—",
      sub_module_name: d.sub_module?.name || "—",
      requester_name: d.requester?.full_name || "—",
      assignee_name: d.assignee?.full_name || "—",
    };
  });
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
  const { hasPermission } = await import('@/lib/permissions');
  const isAdmin = await hasPermission(performedBy, 'SUPER_ADMIN');

  if (action === 'SignOff') {
     if (!isAdmin) throw new Error("Only an administrator can Sign Off.");
     if (req.approval_status !== 'Pending SignOff') throw new Error("Requirement is not in Pending SignOff status.");
     await supabaseAdmin.from('requirements').update({ approval_status: 'Approved', current_assignee_id: null }).eq('id', finalReqId);
     await logActivityEvent('REQUIREMENT', finalReqId, 'APPROVAL_SIGNOFF', null, { remarks, override: true }, performedBy);
     if (req.requester_id && req.requester_id !== performedBy) {
       await dispatchNotification(req.requester_id, 'Requirement Signed Off', `Requirement ${req.code} has been completely Signed Off.`, `/requirements/${finalReqId}`, 'REQUIREMENT', 'STATUS_SIGNOFF').catch((e: any) => console.error(e));
     }

     const { data: reqCheck } = await supabaseAdmin.from('requirements').select('amendment_version').eq('id', finalReqId).single();
     if (reqCheck && reqCheck.amendment_version > 0) {
       await syncAmendmentToTasks(finalReqId, performedBy);
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
    if (isAdmin) {
      // Allow Admin to override and pick the first pending flow to progress the level
      targetFlow = levelFlows[0];
    } else {
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

      const { dispatchNotification } = await import('@/lib/actions/notifications');
      for (const flow of nextFlows) {
        await dispatchNotification(flow.approver_id, 'Requirement Approval Pending', `Requirement ${req.code} ("${req.title}") has reached level ${nextLevel} and is awaiting your approval.`, `/requirements/${finalReqId}?tab=approval`, 'REQUIREMENT', 'APPROVAL_PENDING').catch((e: any) => console.error("Failed to notify approver", e));
      }
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

export async function fetchRequirementApprovalFlow(reqId: string, _timestamp?: number) {
  const { unstable_noStore: noStore } = await import('next/cache');
  noStore();
  const { data, error } = await supabaseAdmin
    .from('requirement_approval_flow')
    .select(`
      id, level, status, actioned_at, remarks, 
      approver:user_master!requirement_approval_flow_approver_id_fkey(id, full_name, profile_photo, role:user_roles(role_master(role_name))),
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
       .maybeSingle();
       
     if (!existingMember) {
        throw new Error("Unauthorized: Assignee is not a member of the target workspace.");
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
        end_date,
        is_deleted
      )
    `)
    .eq('requirement_id', reqId)
    .order('linked_at', { ascending: false });

  if (error) {
    console.error("fetchLinkedTasks error:", error);
    return [];
  }
  
  if (!data) return [];
  const filteredData = data.filter((d: any) => d.task && !d.task.is_deleted);
  if (filteredData.length === 0) return [];
  
  // Extract all assignee IDs to fetch names
  const anyData = filteredData as any[];
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


export async function markRequirementPutToUse(reqId: string, putToUseDate: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  if (!user) return { error: 'Unauthenticated' };

  const { data: req } = await supabaseAdmin.from('requirements').select('approval_status').eq('id', reqId).single();
  if (!req) return { error: 'Requirement not found' };

  const { error } = await supabaseAdmin.from('requirements').update({
    approval_status: 'Closed',
    put_to_use_date: putToUseDate
  }).eq('id', reqId);

  if (error) return { error: error.message };

  await logActivityEvent('REQUIREMENT', reqId, 'PUT_TO_USE', { status: req.approval_status }, { status: 'Closed', put_to_use_date: putToUseDate }, user.id);
  revalidatePath(`/requirements/${reqId}`);
  return { success: true };
}

export async function syncAmendmentToTasks(reqId: string, performedBy: string, attachmentData?: { file_name: string, file_size: number, mime_type: string, storage_path: string }) {
  const { data: req } = await supabaseAdmin.from('requirements').select('amendment_version, revised_details, custom_fields').eq('id', reqId).single();
  if (!req || req.amendment_version === 0 || !req.revised_details) return;

  const { data: linkedTasks } = await supabaseAdmin.from('requirement_tasks').select('task_id').eq('requirement_id', reqId);
  if (!linkedTasks || linkedTasks.length === 0) return;
  const taskIds = linkedTasks.map((t: any) => t.task_id);

  // Filter out closed tasks
  const { data: activeTasks } = await supabaseAdmin.from('tasks')
    .select('id, description, assigned_to, custom_fields')
    .in('id', taskIds)
    .not('status_id', 'in', (
       await supabaseAdmin.from('status_master').select('id').in('status_code', ['CLOSED', 'RESOLVED']).then(res => res.data?.map(s => s.id) || [])
    ));
    
  if (!activeTasks || activeTasks.length === 0) return;

  const { dispatchNotification } = await import('@/lib/actions/notifications');
  
  // Retrieve attachmentData from requirement custom_fields if not explicitly passed
  let resolvedAttachmentData = attachmentData;
  if (!resolvedAttachmentData && req.custom_fields?.pending_amendment_attachment) {
    resolvedAttachmentData = req.custom_fields.pending_amendment_attachment;
    
    // Clear the pending attachment from requirement custom_fields now that it's being synced
    const newReqCustomFields = { ...req.custom_fields };
    delete newReqCustomFields.pending_amendment_attachment;
    await supabaseAdmin.from('requirements').update({ custom_fields: newReqCustomFields }).eq('id', reqId);
  }

  for (const task of activeTasks) {
    const customFields = task.custom_fields || {};
    customFields.pending_amendment = {
      version: req.amendment_version,
      revised_details: req.revised_details,
      attachment: resolvedAttachmentData ? {
        file_name: resolvedAttachmentData.file_name,
        file_url: 'storage:requirement-files:' + resolvedAttachmentData.storage_path,
        size: resolvedAttachmentData.file_size,
        file_type: resolvedAttachmentData.mime_type
      } : null
    };
    
    await supabaseAdmin.from('tasks').update({ custom_fields: customFields }).eq('id', task.id);
    
    // We log that an amendment is pending on the task
    await logActivityEvent('TASK', task.id, 'REQUIREMENT_AMENDED_PENDING', null, { 
       message: `Requirement amended to version ${req.amendment_version}. Pending acknowledgement.`,
    }, performedBy);

    if (task.assigned_to) {
       await dispatchNotification(task.assigned_to, 'Requirement Revised', `The requirement for your task has been revised (Version ${req.amendment_version}). Please open the task to acknowledge the updated details.`, `/tasks/${task.id}`, 'TASK', 'REQUIREMENT_AMENDED').catch(() => {});
    }
  }
}

export async function amendRequirement(reqId: string, revisedDetails: string, needsReapproval: boolean, attachmentData?: { file_name: string, file_size: number, mime_type: string, storage_path: string }) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  if (!user) return { error: 'Unauthenticated' };
  
  const { data: req } = await supabaseAdmin.from('requirements').select('amendment_version, code').eq('id', reqId).single();
  if (!req) return { error: 'Requirement not found' };

  const newVersion = (req.amendment_version || 0) + 1;
  
  await supabaseAdmin.from('requirements').update({
     amendment_version: newVersion,
     revised_details: revisedDetails
  }).eq('id', reqId);

  await logActivityEvent('REQUIREMENT', reqId, 'AMENDMENT_CREATED', null, { version: newVersion, revised_details: revisedDetails, needsReapproval, has_attachment: !!attachmentData }, user.id);

  if (attachmentData) {
    if (needsReapproval) {
       // Save to requirement custom fields to be picked up during sign-off
       const newReqCustomFields = { ...(req as any).custom_fields, pending_amendment_attachment: attachmentData };
       await supabaseAdmin.from('requirements').update({ custom_fields: newReqCustomFields }).eq('id', reqId);
    }
  }

  if (needsReapproval) {
     await supabaseAdmin.from('requirements').update({ approval_status: 'Pending' }).eq('id', reqId);
     await generateApprovalFlow(reqId, user.id);
  } else {
     // If no re-approval needed, auto-approve and immediately sync tasks
     await syncAmendmentToTasks(reqId, user.id, attachmentData);
  }

  revalidatePath(`/requirements/${reqId}`);
  return { success: true };
}
