"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { dispatchNotification } from '@/lib/actions/notifications';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function createTask(payload: {
  workspace_id: string;
  subject?: string;
  title?: string;
  description?: string;
  priority_id: string;
  start_date?: string;
  end_date?: string;
  estimated_hours?: number;
  custom_fields?: any;
  created_by: string;
  assigned_team_ids?: string[];
  checklist_items?: string[];
}) {
  // Find default status for tasks
  const { data: statusMaster } = await supabaseAdmin
    .from('status_master')
    .select('id')
    .eq('is_default', true)
    .eq('scope_type', 'TASK')
    .eq('is_deleted', false)
    .single();

  if (!statusMaster) {
    throw new Error('No default task status found in status_master');
  }

  // Create Task
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert([{
      workspace_id: payload.workspace_id,
      subject: payload.subject || payload.title || 'Untitled Task',
      description: payload.description,
      priority_id: payload.priority_id,
      status_id: statusMaster.id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      estimated_hours: payload.estimated_hours,
      custom_fields: payload.custom_fields,
      created_by: payload.created_by
    }])
    .select()
    .single();

  if (error) throw error;

  // Removed: Insert Assignees and Teams (No longer supported per workspace refactor)

  // Insert Checklist Items
  if (payload.checklist_items && payload.checklist_items.length > 0) {
    const checklistData = payload.checklist_items.map((item: string) => ({
      task_id: task.id,
      label: item,
      is_completed: false
    }));
    await supabaseAdmin.from('task_checklists').insert(checklistData);
  }

  // Log Activity is also now handled by the DB trigger, but if manual is preferred it can stay.
  // Wait, DB trigger does it automatically. So we can remove manual logActivityEvent too to prevent duplicate timeline entries.
  
  revalidatePath(`/workspaces/${payload.workspace_id}`);
  return task;
}

export async function transitionTaskStatus(taskId: string, newStatusIdOrCode: string, performedBy?: string) {
  // Get current status
  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('status_id')
    .eq('id', taskId)
    .single();

  if (!task) throw new Error("Task not found");

  let targetStatusId = newStatusIdOrCode;

  // Check if it's a UUID. If not, assume it's a status code and look up the ID.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(newStatusIdOrCode)) {
    const { data: stMaster } = await supabaseAdmin
      .from('status_master')
      .select('id')
      .eq('status_code', newStatusIdOrCode)
      .single();
    if (stMaster) {
      targetStatusId = stMaster.id;
    } else {
      throw new Error(`Invalid status code or ID: ${newStatusIdOrCode}`);
    }
  }

  // Skip transition validation for now if no workflow is enforced, or we can enforce it:

  // Validate transition
  const { data: transition } = await supabaseAdmin
    .from('workflow_transition_master')
    .select('id, allowed_role_id')
    .eq('from_status_id', task.status_id)
    .eq('to_status_id', targetStatusId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .single();

  if (!transition) {
    console.warn(`[Workflow Engine] No explicit transition mapped from ${task.status_id} to ${targetStatusId}. Permitting default free-form transition.`);
  }

  // Check role authorization if allowed_role_id is set
  if (transition && transition.allowed_role_id) {
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', performedBy)
      .eq('role_id', transition.allowed_role_id)
      .single();
    if (!userRole) throw new Error("Not authorized for this transition");
  }

  // Update status
  const { error } = await supabaseAdmin
    .from('tasks')
    .update({ status_id: targetStatusId, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;

  await logActivityEvent('TASK', taskId, 'STATUS_CHANGE', { status_id: task.status_id }, { status_id: targetStatusId }, performedBy || "system");
  revalidatePath(`/tasks/${taskId}`);
}

export async function logActivityEvent(moduleType: string, recordId: string, eventType: string, oldValue: any, newValue: any, performedBy: string) {
  await supabaseAdmin.from('activity_events').insert([{
    module_type: moduleType,
    record_id: recordId,
    event_type: eventType,
    old_value: oldValue,
    new_value: newValue,
    performed_by: performedBy
  }]);
}

export async function fetchCustomFields(workspaceId: string) {
  const { data } = await supabaseAdmin
    .from('task_custom_fields_master')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function createCustomField(workspaceId: string, fieldName: string, fieldType: string) {
  const fieldKey = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  const { data, error } = await supabaseAdmin
    .from('task_custom_fields_master')
    .insert([{
      workspace_id: workspaceId,
      field_name: fieldName,
      field_key: fieldKey,
      field_type: fieldType,
      created_by: null // Or omit if not required
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

import { unstable_noStore as noStore } from 'next/cache';

export async function fetchUsers() {
  noStore();
  const { data } = await supabaseAdmin
    .from('user_master')
    .select('id, full_name, user_code')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('full_name', { ascending: true });
  return data || [];
}

export async function getTaskDetails(taskId: string) {
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error || !task) throw error || new Error("Task not found");

  // Fetch related data manually due to missing FKs in schema
  const [
    { data: status },
    { data: priority },
    { data: workspace },
    { data: creator }
  ] = await Promise.all([
    task.status_id ? supabaseAdmin.from('status_master').select('id, name:status_name, code:status_code, is_closed').eq('id', task.status_id).single() : Promise.resolve({ data: null }),
    task.priority_id ? supabaseAdmin.from('priority_master').select('id, name:priority_name, color:priority_color').eq('id', task.priority_id).single() : Promise.resolve({ data: null }),
    task.workspace_id ? supabaseAdmin.from('workspaces').select('id, name:workspace_name').eq('id', task.workspace_id).single() : Promise.resolve({ data: null }),
    task.created_by ? supabaseAdmin.from('user_master').select('id, full_name, user_code').eq('id', task.created_by).single() : Promise.resolve({ data: null })
  ]);

  task.status = status;
  task.priority = priority;
  task.workspace = workspace;
  task.creator = creator;
  
  // Excluded heavy modules from initial core load (Progressive Hydration)
  task.checklists = [];
  task.attachments = [];
  
  task.assignee = null;
  task.task_assignees = [];
  task.task_teams = [];
  task.title = task.subject;

  return task;
}

export async function getTaskChecklists(taskId: string) {
  const { data, error } = await supabaseAdmin.from('task_checklists').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getTaskAttachments(taskId: string) {
  const { data, error } = await supabaseAdmin.from('task_attachments').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getWorkloadSnapshot(userId: string) {
  // Get all visible workspaces for the user
  const { getVisibleWorkspaces } = await import('@/lib/repositories/workspaces');
  const visibleWorkspaces = await getVisibleWorkspaces(userId);
  const workspaceIds = visibleWorkspaces.map((w: any) => w.id);

  let activeTasks: any[] = [];
  
  if (workspaceIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('tasks')
      .select('id, end_date, estimated_hours, status:status_master(is_closed)')
      .in('workspace_id', workspaceIds)
      .eq('is_deleted', false);
      
    if (data) {
      activeTasks = data.filter((t: any) => !t.status?.is_closed);
    }
  }
  
  const now = new Date();
  const overdueTasks = activeTasks.filter(t => t.end_date && new Date(t.end_date) < now).length;
  const estimatedHours = activeTasks.reduce((acc, t) => acc + (t.estimated_hours || 0), 0);

  // Mock standard capacity as 40 hours per week
  const standardCapacity = 40;
  const capacityPercentage = Math.min(100, Math.round((estimatedHours / standardCapacity) * 100));

  return {
    active_tasks: activeTasks.length,
    overdue_tasks: overdueTasks,
    capacity_percentage: capacityPercentage,
    estimated_hours: estimatedHours,
    available_capacity: 100 - capacityPercentage
  };
}

export async function updateTask(taskId: string, payload: any) {
  const { error } = await supabaseAdmin.from('tasks').update(payload).eq('id', taskId);
  if (error) throw error;
  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteTask(taskId: string) {
  // Get the task and check auth
  const { data: task } = await supabaseAdmin.from('tasks').select('workspace_id, created_by').eq('id', taskId).single();
  if (!task) throw new Error("Task not found");

  const cookieStore = await cookies();
  const { data: { session } } = await createClient(cookieStore).auth.getSession();
  const userId = session?.user?.id;
  
  if (!userId) throw new Error("Unauthenticated");

  if (task.created_by !== userId) {
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', task.workspace_id)
      .eq('user_id', userId)
      .single();
    
    // Allow deletion if the user is owner/admin
    const roleCode = member?.role?.toUpperCase();
    if (roleCode !== 'OWNER' && roleCode !== 'ADMIN') {
      throw new Error("You do not have permission to delete this task.");
    }
  }

  const { error } = await supabaseAdmin.from('tasks').update({ is_deleted: true }).eq('id', taskId);
  if (error) throw error;
  revalidatePath(`/workspaces/${task.workspace_id}`);
}

export async function resolveTask(taskId: string) {
  return transitionTaskStatus(taskId, "ST_RESOLVED");
}

export async function approveResolution(taskId: string) {
  return transitionTaskStatus(taskId, "ST_CLOSED");
}

export async function reopenTask(taskId: string) {
  return transitionTaskStatus(taskId, "ST_REOPEN");
}

export async function createChecklistItem(taskId: string, label: string) {
  const cookieStore = await cookies();
  const { data: { session } } = await createClient(cookieStore).auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  const { data, error } = await supabaseAdmin
    .from('task_checklists')
    .insert([{ task_id: taskId, label, is_completed: false }])
    .select()
    .single();
  if (error) throw error;
  
  if (data) {
    await supabaseAdmin.from('task_activity_logs').insert([{
      task_id: taskId,
      actor_id: userId,
      action: 'CHECKLIST_UPDATE',
      new_state: { label: data.label, is_completed: false, action: 'added' }
    }]);
  }
  
  return data;
}

export async function createTaskAttachment(taskId: string, fileName: string, base64Url: string, size: number) {
  const cookieStore = await cookies();
  const { data: { session } } = await createClient(cookieStore).auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  const { data, error } = await supabaseAdmin
    .from('task_attachments')
    .insert([{ task_id: taskId, file_name: fileName, file_url: base64Url, size, uploaded_by: userId, file_type: 'file' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTeams() { return []; }
export async function assignTeamToTask(taskId: string, teamId: string) { return {}; }

export async function getTaskComments(taskId: string, limit = 20, offset = 0) {
  const { data: comments, error } = await supabaseAdmin
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  // Fetch users manually
  const userIds = Array.from(new Set(comments.map((c: any) => c.author_id).filter(Boolean)));
  let users: any[] = [];
  if (userIds.length > 0) {
    const { data: userData } = await supabaseAdmin.from('user_master').select('id, full_name, profile_photo').in('id', userIds);
    if (userData) users = userData;
  }

  return comments.map((c: any) => ({
    ...c,
    user: users.find(u => u.id === c.author_id) || null
  }));
}

export async function addTaskRemark(taskId: string, content: string) {
  const cookieStore = await cookies();
  const { data: { session } } = await createClient(cookieStore).auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  const { data, error } = await supabaseAdmin
    .from('task_comments')
    .insert([{ task_id: taskId, author_id: userId, content }])
    .select('*')
    .single();
  if (error) throw error;
  
  if (data) {
    await supabaseAdmin.from('task_activity_logs').insert([{
      task_id: taskId,
      actor_id: userId,
      action: 'COMMENT',
      new_state: { message: content }
    }]);

    const { data: user } = await supabaseAdmin.from('user_master').select('full_name, profile_photo').eq('id', userId).single();
    data.user = user || null;
  }
  
  return data;
}

export async function getTaskStatuses() {
  const { data, error } = await supabaseAdmin
    .from('status_master')
    .select('id, name:status_name, code:status_code, color:status_color, is_closed, is_reopen')
    .eq('scope_type', 'TASK')
    .order('status_order', { ascending: true });
  if (error) throw error;
  return data || [];
}
