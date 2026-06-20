"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { fetchWorkspaceStakeholders } from '@/lib/actions/workspaces';
import { queueBusinessEvent } from '@/lib/actions/notification-engine';
import { dispatchNotification } from '@/lib/actions/notifications';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function getDepartments() {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, code')
    .eq('is_deleted', false)
    .order('name');
  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
  return data;
}
export async function createTask(payload: {
  workspace_id: string;
  sub_workspace_id?: string;
  parent_task_id?: string;
  sprint_id?: string;
  template_id?: string;
  subject?: string;
  title?: string;
  description?: string;
  priority_id: string;
  department_id?: string;
  status_id?: string;
  start_date?: string;
  end_date?: string;
  estimated_hours?: number;
  custom_fields?: any;
  created_by: string;
  assigned_to?: string;
  checklist_items?: string[];
  attachments?: { file_name: string; file_url: string; file_type: string; size: number }[];
  participants?: { user_id: string; participation_role: string }[];
}) {
  try {
    let creatorId = payload.created_by;
    if (!creatorId) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Unauthenticated user creating task" };
      creatorId = user.id;
    }

    let finalStatusId = payload.status_id;

    if (!finalStatusId) {
      // Find default status for tasks
      let { data: statusMaster } = await supabaseAdmin
        .from('status_master')
        .select('id')
        .eq('is_default', true)
        .eq('scope_type', 'TASK')
        .eq('is_deleted', false)
        .maybeSingle();

      if (!statusMaster) {
        // Fallback to the first active task status
        const { data: fallbackStatus } = await supabaseAdmin
          .from('status_master')
          .select('id')
          .eq('scope_type', 'TASK')
          .eq('is_deleted', false)
          .limit(1);

        if (fallbackStatus && fallbackStatus.length > 0) {
          statusMaster = fallbackStatus[0];
        } else {
          return { error: 'No active task status found in status_master to assign.' };
        }
      }
      finalStatusId = statusMaster.id;
    }

    // Create Task
    const cleanUUID = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;
    const finalWorkspaceId = cleanUUID(payload.sub_workspace_id) || cleanUUID(payload.workspace_id);
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert([{
        workspace_id: finalWorkspaceId,
        sub_workspace_id: null,
        parent_task_id: cleanUUID(payload.parent_task_id),
        sprint_id: cleanUUID(payload.sprint_id),
        template_id: cleanUUID(payload.template_id),
        subject: payload.subject || payload.title || 'Untitled Task',
        description: payload.description,
        priority_id: cleanUUID(payload.priority_id),
        department_id: cleanUUID(payload.department_id),
        status_id: finalStatusId,
        start_date: (payload.start_date && payload.start_date.trim()) ? payload.start_date : null,
        end_date: (payload.end_date && payload.end_date.trim()) ? payload.end_date : null,
        estimated_hours: payload.estimated_hours,
        custom_fields: payload.custom_fields,
        created_by: creatorId,
        assigned_to: cleanUUID(payload.assigned_to),
        owner_id: cleanUUID(payload.assigned_to) || creatorId
      }])
      .select()
      .single();

    if (error) {
      console.error("[createTask] DB Insert Error:", error);
      return { error: error.message || JSON.stringify(error) };
    }

    // Insert Assignees and Watchers
    if (payload.participants && payload.participants.length > 0) {
      const rolePriority = { 'OWNER': 4, 'EXECUTOR': 3, 'REVIEWER': 2, 'WATCHER': 1 };
      
      // Group by user_id and keep highest priority role
      const uniqueParticipantsMap = new Map<string, string>();
      
      for (const p of payload.participants) {
        const existingRole = uniqueParticipantsMap.get(p.user_id);
        const newPriority = rolePriority[p.participation_role as keyof typeof rolePriority] || 0;
        const existingPriority = existingRole ? (rolePriority[existingRole as keyof typeof rolePriority] || 0) : -1;
        
        if (newPriority > existingPriority) {
          uniqueParticipantsMap.set(p.user_id, p.participation_role);
        }
      }

      const participantData = Array.from(uniqueParticipantsMap.entries()).map(([user_id, participation_role]) => ({
        task_id: task.id,
        user_id,
        participation_role
      }));

      if (participantData.length > 0) {
        const { error: partErr } = await supabaseAdmin
          .from('task_participants')
          .upsert(participantData, { onConflict: 'task_id,user_id' });
        if (partErr) {
          console.error("[createTask] Participants Insert Error:", partErr);
          return { error: partErr.message || JSON.stringify(partErr) };
        }
      }
    }

    // Insert Checklist Items
    if (payload.checklist_items && payload.checklist_items.length > 0) {
      const checklistData = payload.checklist_items.map((item: string) => ({
        task_id: task.id,
        label: item,
        is_completed: false
      }));
      const { error: chkErr } = await supabaseAdmin.from('task_checklists').insert(checklistData);
      if (chkErr) {
        console.error("[createTask] Checklist Insert Error:", chkErr);
        return { error: chkErr.message || JSON.stringify(chkErr) };
      }
    }

    // Insert Attachments
    if (payload.attachments && payload.attachments.length > 0) {
      const attachmentData = payload.attachments.map((att) => ({
        task_id: task.id,
        file_name: att.file_name,
        file_url: att.file_url,
        file_type: att.file_type,
        size: att.size,
        uploaded_by: creatorId
      }));
      const { error: attErr } = await supabaseAdmin.from('task_attachments').insert(attachmentData);
      if (attErr) {
        console.error("[createTask] Attachments Insert Error:", attErr);
        return { error: attErr.message || JSON.stringify(attErr) };
      }
    }
    
    // Insert Initial Description as a Remark (Comment)
    if (payload.description && payload.description.trim() !== '') {
      const { error: commentErr } = await supabaseAdmin.from('task_comments').insert([{
        task_id: task.id,
        author_id: creatorId,
        content: payload.description.trim()
      }]);
      if (commentErr) {
        console.error("[createTask] Initial Comment Insert Error:", commentErr);
        // non-blocking
      } else {
        await supabaseAdmin.from('task_activity_logs').insert([{
          task_id: task.id,
          actor_id: creatorId,
          action: 'COMMENT',
          new_state: { message: payload.description.trim() }
        }]);
      }
    }
    
    // ENTERPRISE NOTIFICATION ROUTING
    // Fire-and-forget: Push to async background queue
    queueBusinessEvent("Task", "Created", {
      entity_id: task.id,
      triggering_user_id: creatorId,
      status: "NEW", // The default status logic applied it
      task_name: task.subject,
      created_by: creatorId,
      assigned_to: task.assigned_to,
      priority: task.priority_id,
      due_date: task.end_date,
      link: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/tasks/${task.id}`
    }).catch(e => console.error("[NotificationEngine] Background push failed", e));

    return task;
  } catch (err: any) {
    console.error("[createTask] Unexpected Error:", err);
    return { error: err?.message || String(err) };
  }
}

export async function transitionTaskStatus(taskId: string, newStatusIdOrCode: string, performedBy?: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id || performedBy;
  if (!userId) return { error: "Unauthenticated" };

  // Get current status and owner
  const { data: task } = await supabaseAdmin
    .from('tasks')
    .select('status_id, assigned_to')
    .eq('id', taskId)
    .single();

  if (!task) return { error: "Task not found" };

  if (task.assigned_to !== userId) {
    const { data: participant } = await supabaseAdmin
      .from('task_participants')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!participant) {
       await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, { 
         action_attempted: 'UPDATE_STATUS', 
         target_status: newStatusIdOrCode 
       }, userId);
       return { error: "You do not have permission to transition this task status. Only the Task Assignee or Participants can edit the status." };
    }
  }

  let targetStatusId = newStatusIdOrCode;

  // Check if it's a UUID. If not, assume it's a status code and look up the ID.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(newStatusIdOrCode)) {
    const { data: stMaster } = await supabaseAdmin
      .from('status_master')
      .select('id')
      .eq('status_code', newStatusIdOrCode)
      .eq('scope_type', 'TASK')
      .single();
    if (stMaster) {
      targetStatusId = stMaster.id;
    } else {
      return { error: `Invalid status code or ID: ${newStatusIdOrCode}` };
    }
  }

  // Validate transition (use maybeSingle so 0 rows never throws an error)
  const { data: transition } = await supabaseAdmin
    .from('workflow_transition_master')
    .select('id, allowed_role_id')
    .eq('from_status_id', task.status_id)
    .eq('to_status_id', targetStatusId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!transition) {
    console.warn(`[Workflow Engine] No explicit transition mapped from ${task.status_id} to ${targetStatusId}. Permitting default free-form transition.`);
  }

  // Update status
  const { error } = await supabaseAdmin
    .from('tasks')
    .update({ status_id: targetStatusId, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) return { error: error.message || JSON.stringify(error) };

  // Fix audit log trigger fallback (since auth.uid() is null for admin updates)
  await supabaseAdmin
    .from('task_activity_logs')
    .update({ actor_id: userId })
    .eq('task_id', taskId)
    .is('actor_id', null);

  // Fire-and-forget activity log — must not block or throw to the caller
  logActivityEvent('TASK', taskId, 'STATUS_CHANGE', { status_id: task.status_id }, { status_id: targetStatusId }, performedBy || "system").catch(e => console.error('[logActivityEvent]', e));
  
  // Fire-and-forget Notification Queue Push
  queueBusinessEvent("Task", "Status Changed", {
    entity_id: taskId,
    triggering_user_id: userId,
    status: targetStatusId, // Note: This is an ID, but for email mapping we might want the code. Assuming code for simplicity.
    assigned_to: task.assigned_to,
    link: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/tasks/${taskId}`
  }).catch(e => console.error("[NotificationEngine] Status change queue push failed", e));

  return { success: true };
}

export async function updateNodeStatus(nodeId: string, nodeType: string, newStatusId: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  const table = nodeType === 'SUB_TASK' ? 'sub_tasks' : nodeType === 'TASK' ? 'tasks' : null;
  if (!table) return { error: "Invalid node type for status update" };

  // Get current status
  const { data: node } = await supabaseAdmin
    .from(table)
    .select('status_id')
    .eq('id', nodeId)
    .single();

  if (!node) return { error: "Node not found" };

  // Update status
  const { error } = await supabaseAdmin
    .from(table)
    .update({ status_id: newStatusId, updated_at: new Date().toISOString() })
    .eq('id', nodeId);

  if (error) return { error: error.message };

  if (table === 'tasks') {
    // Fix audit log trigger fallback
    await supabaseAdmin
      .from('task_activity_logs')
      .update({ actor_id: userId })
      .eq('task_id', nodeId)
      .is('actor_id', null);
  }

  // Log activity
  logActivityEvent(nodeType, nodeId, 'STATUS_CHANGE', { status_id: node.status_id }, { status_id: newStatusId }, userId).catch(e => console.error('[logActivityEvent]', e));

  return { success: true };
}

export async function logActivityEvent(moduleType: string, recordId: string, eventType: string, oldValue: any, newValue: any, performedBy: string) {
  try {
    const res = await supabaseAdmin.from('activity_events').insert([{
      module_type: moduleType,
      record_id: recordId,
      event_type: eventType,
      old_value: oldValue,
      new_value: newValue,
      performed_by: performedBy
    }]);
    if (res.error) {
      console.error('[logActivityEvent] Supabase Error:', res.error);
    }
  } catch (e) {
    console.error('[logActivityEvent] Failed to log activity (non-critical):', e);
  }
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
      created_by: null
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
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;

  console.time("getTaskDetails - Parallel Fetch");
  const [
    { data: task, error },
    { count: checklistCount },
    { count: attachmentCount },
    { data: participants },
    permissionsModule
  ] = await Promise.all([
    supabaseAdmin.from('tasks').select(`
      *,
      status:status_master(id, name:status_name, code:status_code, is_closed),
      priority:priority_master(id, name:priority_name, color:priority_color),
      department:departments(id, name),
      workspace:workspaces(id, name:workspace_name, members:workspace_members(user_id, role))
    `).eq('id', taskId).single(),
    supabaseAdmin.from('task_checklists').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
    supabaseAdmin.from('task_attachments').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
    supabaseAdmin.from('task_participants').select('user_id, participation_role').eq('task_id', taskId),
    userId ? import('@/lib/permissions') : Promise.resolve(null)
  ]);
  console.timeEnd("getTaskDetails - Parallel Fetch");

  if (error || !task) return { error: error?.message || "Task not found" };

  let isSuperAdmin = false;
  if (userId && permissionsModule) {
    isSuperAdmin = await permissionsModule.hasPermission(userId, "WORKSPACES_MANAGE");
  }

  let wsMembers: any[] = [];
  let isWorkspaceMember = isSuperAdmin;
  
  if (task.workspace_id) {
    wsMembers = task.workspace?.members || [];
    
    if (userId && !isSuperAdmin) {
      if (wsMembers.some(m => m.user_id === userId)) {
        isWorkspaceMember = true;
      } else {
        const { data: userTeams } = await supabaseAdmin.from('team_members').select('team_id').eq('user_id', userId);
        if (userTeams && userTeams.length > 0) {
          const teamIds = userTeams.map((t: any) => t.team_id);
          const { data: wsTeams } = await supabaseAdmin.from('workspace_teams').select('id').eq('workspace_id', task.workspace_id).in('team_id', teamIds).limit(1);
          if (wsTeams && wsTeams.length > 0) isWorkspaceMember = true;
        }
      }
    }
  }

  // User Lookup Consolidation
  const uniqueUserIds = new Set<string>();
  if (task.created_by) uniqueUserIds.add(task.created_by);
  if (task.assigned_to) uniqueUserIds.add(task.assigned_to);
  if (participants) participants.forEach(p => uniqueUserIds.add(p.user_id));
  wsMembers.forEach(m => uniqueUserIds.add(m.user_id));

  let usersMap = new Map<string, any>();
  if (uniqueUserIds.size > 0) {
    console.time("getTaskDetails - Single User Query");
    const { data: allUsers } = await supabaseAdmin.from('user_master').select('id, full_name, profile_photo, user_code').in('id', Array.from(uniqueUserIds));
    console.timeEnd("getTaskDetails - Single User Query");
    if (allUsers) allUsers.forEach(u => usersMap.set(u.id, u));
  }

  task.creator = task.created_by ? usersMap.get(task.created_by) || null : null;
  task.assignee = task.assigned_to ? usersMap.get(task.assigned_to) || null : null;
  
  task.task_assignees = [];
  task.task_reviewers = [];
  task.task_watchers = [];
  
  if (participants) {
    participants.forEach(p => {
      const u = usersMap.get(p.user_id);
      if (!u) return;
      if (p.participation_role === 'EXECUTOR') task.task_assignees.push(u);
      else if (p.participation_role === 'REVIEWER') task.task_reviewers.push(u);
      else if (p.participation_role === 'WATCHER') task.task_watchers.push(u);
    });
  }

  task.inherited_users = wsMembers.map(m => {
    const u = usersMap.get(m.user_id);
    return u ? { ...u, workspace_role: m.role } : null;
  }).filter(Boolean);

  task._meta = {
    checklistCount: checklistCount || 0,
    attachmentCount: attachmentCount || 0
  };
  
  task.currentUserIsSuperAdmin = isSuperAdmin;
  task.currentUserCanAct = task.assigned_to === userId || (participants && participants.some(p => p.user_id === userId));
  task.currentUserId = userId || null;
  task.title = task.subject;
  task.checklists = [];
  task.attachments = [];
  task.task_teams = [];

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
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  const { data: task } = await supabaseAdmin.from('tasks').select('assigned_to, subject').eq('id', taskId).single();
  if (!task) return { error: "Task not found" };

  if (task.assigned_to !== userId) {
    const { data: participant } = await supabaseAdmin
      .from('task_participants')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!participant) {
       await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, { 
         action_attempted: 'UPDATE_TASK'
       }, userId);
       return { error: "You do not have permission to edit this task. Only the Task Owner or Participants can edit." };
    }
  }

  if (payload.status_id) {
    const { data: targetStatus } = await supabaseAdmin.from('status_master').select('status_code').eq('id', payload.status_id).single();
    if (targetStatus) {
      const completedCodes = ['TASK COMPLETED', 'CLOSED', 'RESOLVED', 'DONE'];
      if (completedCodes.includes(targetStatus.status_code.toUpperCase())) {
        const { data: subTasks } = await supabaseAdmin.from('tasks')
          .select('id, subject, status_id')
          .eq('parent_task_id', taskId)
          .eq('is_deleted', false);
          
        if (subTasks && subTasks.length > 0) {
          const statusIds = [...new Set(subTasks.map((t: any) => t.status_id))];
          const { data: statuses } = await supabaseAdmin.from('status_master').select('id, status_code').in('id', statusIds);
          const statusMap = new Map(statuses?.map((s: any) => [s.id, s.status_code.toUpperCase()]) || []);
          
          const incompleteBlocker = subTasks.find((t: any) => {
            const code = statusMap.get(t.status_id);
            return !code || !completedCodes.includes(code);
          });
          
          if (incompleteBlocker) {
            return { error: `Cannot complete task. Blocked by incomplete sub-task: "${incompleteBlocker.subject}"` };
          }
        }
      }
    }
  }

  // Sanitize empty date/UUID strings to NULL to avoid DB syntax errors
  const updatePayload = { ...payload };
  const cleanField = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;

  if (updatePayload.start_date !== undefined) {
    updatePayload.start_date = cleanField(updatePayload.start_date);
  }
  if (updatePayload.end_date !== undefined) {
    updatePayload.end_date = cleanField(updatePayload.end_date);
  }
  if (updatePayload.priority_id !== undefined) {
    updatePayload.priority_id = cleanField(updatePayload.priority_id);
  }
  if (updatePayload.status_id !== undefined) {
    updatePayload.status_id = cleanField(updatePayload.status_id);
  }
  if (updatePayload.sub_workspace_id !== undefined) {
    updatePayload.sub_workspace_id = cleanField(updatePayload.sub_workspace_id);
  }
  if (updatePayload.assigned_to !== undefined) {
    updatePayload.assigned_to = cleanField(updatePayload.assigned_to);
  }
  if (updatePayload.parent_task_id !== undefined) {
    updatePayload.parent_task_id = cleanField(updatePayload.parent_task_id);
  }

  const { error } = await supabaseAdmin.from('tasks').update(updatePayload).eq('id', taskId);
  if (error) return { error: error.message || JSON.stringify(error) };

  // Fix audit log trigger fallback
  await supabaseAdmin
    .from('task_activity_logs')
    .update({ actor_id: userId })
    .eq('task_id', taskId)
    .is('actor_id', null);

  const newTitle = payload.subject;
  const oldTitle = task.subject;
  
  if (newTitle && oldTitle && oldTitle !== newTitle) {
    await supabaseAdmin.from('activity_events').insert({
      module_type: 'TASK',
      record_id: taskId,
      event_type: 'TITLE',
      old_value: { title: oldTitle },
      new_value: { title: newTitle },
      performed_by: userId
    });
  }

  return { success: true };
}export async function deleteTask(taskId: string) {
  try {
    const { data: task } = await supabaseAdmin.from('tasks').select('assigned_to').eq('id', taskId).single();
    if (!task) return { error: "Task not found" };

    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    const userId = user?.id;
    
    if (!userId) return { error: "Unauthenticated" };

    const { hasPermission } = await import('@/lib/permissions');
    const canDelete = await hasPermission(userId, "TASKS_DELETE");

    if (!canDelete) {
      await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, { 
        action_attempted: 'DELETE_TASK'
      }, userId);
      return { error: "You do not have permission to delete this task. Only users with specific IAM permissions can delete." };
    }

    // Soft delete the task instead of hard deleting it and its related records
    const { error } = await supabaseAdmin.from('tasks').update({ is_deleted: true }).eq('id', taskId);
    if (error) return { error: error.message };

    // Fix audit log trigger fallback
    await supabaseAdmin
      .from('task_activity_logs')
      .update({ actor_id: userId })
      .eq('task_id', taskId)
      .is('actor_id', null);
    
    revalidatePath("/workspaces");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
};

export async function resolveTask(taskId: string) {
  return transitionTaskStatus(taskId, "ST_RESOLVED");
}

export async function approveTask(taskId: string) {
  return transitionTaskStatus(taskId, "ST_CLOSED");
}

export async function reopenTask(taskId: string) {
  return transitionTaskStatus(taskId, "ST_OPEN");
}

export async function createChecklistItem(taskId: string, label: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
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
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
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
    
  if (error) return { error: error.message };
  if (!comments || comments.length === 0) return [];

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
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  const { data, error } = await supabaseAdmin
    .from('task_comments')
    .insert([{ task_id: taskId, author_id: userId, content }])
    .select('*')
    .single();
  
  if (error) return { error: error.message || JSON.stringify(error) };
  
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
  
  return { success: true, data };
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

export async function updateTaskStatusInline(taskId: string, newStatusId: string, remark: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  // Fetch current task to check assignee
  const { data: currentTask, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('assigned_to, status_id, parent_task_id')
    .eq('id', taskId)
    .single();

  if (fetchError) return { error: "Failed to fetch task" };

  // If changing status, must be assigned user
  if (newStatusId && newStatusId !== currentTask.status_id) {
    if (currentTask.assigned_to !== userId) {
      const { data: participant } = await supabaseAdmin
        .from('task_participants')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!participant) {
        await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, { 
          action_attempted: 'UPDATE_STATUS_INLINE'
        }, userId);
        return { error: "Only the assigned user or execution team can change the task status." };
      }
    }

    // Blocker validation
    const { data: targetStatus } = await supabaseAdmin.from('status_master').select('status_code').eq('id', newStatusId).single();
    if (targetStatus) {
      const completedCodes = ['TASK COMPLETED', 'CLOSED', 'RESOLVED', 'DONE'];
      if (completedCodes.includes(targetStatus.status_code.toUpperCase())) {
        const { data: subTasks } = await supabaseAdmin.from('tasks')
          .select('id, subject, status_id')
          .eq('parent_task_id', taskId)
          .eq('is_deleted', false);
          
        if (subTasks && subTasks.length > 0) {
          const statusIds = [...new Set(subTasks.map((t: any) => t.status_id))];
          const { data: statuses } = await supabaseAdmin.from('status_master').select('id, status_code').in('id', statusIds);
          const statusMap = new Map(statuses?.map((s: any) => [s.id, s.status_code.toUpperCase()]) || []);
          
          const incompleteBlocker = subTasks.find((t: any) => {
            const code = statusMap.get(t.status_id);
            return !code || !completedCodes.includes(code);
          });
          
          if (incompleteBlocker) {
            return { error: `Cannot complete. Blocked by incomplete sub-task: "${incompleteBlocker.subject}"` };
          }
        }
      }
    }

    // Update status
    const { error: updateError } = await supabaseAdmin
      .from('tasks')
      .update({ status_id: newStatusId })
      .eq('id', taskId);
      
    if (updateError) return { error: "Failed to update status" };
  }

  // Insert remark/comment
  if (remark && remark.trim().length > 0) {
    await supabaseAdmin
      .from('task_comments')
      .insert([{ task_id: taskId, author_id: userId, content: remark }]);
  }

  // Insert audit trail
  const actionType = newStatusId && newStatusId !== currentTask.status_id ? 'STATUS_CHANGE' : 'COMMENT';
  await supabaseAdmin.from('task_activity_logs').insert([{
    task_id: taskId,
    actor_id: userId,
    action: actionType,
    new_state: { 
      status_id: newStatusId,
      message: remark 
    }
  }]);

  if (newStatusId && newStatusId !== currentTask.status_id && currentTask.parent_task_id) {
    recalculateParentProgress(currentTask.parent_task_id).catch(e => console.error('[recalculateParentProgress]', e));
  }

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/workspaces', 'page');
  revalidatePath('/tasks', 'layout');

  return { success: true };
}

// -----------------------------------------------------------------------------
// ENHANCEMENTS: TIME TRACKING VIA JSONB
// -----------------------------------------------------------------------------

export async function logTaskTime(taskId: string, hours: number, description: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data: task, error: fetchError } = await supabaseAdmin
    .from('tasks')
    .select('custom_fields')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) throw new Error("Task not found");

  const customFields = task.custom_fields || {};
  const timeLogs = customFields.time_logs || [];
  
  const newLog = {
    id: `log-${Date.now()}`,
    user_id: user.id,
    hours: Number(hours),
    description,
    logged_at: new Date().toISOString()
  };

  const updatedFields = {
    ...customFields,
    time_logs: [...timeLogs, newLog]
  };

  const { error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({ custom_fields: updatedFields })
    .eq('id', taskId);

  if (updateError) throw updateError;
  
  // Also log to activity
  await supabaseAdmin.from('task_activity_logs').insert([{
    task_id: taskId,
    actor_id: user.id,
    action: 'TIME_LOGGED',
    new_state: { hours, message: description }
  }]);

  return newLog;
}

// -----------------------------------------------------------------------------
// ENHANCEMENTS: SUBTASK PROGRESS ROLLUPS
// -----------------------------------------------------------------------------

export async function recalculateParentProgress(parentTaskId: string) {
  // Fetch all child tasks
  const { data: subtasks } = await supabaseAdmin
    .from('tasks')
    .select('id, status_id')
    .eq('parent_task_id', parentTaskId)
    .eq('is_deleted', false);

  if (!subtasks || subtasks.length === 0) return;

  // Fetch status details
  const statusIds = Array.from(new Set(subtasks.map(t => t.status_id)));
  const { data: statuses } = await supabaseAdmin
    .from('status_master')
    .select('id, is_closed, is_terminal')
    .in('id', statusIds);

  const closedStatusIds = new Set(
    statuses?.filter(s => s.is_closed || s.is_terminal).map(s => s.id) || []
  );

  const completedCount = subtasks.filter(t => closedStatusIds.has(t.status_id)).length;
  const progress = Math.round((completedCount / subtasks.length) * 100);

  // Update parent task
  const { data: parentTask } = await supabaseAdmin
    .from('tasks')
    .select('custom_fields')
    .eq('id', parentTaskId)
    .single();

  if (parentTask) {
    const updatedFields = {
      ...(parentTask.custom_fields || {}),
      progress_percentage: progress
    };

    await supabaseAdmin
      .from('tasks')
      .update({ custom_fields: updatedFields })
      .eq('id', parentTaskId);
  }
}

// -----------------------------------------------------------------------------
// ENHANCEMENTS: BATCH TASK EXECUTION
// -----------------------------------------------------------------------------

export async function executeTaskBatchOperation(payload: {
  taskId: string;
  updates?: any;
  statusChanges?: string;
  departmentChange?: { old_id?: string | null, new_id?: string | null, old_name?: string | null, new_name?: string | null };
  checklistCreates?: string[];
  checklistUpdates?: Record<string, boolean>;
  remarks?: string;
  attachmentIds?: string[];
}) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  const { taskId, updates, statusChanges, departmentChange, checklistCreates, checklistUpdates, remarks, attachmentIds } = payload;
  
  console.time("TaskBatch - Core Updates");
  // Update Task Core
  const updatePayload = { ...updates };
  if (statusChanges) {
     updatePayload.status_id = statusChanges;
  }
  if (departmentChange && departmentChange.new_id !== undefined) {
     updatePayload.department_id = departmentChange.new_id;
  }
  
  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabaseAdmin.from('tasks').update(updatePayload).eq('id', taskId);
    if (updateError) return { error: updateError.message };
  }
  console.timeEnd("TaskBatch - Core Updates");

  console.time("TaskBatch - Children Updates");
  // Handle Checklists (parallel)
  console.time("TaskBatch - Children Updates");
  // Handle Checklists (parallel)
  const checklistInsertPromise = (checklistCreates && checklistCreates.length > 0)
    ? supabaseAdmin.from('task_checklists').insert(checklistCreates.map(label => ({ task_id: taskId, label, is_completed: false }))).select()
    : Promise.resolve({ data: [] });
  
  const checklistUpdatePromises = (checklistUpdates && Object.keys(checklistUpdates).length > 0)
    ? Object.entries(checklistUpdates).map(([id, is_completed]) => supabaseAdmin.from('task_checklists').update({ is_completed }).eq('id', id).select())
    : [];

  const commentPromise = (remarks && remarks.trim().length > 0)
    ? supabaseAdmin.from('task_comments').insert([{ task_id: taskId, author_id: userId, content: remarks }]).select()
    : Promise.resolve({ data: [] });

  const [insertRes, commentRes, ...updateResArr] = await Promise.all([
    checklistInsertPromise,
    commentPromise,
    ...checklistUpdatePromises
  ]);

  const checklistsCreates = insertRes.data || [];
  const checklistsUpdates = updateResArr.flatMap(r => r.data || []);
  let comments = commentRes.data || [];

  if (comments.length > 0) {
    const { data: users } = await supabaseAdmin.from('user_master').select('id, full_name, profile_photo').eq('id', userId);
    if (users && users.length > 0) {
      comments = comments.map(c => ({ ...c, user: users[0] }));
    }
  }

  console.timeEnd("TaskBatch - Children Updates");

  // Background Side Effects (non-blocking - Phase T4)
  const sideEffects = [];
  
  if (statusChanges) {
    sideEffects.push(
      supabaseAdmin.from('task_activity_logs').insert([{
        task_id: taskId, actor_id: userId, action: 'STATUS_CHANGE', new_state: { status_id: statusChanges }
      }])
    );
  }
  
  if (departmentChange && departmentChange.new_id !== departmentChange.old_id) {
    sideEffects.push(
      supabaseAdmin.from('task_activity_logs').insert([{
        task_id: taskId, actor_id: userId, action: 'DEPARTMENT_CHANGE', new_state: { 
          department_id: departmentChange.new_id, 
          department_name: departmentChange.new_name,
          old_department_id: departmentChange.old_id,
          old_department_name: departmentChange.old_name
        }
      }])
    );
  }
  
  if (remarks && remarks.trim().length > 0) {
    sideEffects.push(
      supabaseAdmin.from('task_activity_logs').insert([{
        task_id: taskId, actor_id: userId, action: 'COMMENT', new_state: { message: remarks }
      }])
    );
  }
  
  if (Object.keys(updatePayload).length > 0) {
    sideEffects.push(
      supabaseAdmin.from('task_activity_logs').update({ actor_id: userId }).eq('task_id', taskId).is('actor_id', null)
    );
  }

  // FIRE AND FORGET - DO NOT AWAIT SIDE EFFECTS
  Promise.allSettled(sideEffects).catch(e => console.error("[SideEffects Error]", e));

  return {
    success: true,
    data: {
      checklistsCreates,
      checklistsUpdates,
      comments
    }
  };
}

export async function updateTaskAssignees(taskId: string, workspaceId: string, assignees: string[]) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  // Fetch the task
  const { data: task } = await supabaseAdmin.from('tasks').select('assigned_to').eq('id', taskId).single();
  if (!task) return { error: "Task not found" };

  // Check if current user is an Executor
  const { data: participant } = await supabaseAdmin
    .from('task_participants')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .eq('participation_role', 'EXECUTOR')
    .maybeSingle();

  if (!participant && task.assigned_to !== userId) {
    await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, { 
      action_attempted: 'UPDATE_ASSIGNMENT'
    }, userId);
    return { error: "You do not have permission to edit assignees. Only the Assignee or Executors can do this." };
  }

  if (assignees.length === 0) {
    return { error: "At least one assignee must be selected." };
  }

  // Fetch all workspace members
  const { fetchWorkspaceStakeholders } = await import("@/lib/actions/workspaces");
  const stakeholders = await fetchWorkspaceStakeholders(workspaceId);

  // Prepare participants array
  const participants: any[] = [];
  assignees.forEach(id => participants.push({ task_id: taskId, user_id: id, participation_role: 'EXECUTOR' }));

  // Add Watchers (Team)
  stakeholders.forEach((s: any) => {
    if (!assignees.includes(s.id)) {
      participants.push({ task_id: taskId, user_id: s.id, participation_role: 'WATCHER' });
    }
  });

  // Perform the swap transactionally (via sequential queries in this case)
  const { error: deleteError } = await supabaseAdmin.from('task_participants').delete().eq('task_id', taskId);
  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabaseAdmin.from('task_participants').insert(participants);
  if (insertError) return { error: insertError.message };

  const { error: updateError } = await supabaseAdmin.from('tasks').update({ assigned_to: assignees[0] }).eq('id', taskId);
  if (updateError) return { error: updateError.message };

  // Log the assignment change in audit trail
  const newExecutorNames = assignees
    .map(id => stakeholders.find((s: any) => s.id === id)?.full_name)
    .filter(Boolean)
    .join(', ');
    
  await supabaseAdmin.from('task_activity_logs').insert([{
    task_id: taskId,
    actor_id: userId,
    action: 'ASSIGNMENT_CHANGE',
    new_state: { executors_text: newExecutorNames }
  }]);

  return { success: true };
}

export async function moveTasksInBulk(payload: {
  taskIds: string[];
  targetWorkspaceId: string;
  targetSubWorkspaceId?: string;
  newOwnerId?: string;
  newParticipantIds?: { user_id: string; participation_role: string }[];
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthenticated" };

    const { taskIds, targetWorkspaceId, targetSubWorkspaceId, newOwnerId, newParticipantIds } = payload;
    
    // Recursive fetch of all task IDs including children
    let allTaskIdsToMove = new Set<string>(taskIds);
    let currentBatch = [...taskIds];
    
    while (currentBatch.length > 0) {
      const { data: children, error } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .in('parent_task_id', currentBatch)
        .eq('is_deleted', false);
        
      if (error) throw error;
      
      const childIds = (children || []).map(c => c.id).filter(id => !allTaskIdsToMove.has(id));
      childIds.forEach(id => allTaskIdsToMove.add(id));
      currentBatch = childIds;
    }
    
    const finalTaskIds = Array.from(allTaskIdsToMove);

    // Update tasks
    const finalWorkspaceId = targetSubWorkspaceId || targetWorkspaceId;
    const updatePayload: any = {
      workspace_id: finalWorkspaceId,
      sub_workspace_id: null,
    };
    if (newOwnerId) {
      updatePayload.assigned_to = newOwnerId;
      updatePayload.owner_id = newOwnerId;
    }

    const { error: updateError } = await supabaseAdmin
      .from('tasks')
      .update(updatePayload)
      .in('id', finalTaskIds);

    if (updateError) throw updateError;

    // Handle participants if provided
    if (newParticipantIds && newParticipantIds.length > 0) {
      // Delete old participants
      await supabaseAdmin
        .from('task_participants')
        .delete()
        .in('task_id', finalTaskIds);

      // Insert new participants for all moved tasks
      const newParticipantsData = [];
      for (const tId of finalTaskIds) {
        for (const p of newParticipantIds) {
          newParticipantsData.push({
            task_id: tId,
            user_id: p.user_id,
            participation_role: p.participation_role
          });
        }
      }
      
      if (newParticipantsData.length > 0) {
        await supabaseAdmin
          .from('task_participants')
          .insert(newParticipantsData);
      }
    }

    // --- AUTO-WATCHER LOGIC ---
    const targetStakeholders = await fetchWorkspaceStakeholders(finalWorkspaceId);
    
    // Fetch all current participants for all moved tasks
    const { data: currentParticipants } = await supabaseAdmin
      .from('task_participants')
      .select('task_id, user_id')
      .in('task_id', finalTaskIds);
      
    // Fetch final assignees
    const { data: currentTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, assigned_to')
      .in('id', finalTaskIds);

    const watcherData: any[] = [];
    
    for (const tId of finalTaskIds) {
      const existingUserIds = new Set(
        currentParticipants?.filter(p => p.task_id === tId).map(p => p.user_id) || []
      );
      const t = currentTasks?.find(t => t.id === tId);
      if (t?.assigned_to) existingUserIds.add(t.assigned_to);

      targetStakeholders.forEach((s: any) => {
        if (!existingUserIds.has(s.id)) {
          watcherData.push({
            task_id: tId,
            user_id: s.id,
            participation_role: 'WATCHER'
          });
        }
      });
    }

    if (watcherData.length > 0) {
      // Chunk inserts if too large (Supabase limits to ~1000 rows usually)
      const chunkSize = 1000;
      for (let i = 0; i < watcherData.length; i += chunkSize) {
        await supabaseAdmin.from('task_participants').insert(watcherData.slice(i, i + chunkSize));
      }
    }
    // --------------------------

    // Insert Audit Logs
    const auditLogs = finalTaskIds.map(tId => ({
      task_id: tId,
      actor_id: user.id,
      action: 'WORKSPACE_CHANGE',
      new_state: { workspace_id: targetWorkspaceId, sub_workspace_id: targetSubWorkspaceId }
    }));
    await supabaseAdmin.from('task_activity_logs').insert(auditLogs);

    revalidatePath('/workspaces/transfer-tasks');
    revalidatePath('/tasks');
    
    return { success: true };
  } catch (err: any) {
    console.error("Bulk move error:", err);
    return { error: err.message };
  }
}

export async function transferTask(payload: {
  taskId: string;
  targetWorkspaceId: string;
  targetSubworkspaceId?: string;
  newAssigneeId?: string;
  newExecutors?: string[];
  droppedUsers?: string[];
  remarks: string;
}) {
  try {
    const { taskId, targetWorkspaceId, targetSubworkspaceId, newAssigneeId, newExecutors, droppedUsers, remarks } = payload;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthenticated" };

    const { hasPermission } = await import('@/lib/permissions');
    const isSuperAdmin = await hasPermission(user.id, "WORKSPACES_MANAGE");
    
    // Check if user is an executor
    const { data: participant } = await supabaseAdmin
      .from('task_participants')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .eq('participation_role', 'EXECUTOR')
      .maybeSingle();

    const { data: task } = await supabaseAdmin.from('tasks').select('workspace_id, assigned_to').eq('id', taskId).single();
    if (!task) return { error: "Task not found" };

    if (task.assigned_to !== user.id && !participant && !isSuperAdmin) {
      return { error: "Only the Task Owner, an Executive, or a Super Admin can transfer this task." };
    }

    // Update tasks
    const finalWorkspaceId = targetSubworkspaceId || targetWorkspaceId;
    const updatePayload: any = { 
      workspace_id: finalWorkspaceId,
      sub_workspace_id: null // Explicitly clear deprecated column
    };
    
    if (newAssigneeId) {
      updatePayload.assigned_to = newAssigneeId;
      // also update owner_id if it's the primary assignee
      updatePayload.owner_id = newAssigneeId;
    }

    const { error: updateError } = await supabaseAdmin
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId);

    if (updateError) throw updateError;

    // Handle dropped users
    if (droppedUsers && droppedUsers.length > 0) {
      await supabaseAdmin.from('task_participants')
        .delete()
        .eq('task_id', taskId)
        .in('user_id', droppedUsers);
    }

    // Handle new executors
    if (newExecutors && newExecutors.length > 0) {
      const execsData = newExecutors.map(userId => ({
        task_id: taskId,
        user_id: userId,
        participation_role: 'EXECUTOR'
      }));
      // Delete any existing matching roles just in case, then insert
      await supabaseAdmin.from('task_participants')
        .delete()
        .eq('task_id', taskId)
        .in('user_id', newExecutors);
        
      await supabaseAdmin.from('task_participants').insert(execsData);
    }

    // --- AUTO-WATCHER LOGIC ---
    // Fetch stakeholders for the destination workspace
    const targetStakeholders = await fetchWorkspaceStakeholders(finalWorkspaceId);
    
    // Fetch all current participants (which now includes valid old ones + new executors)
    const { data: currentParticipants } = await supabaseAdmin
      .from('task_participants')
      .select('user_id')
      .eq('task_id', taskId);
      
    // Get the final assignee (either new or existing)
    const finalAssigneeId = newAssigneeId || task.assigned_to;
    
    const existingUserIds = new Set(currentParticipants?.map(p => p.user_id) || []);
    if (finalAssigneeId) existingUserIds.add(finalAssigneeId);

    const watcherData = targetStakeholders
      .filter((s: any) => !existingUserIds.has(s.id))
      .map((s: any) => ({
        task_id: taskId,
        user_id: s.id,
        participation_role: 'WATCHER'
      }));

    if (watcherData.length > 0) {
      await supabaseAdmin.from('task_participants').insert(watcherData);
    }
    // --------------------------

    // Log activity
    await supabaseAdmin.from('task_activity_logs').insert([{
      task_id: taskId,
      actor_id: user.id,
      action: 'WORKSPACE_CHANGE',
      new_state: { 
        workspace_id: targetWorkspaceId, 
        sub_workspace_id: targetSubworkspaceId || null,
        remarks: remarks,
        dropped_users: droppedUsers,
        new_assignee: newAssigneeId
      }
    }]);

    if (remarks && remarks.trim()) {
      let commentMsg = `[TRANSFERRED] ${remarks.trim()}`;
      if (droppedUsers && droppedUsers.length > 0) {
        commentMsg += `\n\n(System Note: ${droppedUsers.length} out-of-scope users were dropped during transfer.)`;
      }
      if (newAssigneeId) {
        commentMsg += `\n(System Note: Primary Assignee was updated due to scope mismatch.)`;
      }
      
      await supabaseAdmin.from('task_comments').insert([{
        task_id: taskId,
        author_id: user.id,
        content: commentMsg
      }]);
    }

    revalidatePath('/workspaces');
    revalidatePath('/tasks');
    return { success: true };
  } catch (err: any) {
    console.error("Transfer error:", err);
    return { error: err.message };
  }
}


export async function getTransferableWorkspaces() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { getVisibleWorkspaces } = await import('@/lib/repositories/workspaces');
    const workspaces = await getVisibleWorkspaces(user.id);
    return workspaces || [];
  } catch (err) {
    console.error("Error fetching workspaces for transfer:", err);
    return [];
  }
}
