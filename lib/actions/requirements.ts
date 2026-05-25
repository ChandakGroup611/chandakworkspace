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
