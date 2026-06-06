"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { dispatchNotification } from '@/lib/actions/notifications';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

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

    // Create Task
    const cleanUUID = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert([{
        workspace_id: cleanUUID(payload.workspace_id),
        sub_workspace_id: cleanUUID(payload.sub_workspace_id),
        parent_task_id: cleanUUID(payload.parent_task_id),
        sprint_id: cleanUUID(payload.sprint_id),
        template_id: cleanUUID(payload.template_id),
        subject: payload.subject || payload.title || 'Untitled Task',
        description: payload.description,
        priority_id: cleanUUID(payload.priority_id),
        status_id: statusMaster.id,
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
    const { hasPermission } = await import('@/lib/permissions');
    const isSuperAdmin = await hasPermission(userId, "WORKSPACES_MANAGE");
    
    const { data: participant } = await supabaseAdmin
      .from('task_participants')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!isSuperAdmin && !participant) {
       return { error: "You do not have permission to transition this task status. Only the Task Assignee, Participants, or Super Admin can edit the status." };
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
    await supabaseAdmin.from('activity_events').insert([{
      module_type: moduleType,
      record_id: recordId,
      event_type: eventType,
      old_value: oldValue,
      new_value: newValue,
      performed_by: performedBy
    }]);
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
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      status:status_master(id, name:status_name, code:status_code, is_closed),
      priority:priority_master(id, name:priority_name, color:priority_color),
      workspace:workspaces(id, name:workspace_name)
    `)
    .eq('id', taskId)
    .single();

  if (error || !task) {
    return { error: error?.message || "Task not found" };
  }

  if (task.created_by) {
    const { data: creator } = await supabaseAdmin.from('user_master').select('id, full_name, user_code').eq('id', task.created_by).single();
    task.creator = creator;
  }

  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;

  let isSuperAdmin = false;
  let isWorkspaceMember = false;

  if (userId) {
    const { hasPermission } = await import('@/lib/permissions');
    isSuperAdmin = await hasPermission(userId, "WORKSPACES_MANAGE");

    if (!isSuperAdmin && task.workspace_id) {
      const { data: directMembership } = await supabaseAdmin
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', task.workspace_id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (directMembership) {
        isWorkspaceMember = true;
      } else {
        const { data: userTeams } = await supabaseAdmin
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId);
          
        if (userTeams && userTeams.length > 0) {
          const teamIds = userTeams.map((t: any) => t.team_id);
          const { data: wsTeams } = await supabaseAdmin
            .from('workspace_teams')
            .select('id')
            .eq('workspace_id', task.workspace_id)
            .in('team_id', teamIds)
            .limit(1);
            
          if (wsTeams && wsTeams.length > 0) {
            isWorkspaceMember = true;
          }
        }
      }
    } else {
      isWorkspaceMember = isSuperAdmin;
    }
  }

  task.currentUserIsSuperAdmin = isSuperAdmin;
  
  const isAssignee = task.assigned_to === userId;

  task.currentUserCanAct = isSuperAdmin || isAssignee;
  task.currentUserId = userId || null;

  task.checklists = [];
  task.attachments = [];

  task.assignee = null;
  if (task.assigned_to) {
    const { data: assigneeData } = await supabaseAdmin.from('user_master').select('id, full_name, profile_photo').eq('id', task.assigned_to).single();
    if (assigneeData) task.assignee = assigneeData;
  }
  
  const { count: checklistCount } = await supabaseAdmin.from('task_checklists').select('*', { count: 'exact', head: true }).eq('task_id', taskId);
  const { count: attachmentCount } = await supabaseAdmin.from('task_attachments').select('*', { count: 'exact', head: true }).eq('task_id', taskId);
  task._meta = {
    checklistCount: checklistCount || 0,
    attachmentCount: attachmentCount || 0
  };
  
  const { data: participants } = await supabaseAdmin.from('task_participants').select('user_id, participation_role').eq('task_id', taskId);
  
  let participantIds = new Set<string>();
  if (participants) participants.forEach(p => participantIds.add(p.user_id));

  task.task_assignees = [];
  task.task_watchers = [];
  task.task_teams = [];

  if (participantIds.size > 0) {
    const { data: usersData } = await supabaseAdmin.from('user_master').select('id, full_name, profile_photo').in('id', Array.from(participantIds));
    if (usersData && participants) {
      task.task_assignees = participants
        .filter(p => p.participation_role === 'EXECUTOR')
        .map(p => usersData.find(u => u.id === p.user_id))
        .filter(Boolean);
      
      task.task_reviewers = participants
        .filter(p => p.participation_role === 'REVIEWER')
        .map(p => usersData.find(u => u.id === p.user_id))
        .filter(Boolean);

      task.task_watchers = participants
        .filter(p => p.participation_role === 'WATCHER')
        .map(p => usersData.find(u => u.id === p.user_id))
        .filter(Boolean);
    }
  }

  // Fetch Inherited Workspace Access (Assignees/Viewers)
  task.inherited_users = [];
  if (task.workspace_id) {
    const { data: wsMembers } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', task.workspace_id)
      .eq('is_deleted', false);
      
    if (wsMembers && wsMembers.length > 0) {
      const wsUserIds = Array.from(new Set(wsMembers.map(m => m.user_id)));
      const { data: wsUsersData } = await supabaseAdmin
        .from('user_master')
        .select('id, full_name, profile_photo')
        .in('id', wsUserIds);
        
      if (wsUsersData) {
        task.inherited_users = wsMembers.map(m => {
          const u = wsUsersData.find(user => user.id === m.user_id);
          if (!u) return null;
          return { ...u, workspace_role: m.role };
        }).filter(Boolean);
      }
    }
  }
  
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
    const { hasPermission } = await import('@/lib/permissions');
    const isSuperAdmin = await hasPermission(userId, "WORKSPACES_MANAGE");
    
    // Check if user is a participant (Executor, Watcher, Reviewer)
    const { data: participant } = await supabaseAdmin
      .from('task_participants')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!isSuperAdmin && !participant) {
       return { error: "You do not have permission to edit this task. Only the Task Owner, Participants, or Super Admin can edit." };
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
    const isSuperAdmin = await hasPermission(userId, "WORKSPACES_MANAGE");
    const canDelete = await hasPermission(userId, "TASKS_DELETE");

    if (!isSuperAdmin && !canDelete) {
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
      const { hasPermission } = await import('@/lib/permissions');
      const isSuperAdmin = await hasPermission(userId, "WORKSPACES_MANAGE");
      
      const { data: participant } = await supabaseAdmin
        .from('task_participants')
        .select('id')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!isSuperAdmin && !participant) {
        return { error: "Only the assigned user, execution team, or Super Admin can change the task status." };
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

