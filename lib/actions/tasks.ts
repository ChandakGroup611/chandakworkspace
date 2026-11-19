"use server";

import { supabaseAdmin } from '@/lib/supabase/service_role';
import { revalidatePath } from 'next/cache';
import { queueBusinessEvent } from '@/lib/actions/notification-engine';
import { dispatchNotification } from '@/lib/actions/notifications';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { fetchWorkspaceStakeholders } from '@/lib/actions/workspaces';
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
    let creatorId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) creatorId = user.id;
    } catch {
      // In background scripts or test execution context
    }

    if (!creatorId) {
      if (process.env.NODE_ENV === "test" || process.env.SANDBOX_CONFIRM === "yes") {
        creatorId = payload.created_by;
      }
    }

    if (!creatorId) return { error: "Unauthenticated: cannot determine task creator" };
    payload.created_by = creatorId;

    let finalStatusId = payload.status_id;

    if (!finalStatusId) {
      // Find the single active non-closed default status for scope TASK (Decision D5 / Item 2.7)
      const { data: defaultStatus } = await supabaseAdmin
        .from('status_master')
        .select('id, is_closed, is_terminal')
        .eq('is_default', true)
        .eq('scope_type', 'TASK')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .maybeSingle();

      if (!defaultStatus || defaultStatus.is_closed || defaultStatus.is_terminal) {
        return { error: 'No active non-closed default status configured for TASK scope.' };
      }
      finalStatusId = defaultStatus.id;
    } else {
      // Validate provided status_id
      const { data: validStatus } = await supabaseAdmin
        .from('status_master')
        .select('id')
        .eq('id', finalStatusId)
        .eq('scope_type', 'TASK')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .maybeSingle();

      if (!validStatus) {
        return { error: 'Invalid task status: status must be active, non-deleted, and scoped to TASK.' };
      }
    }

    let finalPriorityId = payload.priority_id && typeof payload.priority_id === 'string' ? payload.priority_id.trim() : null;
    if (!finalPriorityId) {
      const { data: defaultPri } = await supabaseAdmin
        .from('priority_master')
        .select('id')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('priority_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      finalPriorityId = defaultPri?.id || null;
    }
    if (!finalPriorityId) {
      return { error: "Task Priority is mandatory. Please select a priority." };
    }

    // Create Task
    const cleanUUID = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;
    const finalWorkspaceId = cleanUUID(payload.sub_workspace_id) || cleanUUID(payload.workspace_id);

    // Strict Access Validation:
    // 1. Workspace membership check & Module RBAC TASKS_CREATE (grandfathered for existing members until WP7)
    const { hasPermission } = await import('@/lib/permissions');
    const { can } = await import('@/lib/permissions/module-access');
    const isSuperAdmin = await hasPermission(creatorId, 'SUPER_ADMIN');

    if (!isSuperAdmin && finalWorkspaceId) {
      const [memberCheck, ownerCheck] = await Promise.all([
        supabaseAdmin.from('workspace_members').select('id').eq('workspace_id', finalWorkspaceId).eq('user_id', creatorId).eq('is_deleted', false).maybeSingle(),
        supabaseAdmin.from('workspaces').select('id').eq('id', finalWorkspaceId).eq('workspace_owner_id', creatorId).eq('is_deleted', false).maybeSingle()
      ]);

      const isMemberOrOwner = !!(memberCheck.data || ownerCheck.data);

      if (!isMemberOrOwner) {
        const canCreate = await can(creatorId, 'TASK_WORKFLOW', 'TASKS_CREATE', { workspace_id: finalWorkspaceId || undefined });
        if (!canCreate) {
          return { error: "Access Denied: You do not have permission to create tasks in this workspace or sub-workspace." };
        }
      }
    } else if (!isSuperAdmin) {
      const canCreate = await can(creatorId, 'TASK_WORKFLOW', 'TASKS_CREATE');
      if (!canCreate) {
        return { error: "Access Denied: You lack TASKS_CREATE permission in Task Workflow." };
      }
    }

    // 2. Parent task participant check (for sub-tasks)
    const parentTaskId = cleanUUID(payload.parent_task_id);
    if (!isSuperAdmin && parentTaskId) {
      const { data: parentTask } = await supabaseAdmin
        .from('tasks')
        .select('id, assigned_to, created_by, owner_id')
        .eq('id', parentTaskId)
        .eq('is_deleted', false)
        .single();

      if (!parentTask) {
        return { error: "Parent task not found or has been removed." };
      }

      const isParentOwner = parentTask.assigned_to === creatorId || parentTask.created_by === creatorId || parentTask.owner_id === creatorId;
      if (!isParentOwner) {
        let isWsLeader = false;
        if (finalWorkspaceId) {
          const { data: ws } = await supabaseAdmin.from('workspaces').select('workspace_owner_id').eq('id', finalWorkspaceId).maybeSingle();
          if (ws?.workspace_owner_id === creatorId) {
            isWsLeader = true;
          } else {
            const { data: mem } = await supabaseAdmin.from('workspace_members').select('role').eq('workspace_id', finalWorkspaceId).eq('user_id', creatorId).eq('is_deleted', false).maybeSingle();
            if (mem && (mem.role === 'manager' || mem.role === 'owner' || mem.role === 'WORKSPACE_MANAGER' || mem.role === 'WORKSPACE_OWNER')) {
              isWsLeader = true;
            }
          }
        }

        if (!isWsLeader) {
          const { data: isPart } = await supabaseAdmin
            .from('task_participants')
            .select('user_id')
            .eq('task_id', parentTaskId)
            .eq('user_id', creatorId)
            .maybeSingle();

          if (!isPart) {
            return { error: "Access Denied: You must be a participant, assignee, or workspace leader to create sub-tasks under it." };
          }
        }
      }
    }

    // Prevent duplicate rapid-fire task creation (Idempotency / Double-click Protection: 3 seconds)
    const threeSecondsAgo = new Date(Date.now() - 3 * 1000).toISOString();
    const taskSubject = payload.subject || payload.title || 'Untitled Task';
    let dupQuery = supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('subject', taskSubject)
      .eq('workspace_id', finalWorkspaceId)
      .eq('created_by', creatorId)
      .gte('created_at', threeSecondsAgo);

    if (parentTaskId) {
      dupQuery = dupQuery.eq('parent_task_id', parentTaskId);
    } else {
      dupQuery = dupQuery.is('parent_task_id', null);
    }

    const { data: existingTask } = await dupQuery.limit(1);

    if (existingTask && existingTask.length > 0) {
      console.warn("[createTask] Prevented duplicate rapid task creation");
      return { success: true, warning: "Task was already created recently. Duplicate prevented." };
    }
    let startDate = (payload.start_date && payload.start_date.trim()) ? payload.start_date.trim() : null;
    let endDate = (payload.end_date && payload.end_date.trim()) ? payload.end_date.trim() : null;

    if (endDate && !startDate) {
      startDate = new Date().toISOString().split('T')[0];
    }

    if (startDate && endDate && startDate > endDate) {
      return { error: "Start date cannot be later than target due date" };
    }

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
        start_date: startDate,
        end_date: endDate,
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

    // Ensure all assigned users and participants are members of the workspace
    if (finalWorkspaceId) {
      const allTaskMemberIds = Array.from(new Set([
        creatorId,
        ...(payload.assigned_to ? [payload.assigned_to] : []),
        ...(payload.participants?.map((p: any) => p.user_id) || [])
      ])).filter(Boolean);

      if (allTaskMemberIds.length > 0) {
        const memberRows = allTaskMemberIds.map((uid: string) => ({
          workspace_id: finalWorkspaceId,
          user_id: uid,
          role: uid === creatorId ? 'manager' : 'member',
          is_deleted: false
        }));
        await supabaseAdmin.from('workspace_members').upsert(memberRows, { onConflict: 'workspace_id,user_id' });
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

    // Insert Attachments (with automated storage upload to prevent base64 DB bloat)
    if (payload.attachments && payload.attachments.length > 0) {
      const attachmentData = await Promise.all(payload.attachments.map(async (att) => {
        let finalFileUrl = att.file_url;
        if (finalFileUrl && finalFileUrl.startsWith("data:")) {
          try {
            const commaIdx = finalFileUrl.indexOf(",");
            if (commaIdx !== -1) {
              const meta = finalFileUrl.slice(0, commaIdx);
              const b64 = finalFileUrl.slice(commaIdx + 1);
              const mimeMatch = meta.match(/data:([^;]+)/);
              const detectedMime = mimeMatch ? mimeMatch[1] : (att.file_type || "application/octet-stream");
              const buffer = Buffer.from(b64, "base64");
              const cleanFileName = (att.file_name || "attachment").replace(/[^a-zA-Z0-9._-]/g, "_");
              const storagePath = `tasks/${task.id}/${Date.now()}_${cleanFileName}`;

              const { error: upErr } = await supabaseAdmin.storage
                .from("ticket-attachments")
                .upload(storagePath, buffer, { contentType: detectedMime, upsert: true });

              if (!upErr) {
                finalFileUrl = `storage:ticket-attachments:${storagePath}`;
              }
            }
          } catch (uploadErr) {
            console.warn("[createTask] attachment storage upload fallback:", uploadErr);
          }
        }

        return {
          task_id: task.id,
          file_name: att.file_name,
          file_url: finalFileUrl,
          file_type: att.file_type,
          size: att.size,
          uploaded_by: creatorId
        };
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

    let creatorName = 'System';
    if (creatorId) {
      const { data: creator } = await supabaseAdmin.from('user_master').select('full_name').eq('id', creatorId).single();
      if (creator) creatorName = creator.full_name || 'System';
    }

    // In-app & realtime notifications
    if (task.assigned_to && task.assigned_to !== creatorId) {
      dispatchNotification(
        task.assigned_to,
        'Task Assigned',
        `You have been assigned as primary assignee to task "${task.subject}".`,
        `/tasks/${task.id}`,
        'TASK',
        'ASSIGNED',
        { task_name: task.subject, status: 'NEW', creator_name: creatorName, _disableEmail: true }
      ).catch(e => console.error("[createTask] dispatchNotification primary failed", e));
    }

    if (payload.participants && payload.participants.length > 0) {
      for (const p of payload.participants) {
        if (p.user_id && p.user_id !== creatorId && p.user_id !== task.assigned_to) {
          dispatchNotification(
            p.user_id,
            'Task Assignment',
            `You have been assigned as ${p.participation_role?.toLowerCase() || 'executor'} to task "${task.subject}".`,
            `/tasks/${task.id}`,
            'TASK',
            'ASSIGNED',
            { task_name: task.subject, status: 'NEW', creator_name: creatorName, _disableEmail: true }
          ).catch(e => console.error("[createTask] dispatchNotification participant failed", e));
        }
      }
    }

    // ENTERPRISE NOTIFICATION ROUTING
    // Fire-and-forget: Push to async background queue
    const taskPayload = {
      entity_id: task.id,
      triggering_user_id: creatorId,
      status: "NEW", // The default status logic applied it
      task_name: task.subject,
      created_by: creatorId,
      creator_name: creatorName,
      assigned_to: task.assigned_to,
      priority: task.priority_id,
      due_date: task.end_date,
      workspace_id: task.workspace_id,
      is_subtask: !!task.parent_task_id,
      parent_task_id: task.parent_task_id || null,
      task_type: task.parent_task_id ? 'Subtask' : 'Task',
      link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tasks/${task.id}`
    };

    queueBusinessEvent("Task", "Assigned", taskPayload)
      .catch(e => console.error("[createTask] Task Assigned push failed", e));

    return task;
  } catch (err: any) {
    console.error("[createTask] Unexpected Error:", err);
    return { error: err?.message || String(err) };
  }
}

export async function changeTaskStatus(
  taskId: string,
  targetStatusIdOrCode: string,
  remark?: string,
  actorIdOverride?: string
): Promise<{ success: boolean; data?: { status_id: string; status_name: string }; error?: string }> {
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    userId = user?.id || null;
  } catch {
    // Background scripts or test execution context
  }

  if (!userId) {
    if (process.env.NODE_ENV !== "production") {
      userId = actorIdOverride || null;
    }
  }

  if (!userId) return { success: false, error: "Unauthenticated" };

  // Fetch current task
  const { data: task, error: fetchErr } = await supabaseAdmin
    .from('tasks')
    .select('id, subject, status_id, assigned_to, created_by, owner_id, workspace_id, parent_task_id, workspace:workspaces(workspace_owner_id)')
    .eq('id', taskId)
    .single();

  if (fetchErr || !task) return { success: false, error: "Task not found" };

  // Validate target status from status_master: must be active, non-deleted, and scoped to TASK
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let targetQuery = supabaseAdmin
    .from('status_master')
    .select('*')
    .eq('scope_type', 'TASK')
    .eq('is_active', true)
    .eq('is_deleted', false);

  if (uuidRegex.test(targetStatusIdOrCode)) {
    targetQuery = targetQuery.eq('id', targetStatusIdOrCode);
  } else {
    targetQuery = targetQuery.eq('status_code', targetStatusIdOrCode.toUpperCase());
  }

  const { data: targetStatus } = await targetQuery.maybeSingle();
  if (!targetStatus) {
    return { success: false, error: `Invalid status: Target status '${targetStatusIdOrCode}' must be active, non-deleted, and scoped to TASK.` };
  }

  // Get current status details
  let currentStatus: any = null;
  if (task.status_id) {
    const { data: cs } = await supabaseAdmin
      .from('status_master')
      .select('*')
      .eq('id', task.status_id)
      .maybeSingle();
    currentStatus = cs;
  }

  // Permission checks: Super Admin, Task Assignee/Owner/Creator, or participant EXECUTOR / PRIMARY
  const { hasPermission } = await import('@/lib/permissions');
  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
  const isTaskAssignee = task.assigned_to === userId || task.owner_id === userId || task.created_by === userId;

  let isAuthorized = isSuperAdmin || isTaskAssignee;
  if (!isAuthorized) {
    const { data: participant } = await supabaseAdmin
      .from('task_participants')
      .select('participation_role')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    if (participant && (participant.participation_role === 'EXECUTOR' || participant.participation_role === 'PRIMARY')) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, {
      action_attempted: 'CHANGE_TASK_STATUS',
      target_status: targetStatus.id,
      target_code: targetStatus.status_code
    }, userId);
    return { success: false, error: "You do not have permission to transition this task status. Only the Task Assignee/Owner, Assigned Executives (Primary/Executor), or Super Admin can edit the status." };
  }

  // Freeze rule (R1): If task is currently Closed, only Super Admin and Task Owner/Assignee can reopen/transition it
  const isCurrentClosed = currentStatus && (currentStatus.is_closed || currentStatus.is_terminal);
  if (isCurrentClosed) {
    const canReopenClosed = isSuperAdmin || (task.assigned_to === userId || task.owner_id === userId);
    if (!canReopenClosed) {
      return { success: false, error: "This task is strictly frozen because it is Closed. Only Super Admins and the Task Assignee (Task Owner) can reopen it." };
    }
  }

  // Sub-task blocker rule (R2): Cannot close main task if any non-deleted sub-task is not closed
  const isTargetClosed = targetStatus.is_closed || targetStatus.is_terminal;
  if (isTargetClosed) {
    const { data: subTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, subject, status_id')
      .eq('parent_task_id', taskId)
      .eq('is_deleted', false);

    if (subTasks && subTasks.length > 0) {
      const subStatusIds = [...new Set(subTasks.map((st: any) => st.status_id).filter(Boolean))];
      const { data: subStatuses } = await supabaseAdmin
        .from('status_master')
        .select('id, is_closed, is_terminal')
        .in('id', subStatusIds);

      const closedMap = new Map((subStatuses || []).map((s: any) => [s.id, s.is_closed || s.is_terminal]));
      const openSubtask = subTasks.find((st: any) => !closedMap.get(st.status_id));
      if (openSubtask) {
        return { success: false, error: `Cannot complete task. Blocked by incomplete sub-task: "${openSubtask.subject}"` };
      }
    }
  }

  // Write new status
  const { error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({ status_id: targetStatus.id, updated_at: new Date().toISOString() })
    .eq('id', taskId);

  if (updateError) return { success: false, error: updateError.message || JSON.stringify(updateError) };

  // Fix audit log trigger fallback
  await supabaseAdmin
    .from('task_activity_logs')
    .update({ actor_id: userId })
    .eq('task_id', taskId)
    .is('actor_id', null);

  // Side effect 1: Activity log with actor and status names
  const oldName = currentStatus?.status_name || currentStatus?.status_code || "Unknown";
  const newName = targetStatus.status_name || targetStatus.status_code;
  await supabaseAdmin.from('task_activity_logs').insert([{
    task_id: taskId,
    actor_id: userId,
    action: 'STATUS_CHANGE',
    new_state: {
      status_id: targetStatus.id,
      status_name: newName,
      status_code: targetStatus.status_code,
      old_status_name: oldName,
      message: remark || null
    }
  }]);

  // Side effect 2: Insert remark comment if provided
  if (remark && remark.trim().length > 0) {
    await supabaseAdmin
      .from('task_comments')
      .insert([{ task_id: taskId, author_id: userId, content: remark.trim() }]);
  }

  // Side effect 3: Notification queue push with names old -> new
  const statusTransitionDisplay = `${oldName} → ${newName}`;
  queueBusinessEvent("Task", "Status Changed", {
    entity_id: taskId,
    triggering_user_id: userId,
    status: targetStatus.id,
    status_name: newName,
    status_transition: statusTransitionDisplay,
    old_status: oldName,
    new_status: newName,
    task_name: task.subject,
    assigned_to: task.assigned_to,
    created_by: task.created_by,
    workspace_id: task.workspace_id,
    remarks: remark || "",
    link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tasks/${taskId}`
  }).catch(e => console.error("[NotificationEngine] Status change queue push failed", e));

  // Side effect 4: Parent progress up the whole chain & requirement/dependency propagation
  await propagateTaskDependencies(taskId);

  // Side effect 5: Revalidate paths
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/workspaces', 'page');
    revalidatePath('/workspaces/tasks', 'page');
    revalidatePath('/tasks', 'layout');
    revalidatePath(`/tasks/${taskId}`, 'page');
  } catch {}

  return { success: true, data: { status_id: targetStatus.id, status_name: newName } };
}

export async function transitionTaskStatus(taskId: string, newStatusIdOrCode: string, performedBy?: string) {
  return changeTaskStatus(taskId, newStatusIdOrCode, undefined, performedBy);
}

export async function updateNodeStatus(nodeId: string, nodeType: string, newStatusId: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  if (nodeType === 'TASK') {
    return changeTaskStatus(nodeId, newStatusId, undefined, userId);
  }

  const table = nodeType === 'SUB_TASK' ? 'sub_tasks' : null;
  if (!table) return { error: "Invalid node type for status update" };

  // Get current status
  const { data: node } = await (supabaseAdmin.from(table) as any)
    .select('status_id, task_id')
    .eq('id', nodeId)
    .single();

  if (!node) return { error: "Node not found" };

  const targetTaskId = (node as any).task_id;
  if (targetTaskId) {
    const { canAccessTask } = await import("@/lib/permissions");
    if (!(await canAccessTask(userId, targetTaskId))) {
      return { error: "Unauthorized: You do not have permission to update this task status." };
    }
  }

  // Update status
  const { error } = await supabaseAdmin
    .from(table)
    .update({ status_id: newStatusId, updated_at: new Date().toISOString() })
    .eq('id', nodeId);

  if (error) return { error: error.message };

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
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  if (!user) throw new Error("Unauthenticated. Please log in.");

  const { canManageWorkspace, hasPermission } = await import("@/lib/permissions");
  const isSuper = await hasPermission(user.id, "SUPER_ADMIN");
  const canManage = isSuper || (await canManageWorkspace(user.id, workspaceId));
  if (!canManage) throw new Error("Unauthorized: You do not have permission to manage custom fields in this workspace.");

  const fieldKey = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const { data, error } = await supabaseAdmin
    .from('task_custom_fields_master')
    .insert([{
      workspace_id: workspaceId,
      field_name: fieldName,
      field_key: fieldKey,
      field_type: fieldType,
      created_by: user.id
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
  try {
    noStore();
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    const userId = user?.id;

    const t0 = performance.now();
    const [
      { data: task, error },
      { count: checklistCount },
      { count: attachmentCount },
      { data: participants },
      { data: subtasksRaw },
      permissionsModule
    ] = await Promise.all([
      supabaseAdmin.from('tasks').select(`
        *,
        status:status_master(id, name:status_name, code:status_code, is_closed),
        priority:priority_master(id, name:priority_name, color:priority_color),
        department:departments(id, name),
        workspace:workspaces(id, name:workspace_name, workspace_owner_id, members:workspace_members(user_id, role, is_deleted))
      `).eq('id', taskId).single(),
      supabaseAdmin.from('task_checklists').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
      supabaseAdmin.from('task_attachments').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
      supabaseAdmin.from('task_participants').select('user_id, participation_role').eq('task_id', taskId),
      supabaseAdmin.from('tasks').select(`
        id,
        task_code,
        subject,
        status_id,
        priority_id,
        start_date,
        end_date,
        assigned_to,
        created_by,
        created_at,
        status:status_master(id, name:status_name, code:status_code, color:status_color, is_closed),
        priority:priority_master(id, name:priority_name, color:priority_color)
      `).eq('parent_task_id', taskId).eq('is_deleted', false).order('created_at', { ascending: true }),
      userId ? import('@/lib/permissions').catch(() => null) : Promise.resolve(null)
    ]);
    const t1 = performance.now(); console.log(`[getTaskDetails] Parallel fetch took ${(t1 - t0).toFixed(2)}ms`);

    if (error || !task) return { error: error?.message || "Task not found" };

    let isSuperAdmin = false;
    if (userId && permissionsModule) {
      try {
        isSuperAdmin = await permissionsModule.hasPermission(userId, "SUPER_ADMIN");
      } catch (permErr) {
        console.warn("[getTaskDetails] Error checking permissions:", permErr);
      }
    }

    let wsMembers: any[] = [];
    let isWorkspaceMember = isSuperAdmin;

    if (task.workspace_id) {
      wsMembers = (task.workspace?.members || []).filter((m: any) => !m.is_deleted);

      if (userId && !isSuperAdmin) {
        if (wsMembers.some(m => m.user_id === userId)) {
          isWorkspaceMember = true;
        } else {
          try {
            const { data: userTeams } = await supabaseAdmin.from('team_members').select('team_id').eq('user_id', userId);
            if (userTeams && userTeams.length > 0) {
              const teamIds = userTeams.map((t: any) => t.team_id);
              const { data: wsTeams } = await supabaseAdmin.from('workspace_teams').select('id').eq('workspace_id', task.workspace_id).in('team_id', teamIds).limit(1);
              if (wsTeams && wsTeams.length > 0) isWorkspaceMember = true;
            }
          } catch (teamErr) {
            console.warn("[getTaskDetails] Error checking workspace teams:", teamErr);
          }
        }
      }
    }

    let isReportingManagerOrDeptHead = false;
    if (userId && !isSuperAdmin) {
      try {
        const { getUserAccessScope } = await import('@/lib/auth/scope');
        const userScope = await getUserAccessScope(userId);
        if (task.assigned_to && userScope.subordinateUserIds.includes(task.assigned_to)) {
          isReportingManagerOrDeptHead = true;
        } else if (task.created_by && userScope.subordinateUserIds.includes(task.created_by)) {
          isReportingManagerOrDeptHead = true;
        } else if (task.department_id && userScope.managedDepartmentIds.includes(task.department_id)) {
          isReportingManagerOrDeptHead = true;
        }
      } catch (scopeErr) {
        console.warn("[getTaskDetails] Error checking scope hierarchy:", scopeErr);
      }
    }

    const isAuthorized =
      isSuperAdmin ||
      isWorkspaceMember ||
      isReportingManagerOrDeptHead ||
      task.created_by === userId ||
      task.assigned_to === userId ||
      (participants && participants.some(p => p.user_id === userId));

    if (!isAuthorized) {
      return { error: "Access Denied: You are not authorized to view this task." };
    }

    // User Lookup Consolidation
    const uniqueUserIds = new Set<string>();
    if (task.created_by) uniqueUserIds.add(task.created_by);
    if (task.assigned_to) uniqueUserIds.add(task.assigned_to);
    if (participants) participants.forEach(p => uniqueUserIds.add(p.user_id));
    wsMembers.forEach(m => uniqueUserIds.add(m.user_id));
    if (subtasksRaw) {
      subtasksRaw.forEach((st: any) => {
        if (st.assigned_to) uniqueUserIds.add(st.assigned_to);
        if (st.created_by) uniqueUserIds.add(st.created_by);
      });
    }

    let usersMap = new Map<string, any>();
    if (uniqueUserIds.size > 0) {
      try {
        const { data: allUsers } = await supabaseAdmin
          .from('user_master')
          .select('id, full_name, profile_photo, user_code, is_deleted, is_active')
          .in('id', Array.from(uniqueUserIds))
          .eq('is_deleted', false);

        if (allUsers) {
          allUsers.forEach(u => {
            if (u.full_name !== 'Deleted User') {
              usersMap.set(u.id, u);
            }
          });
        }
      } catch (uErr) {
        console.warn("[getTaskDetails] Error fetching user_master records:", uErr);
      }
    }

    const validWsMemberUserIds = new Set(wsMembers.map(m => m.user_id));

    task.creator = task.created_by ? usersMap.get(task.created_by) || null : null;
    task.assignee = task.assigned_to ? usersMap.get(task.assigned_to) || null : null;

    task.task_assignees = [];
    task.task_reviewers = [];
    task.task_watchers = [];

    if (participants) {
      participants.forEach(p => {
        const u = usersMap.get(p.user_id);
        if (!u) return;
        if (p.participation_role === 'EXECUTOR') {
          task.task_assignees.push(u);
        } else if (p.participation_role === 'REVIEWER') {
          task.task_reviewers.push(u);
        } else if (p.participation_role === 'WATCHER') {
          // Watchers must strictly be active members of the workspace
          if (validWsMemberUserIds.has(p.user_id)) {
            task.task_watchers.push(u);
          }
        }
      });
    }

    task.inherited_users = wsMembers.map(m => {
      const u = usersMap.get(m.user_id);
      return u ? { ...u, workspace_role: m.role } : null;
    }).filter(Boolean);

    task.subtasks = (subtasksRaw || []).map((st: any) => ({
      ...st,
      assignee: st.assigned_to ? usersMap.get(st.assigned_to) || null : null
    }));

    task._meta = {
      checklistCount: checklistCount || 0,
      attachmentCount: attachmentCount || 0,
      subtaskCount: (subtasksRaw || []).length
    };

    const isTaskAssignee = task.assigned_to === userId || task.owner_id === userId;
    const isTaskCreator = task.created_by === userId;
    const canManageClosedTask = isSuperAdmin || isTaskAssignee;

    task.isTaskOwner = isTaskAssignee;
    task.isTaskAssignee = isTaskAssignee;
    task.isTaskCreator = isTaskCreator;
    task.canManageClosedTask = canManageClosedTask;
    task.currentUserIsSuperAdmin = isSuperAdmin;
    task.currentUserCanAct = isTaskAssignee || (participants && participants.some(p => p.user_id === userId && p.participation_role === 'EXECUTOR')) || isSuperAdmin;
    task.currentUserId = userId || null;
    task.title = task.subject;
    task.checklists = [];
    task.attachments = [];
    task.task_teams = [];

    return task;
  } catch (err: any) {
    console.error("[getTaskDetails] Unhandled Exception:", err);
    return { error: err.message || "Failed to load task details" };
  }
}

export async function getTaskChecklists(taskId: string) {
  try {
    const { data, error } = await supabaseAdmin.from('task_checklists').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    if (error) {
      console.warn("[getTaskChecklists] Query error:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("[getTaskChecklists] Exception:", err);
    return [];
  }
}

export async function getTaskAttachments(taskId: string) {
  try {
    const { data, error } = await supabaseAdmin.from('task_attachments').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
    if (error) {
      console.warn("[getTaskAttachments] Query error:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("[getTaskAttachments] Exception:", err);
    return [];
  }
}

export async function getWorkloadSnapshot(userId: string) {
  try {
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
  } catch (err: any) {
    console.error("[getWorkloadSnapshot] Error:", err);
    return {
      active_tasks: 0,
      overdue_tasks: 0,
      capacity_percentage: 0,
      estimated_hours: 0,
      available_capacity: 100
    };
  }
}

export async function updateTask(taskId: string, payload: any) {
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    userId = user?.id || null;
  } catch {
    // In background scripts or test execution context
  }

  if (!userId) {
    if (process.env.NODE_ENV !== "production") {
      userId = payload?.performedBy || payload?.userId || null;
    }
  }

  if (!userId) return { error: "Unauthenticated" };

  const { data: task } = await supabaseAdmin.from('tasks').select('assigned_to, subject, description, created_by, owner_id, workspace_id, start_date, end_date, workspace:workspaces(workspace_owner_id)').eq('id', taskId).single();
  if (!task) return { error: "Task not found" };

  const isTaskAssignee = task.assigned_to === userId || task.owner_id === userId || task.created_by === userId;

  if (!isTaskAssignee) {
    // Check if workspace owner or manager
    let isWorkspaceLeader = false;
    const wsOwnerId = Array.isArray(task.workspace) ? (task.workspace[0] as any)?.workspace_owner_id : (task.workspace as any)?.workspace_owner_id;
    if (wsOwnerId === userId) {
      isWorkspaceLeader = true;
    } else if (task.workspace_id) {
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', task.workspace_id)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .maybeSingle();
      if (member && (member.role === 'manager' || member.role === 'owner' || member.role === 'WORKSPACE_MANAGER' || member.role === 'WORKSPACE_OWNER')) {
        isWorkspaceLeader = true;
      }
    }

    if (!isWorkspaceLeader) {
      const { data: participant } = await supabaseAdmin
        .from('task_participants')
        .select('user_id, participation_role')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .maybeSingle();

      const isExecutor = participant && (participant.participation_role === 'EXECUTOR' || participant.participation_role === 'PRIMARY');

      if (!isExecutor) {
        // Check if user is a super admin
        let isAuthorizedAdmin = false;
        try {
          const permissionsModule = await import('@/lib/permissions');
          isAuthorizedAdmin = await permissionsModule.hasPermission(userId, "SUPER_ADMIN");
        } catch (e) {
          console.warn("[updateTask] Permission check failed", e);
        }

        if (!isAuthorizedAdmin) {
          await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, {
            action_attempted: 'UPDATE_TASK'
          }, userId);
          return { error: "You do not have permission to edit this task. Only the Task Owner/Creator, Assigned Executives, Workspace Leaders, or Super Admins can edit." };
        }
      }
    }
  }

  // Route status_id via changeTaskStatus (Item 2.2 / 2.5)
  if (payload.status_id) {
    const statusRes = await changeTaskStatus(taskId, payload.status_id, undefined, userId);
    if (statusRes && statusRes.error) {
      return statusRes;
    }
  }

  // Whitelist editable fields strictly (Item 2.5):
  // Whitelist: subject, description, priority_id, department_id, start_date, end_date, estimated_hours, custom_fields, sprint_id
  // Ignore: created_by, owner_id, workspace_id, is_deleted, status_id, ids from payload
  const allowedFields = ['subject', 'description', 'priority_id', 'department_id', 'start_date', 'end_date', 'estimated_hours', 'custom_fields', 'sprint_id'];
  const updatePayload: Record<string, any> = {};
  const cleanField = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      if (field === 'start_date' || field === 'end_date' || field === 'department_id') {
        updatePayload[field] = cleanField(payload[field]);
      } else if (field === 'priority_id') {
        const cleanedPrio = cleanField(payload[field]);
        if (!cleanedPrio) {
          return { error: "Task Priority cannot be cleared. Priority selection is mandatory." };
        }
        updatePayload[field] = cleanedPrio;
      } else {
        updatePayload[field] = payload[field];
      }
    }
  }

  const finalStartDate = updatePayload.start_date !== undefined ? updatePayload.start_date : task.start_date;
  const finalEndDate = updatePayload.end_date !== undefined ? updatePayload.end_date : task.end_date;
  if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
    return { error: "Start date cannot be later than target due date" };
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

  const newDesc = payload.description;
  const oldDesc = task.description;
  if (newDesc !== undefined && oldDesc !== newDesc) {
    await supabaseAdmin.from('activity_events').insert({
      module_type: 'TASK',
      record_id: taskId,
      event_type: 'DESCRIPTION',
      old_value: { description: oldDesc || '' },
      new_value: { description: newDesc || '' },
      performed_by: userId
    });
    await supabaseAdmin.from('task_activity_logs').insert({
      task_id: taskId,
      actor_id: userId,
      action: 'DESCRIPTION_UPDATE',
      old_state: { description: oldDesc || '' },
      new_state: { description: newDesc || '' }
    });
  }

  if (payload.status_id) {
    await propagateTaskDependencies(taskId);
  }

  return { success: true };
}

export async function deleteTask(taskId: string) {
  try {
    const { data: task } = await supabaseAdmin.from('tasks').select('assigned_to, created_by, owner_id, workspace_id, workspace:workspaces(workspace_owner_id)').eq('id', taskId).single();
    if (!task) return { error: "Task not found" };

    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    const userId = user?.id;

    if (!userId) return { error: "Unauthenticated" };

    const { hasPermission } = await import('@/lib/permissions');
    const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
    const wsOwnerId = Array.isArray(task.workspace) ? (task.workspace[0] as any)?.workspace_owner_id : (task.workspace as any)?.workspace_owner_id;
    const isWorkspaceOwner = wsOwnerId === userId;
    const isTaskOwner = task.assigned_to === userId || task.created_by === userId || (task as any).owner_id === userId;
    const canDeletePerm = await hasPermission(userId, "TASKS_DELETE");

    const canDelete = isSuperAdmin || isWorkspaceOwner || (isTaskOwner && canDeletePerm);

    if (!canDelete) {
      await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, {
        action_attempted: 'DELETE_TASK'
      }, userId);
      return { error: "You do not have permission to delete this task. Only Super Admins, Workspace Owners, or Task Owners with delete permissions can delete." };
    }

    // Check for dependencies before deleting
    const { count: depCount, error: depError } = await supabaseAdmin
      .from('task_dependencies')
      .select('*', { count: 'exact', head: true })
      .or(`predecessor_task_id.eq.${taskId},successor_task_id.eq.${taskId}`);

    if (depError) return { error: depError.message };
    if (depCount && depCount > 0) {
      return { error: "Cannot delete task because it has existing dependencies. Please remove dependencies first." };
    }

    // Check cross-logic: Are there active sub-tasks?
    const { data: activeSubtasks, error: subtasksError } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('parent_task_id', taskId)
      .eq('is_deleted', false);
    if (subtasksError) return { error: subtasksError.message };
    if (activeSubtasks && activeSubtasks.length > 0) {
      return { error: "Cannot delete this task because it contains active sub-tasks." };
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
  // If active Resolved status exists, keep using it; otherwise use Need to Check (Decision D1)
  const { data: statuses } = await supabaseAdmin
    .from('status_master')
    .select('id, status_code, status_name')
    .eq('scope_type', 'TASK')
    .eq('is_active', true)
    .eq('is_deleted', false);

  if (!statuses || statuses.length === 0) {
    return { error: "No active task statuses configured." };
  }

  const reviewStatus = statuses.find(s => s.status_code.toUpperCase() === 'RESOLVED')
    || statuses.find(s => s.status_code.toUpperCase() === 'NEED TO CHECK')
    || statuses.find(s => s.status_name.toUpperCase() === 'NEED TO CHECK')
    || statuses.find(s => s.status_name.toUpperCase() === 'RESOLVED');

  if (!reviewStatus) {
    return { error: "No active review/resolved status configured for TASK scope." };
  }

  return changeTaskStatus(taskId, reviewStatus.id);
}

export async function approveTask(taskId: string) {
  const { data: statuses } = await supabaseAdmin
    .from('status_master')
    .select('id, is_closed, is_terminal, status_code')
    .eq('scope_type', 'TASK')
    .eq('is_active', true)
    .eq('is_deleted', false);

  if (!statuses || statuses.length === 0) {
    return { error: "No active task statuses found to approve task." };
  }

  const closedStatus = statuses.find(s => s.is_closed || s.is_terminal);
  if (!closedStatus) {
    return { error: "No active closed status configured for TASK scope." };
  }

  return changeTaskStatus(taskId, closedStatus.id);
}

export async function reopenTask(taskId: string) {
  const { data: statuses } = await supabaseAdmin
    .from('status_master')
    .select('id, is_reopen, is_default, status_code')
    .eq('scope_type', 'TASK')
    .eq('is_active', true)
    .eq('is_deleted', false);

  if (!statuses || statuses.length === 0) {
    return { error: "No active task statuses found to reopen task." };
  }

  const reopenStatus = statuses.find(s => s.is_reopen)
    || statuses.find(s => s.is_default)
    || statuses.find(s => ['WORK INPROGRESS', 'TO DO', 'OPEN', 'NEW'].includes(s.status_code.toUpperCase()))
    || statuses[0];

  return changeTaskStatus(taskId, reopenStatus.id);
}

export async function createChecklistItem(taskId: string, label: string) {
  try {
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    const userId = user?.id;
    if (!userId) return { error: "Unauthenticated" };

    const { canAccessTask } = await import("@/lib/permissions");
    if (!(await canAccessTask(userId, taskId))) {
      return { error: "Unauthorized: You do not have permission to modify this task." };
    }

    const { data, error } = await supabaseAdmin
      .from('task_checklists')
      .insert([{ task_id: taskId, label, is_completed: false }])
      .select()
      .single();
    if (error) return { error: error.message };

    if (data) {
      try {
        await supabaseAdmin.from('task_activity_logs').insert([{
          task_id: taskId,
          actor_id: userId,
          action: 'CHECKLIST_UPDATE',
          new_state: { label: data.label, is_completed: false, action: 'added' }
        }]);
      } catch (logErr) {
        console.warn("[createChecklistItem] Log error:", logErr);
      }
    }

    return data;
  } catch (err: any) {
    console.error("[createChecklistItem] Error:", err);
    return { error: err.message || "Failed to create checklist item" };
  }
}

export async function createTaskAttachment(taskId: string, fileName: string, base64Url: string, size: number) {
  try {
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    const userId = user?.id;
    if (!userId) return { error: "Unauthenticated" };

    const { canAccessTask } = await import("@/lib/permissions");
    if (!(await canAccessTask(userId, taskId))) {
      return { error: "Unauthorized: You do not have permission to attach files to this task." };
    }

    let finalFileUrl = base64Url;
    if (finalFileUrl && finalFileUrl.startsWith("data:")) {
      try {
        const commaIdx = finalFileUrl.indexOf(",");
        if (commaIdx !== -1) {
          const meta = finalFileUrl.slice(0, commaIdx);
          const b64 = finalFileUrl.slice(commaIdx + 1);
          const mimeMatch = meta.match(/data:([^;]+)/);
          const detectedMime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
          const buffer = Buffer.from(b64, "base64");
          const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storagePath = `tasks/${taskId}/${Date.now()}_${cleanFileName}`;

          const { error: upErr } = await supabaseAdmin.storage
            .from("ticket-attachments")
            .upload(storagePath, buffer, { contentType: detectedMime, upsert: true });

          if (!upErr) {
            finalFileUrl = `storage:ticket-attachments:${storagePath}`;
          }
        }
      } catch (uploadErr) {
        console.warn("[createTaskAttachment] storage upload fallback:", uploadErr);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('task_attachments')
      .insert([{ task_id: taskId, file_name: fileName, file_url: finalFileUrl, size, uploaded_by: userId, file_type: 'file' }])
      .select()
      .single();
    if (error) return { error: error.message };
    return data;
  } catch (err: any) {
    console.error("[createTaskAttachment] Error:", err);
    return { error: err.message || "Failed to attach file" };
  }
}

export async function deleteTaskAttachment(taskId: string, attachmentId: string) {
  try {
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    if (!user) return { error: "Unauthenticated" };

    // Verify role is SUPER_ADMIN
    const { data: profile } = await supabaseAdmin.from('user_master').select('role:roles(code)').eq('id', user.id).single();
    const roleCode = (profile?.role as any)?.[0]?.code || (profile?.role as any)?.code;
    if (roleCode !== 'SUPER_ADMIN') {
      return { error: "Unauthorized: Only super admins can delete attachments." };
    }

    // Get attachment to record its name
    const { data: att } = await supabaseAdmin.from('task_attachments').select('file_name').eq('id', attachmentId).single();
    if (!att) return { error: "Attachment not found" };

    // Delete attachment
    const { error: delError } = await supabaseAdmin.from('task_attachments').delete().eq('id', attachmentId);
    if (delError) throw delError;

    // Create Audit Log
    const log = {
      task_id: taskId,
      activity_type: 'ATTACHMENT_DELETED',
      activity_details: `Deleted attachment: ${att.file_name}`,
      performed_by: user.id
    };
    await supabaseAdmin.from('task_activity_logs').insert([log]);

    return { success: true };
  } catch (err: any) {
    console.error("[deleteTaskAttachment] Error:", err);
    return { error: err.message || "Failed to delete attachment" };
  }
}

export async function fetchTeams() { return []; }
export async function assignTeamToTask(taskId: string, teamId: string) { return {}; }

export async function getTaskComments(taskId: string, limit = 20, offset = 0) {
  try {
    if (!taskId || taskId === "new") return [];

    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    if (!user) return [];

    const { canAccessTask } = await import("@/lib/permissions");
    if (!(await canAccessTask(user.id, taskId))) {
      return [];
    }

    const { data: comments, error } = await supabaseAdmin
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[getTaskComments] Supabase error:", error);
      return [];
    }
    if (!comments || comments.length === 0) return [];

    const userIds = Array.from(new Set(comments.map((c: any) => c.author_id).filter(Boolean)));
    let users: any[] = [];
    if (userIds.length > 0) {
      try {
        const { data: userData } = await supabaseAdmin
          .from('user_master')
          .select('id, full_name, profile_photo')
          .in('id', userIds);
        if (userData) users = userData;
      } catch (uErr) {
        console.error("[getTaskComments] Error fetching user master:", uErr);
      }
    }

    return comments.map((c: any) => ({
      ...c,
      user: users.find(u => u.id === c.author_id) || null
    }));
  } catch (err: any) {
    console.error("[getTaskComments] Unexpected error:", err);
    return [];
  }
}

// Helper: Notify task stakeholders when a remark is added or updated
async function notifyTaskRemark(taskId: string, remarkContent: string, authorId: string) {
  try {
    if (!remarkContent || !remarkContent.trim()) return;
    const { stripHtmlToText } = await import('@/lib/email/email-renderer');
    const cleanRemark = stripHtmlToText(remarkContent);
    if (!cleanRemark.trim()) return;
    const snippet = cleanRemark.length > 80 ? cleanRemark.slice(0, 77) + "..." : cleanRemark;

    // 1. Fetch task details
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('id, subject, task_code, assigned_to, created_by, workspace_id, status:status_master(status_name)')
      .eq('id', taskId)
      .maybeSingle();

    if (!task) return;

    // 2. Fetch author profile
    const { data: authorUser } = await supabaseAdmin
      .from('user_master')
      .select('full_name, email')
      .eq('id', authorId)
      .maybeSingle();

    const authorName = authorUser?.full_name || 'A team member';

    // 3. Collect recipients (excluding the author)
    const recipientIds = new Set<string>();
    if (task.assigned_to) recipientIds.add(task.assigned_to);
    if (task.created_by) recipientIds.add(task.created_by);

    // Fetch task participants (executors and watchers)
    const { data: participants } = await supabaseAdmin
      .from('task_participants')
      .select('user_id')
      .eq('task_id', taskId);

    if (participants) {
      participants.forEach(p => {
        if (p.user_id) recipientIds.add(p.user_id);
      });
    }

    // Fetch task watchers
    const { data: watchers } = await supabaseAdmin
      .from('task_watchers')
      .select('user_id')
      .eq('task_id', taskId)
      .eq('is_deleted', false);

    if (watchers) {
      watchers.forEach(w => {
        if (w.user_id) recipientIds.add(w.user_id);
      });
    }

    // Exclude author from self-notification
    recipientIds.delete(authorId);

    const statusName = (task.status as any)?.status_name || '';
    const taskLink = `/tasks/${taskId}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech';

    // 4. Dispatch in-app notifications (email disabled here to prevent duplicate delivery; email routing is handled by queueBusinessEvent below)
    for (const recipientId of recipientIds) {
      try {
        await dispatchNotification(
          recipientId,
          "New Task Remark",
          `${authorName} added a remark on "${task.subject}": "${snippet}"`,
          taskLink,
          'TASK',
          'COMMENT_ADDED',
          {
            task_name: task.subject,
            task_code: task.task_code || '',
            remarks: cleanRemark,
            creator_name: authorName,
            status: statusName,
            link: `${siteUrl}${taskLink}`,
            _disableEmail: true
          }
        );
      } catch (err) {
        console.warn(`[notifyTaskRemark] Failed to dispatch notification to ${recipientId}:`, err);
      }
    }

    // 5. Queue business event for notification rules & templates
    const eventPayload = {
      entity_id: taskId,
      triggering_user_id: authorId,
      task_name: task.subject,
      task_code: task.task_code || '',
      remarks: cleanRemark,
      status: statusName || "UPDATED",
      assigned_to: task.assigned_to,
      created_by: task.created_by,
      workspace_id: task.workspace_id,
      creator_name: authorName,
      link: `${siteUrl}${taskLink}`
    };

    queueBusinessEvent("Task", "Comment Added", eventPayload).catch(e =>
      console.warn("[notifyTaskRemark] Comment Added queueBusinessEvent error:", e)
    );
  } catch (error) {
    console.error("[notifyTaskRemark] Unhandled error:", error);
  }
}

export async function addTaskRemark(taskId: string, content: string) {
  try {
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    const userId = user?.id;
    if (!userId) return { error: "Unauthenticated" };

    const { canAccessTask } = await import("@/lib/permissions");
    if (!(await canAccessTask(userId, taskId))) {
      return { error: "Unauthorized: You do not have permission to comment on this task." };
    }

    const { data, error } = await supabaseAdmin
      .from('task_comments')
      .insert([{ task_id: taskId, author_id: userId, content }])
      .select('*')
      .single();

    if (error) return { error: error.message || JSON.stringify(error) };

    if (data) {
      try {
        await supabaseAdmin.from('task_activity_logs').insert([{
          task_id: taskId,
          actor_id: userId,
          action: 'COMMENT',
          new_state: { message: content }
        }]);
      } catch (logErr) {
        console.warn("[addTaskRemark] Log error:", logErr);
      }

      // Trigger notification for task remark
      notifyTaskRemark(taskId, content, userId).catch(e =>
        console.error("[addTaskRemark] Notification error:", e)
      );

      try {
        const { data: user } = await supabaseAdmin.from('user_master').select('full_name, profile_photo').eq('id', userId).single();
        data.user = user || null;
      } catch (uErr) {
        console.warn("[addTaskRemark] User fetch error:", uErr);
      }
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[addTaskRemark] Error:", err);
    return { error: err.message || "Failed to add remark" };
  }
}

export async function getTaskStatuses() {
  try {
    const { data, error } = await supabaseAdmin
      .from('status_master')
      .select('id, name:status_name, code:status_code, color:status_color, is_closed, is_terminal, is_reopen, is_default, status_order')
      .eq('scope_type', 'TASK')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('status_order', { ascending: true });
    if (error) {
      console.warn("[getTaskStatuses] Query error:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("[getTaskStatuses] Error:", err);
    return [];
  }
}

export async function updateTaskStatusInline(taskId: string, newStatusId: string, remark: string) {
  return changeTaskStatus(taskId, newStatusId, remark);
}

// -----------------------------------------------------------------------------
// ENHANCEMENTS: TIME TRACKING VIA JSONB
// -----------------------------------------------------------------------------

export async function logTaskTime(taskId: string, hours: number, description: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { canAccessTask } = await import("@/lib/permissions");
  if (!(await canAccessTask(user.id, taskId))) {
    throw new Error("Unauthorized: You do not have permission to log time on this task.");
  }

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

export async function propagateTaskDependencies(taskId: string) {
  try {
    // 1. Handle requirement updates
    const { data: reqTasks } = await supabaseAdmin
      .from('requirement_tasks')
      .select('requirement_id')
      .eq('task_id', taskId);

    if (reqTasks && reqTasks.length > 0) {
      const { recalculateRequirementCompletion, changeRequirementStatus } = await import('@/lib/actions/requirements');

      for (const reqTask of reqTasks) {
        await recalculateRequirementCompletion(reqTask.requirement_id);

        const { data: req } = await supabaseAdmin
          .from('requirements')
          .select('id, custom_fields, status_id, status:status_master(status_code, is_closed, is_terminal)')
          .eq('id', reqTask.requirement_id)
          .single();

        if (!req) continue;

        const completion_percentage = (req.custom_fields as any)?.completion_percentage || 0;
        const currentStatusCode = (req.status as any)?.status_code || '';
        const isClosedOrTerminal = (req.status as any)?.is_closed || (req.status as any)?.is_terminal;

        // D6 Rule: Auto-move requirement to UAT only from development-type statuses, never from approved/released/closed
        const isDevelopmentStatus = ['REQ_DEVELOPMENT', 'REQ_PLANNING', 'REQ_ANALYSIS', 'REQ_REGISTRATION', 'REQ_PENDING'].includes(currentStatusCode);
        const isApprovedOrReleasedOrClosed = isClosedOrTerminal || ['REQ_APPROVED', 'REQ_DEPLOYED', 'REQ_CLOSED'].includes(currentStatusCode);

        if (completion_percentage === 100) {
          if (isDevelopmentStatus && !isApprovedOrReleasedOrClosed && currentStatusCode !== 'REQ_UAT') {
            await changeRequirementStatus(reqTask.requirement_id, 'REQ_UAT', 'Auto-moved to UAT on 100% completion of linked tasks', 'system');
          }
        } else if (completion_percentage < 100) {
          // D6 Rule: When a task is reopened with completion < 100%, requirement moves back to development status
          if (currentStatusCode === 'REQ_UAT') {
            await changeRequirementStatus(reqTask.requirement_id, 'REQ_DEVELOPMENT', 'Moved back to Development: linked task was reopened and completion dropped below 100%', 'system');
          }
        }
      }
    }

    // 2. Handle parent task progress
    const { data: task } = await supabaseAdmin.from('tasks').select('parent_task_id').eq('id', taskId).single();
    if (task && task.parent_task_id) {
      recalculateParentProgress(task.parent_task_id).catch(e => console.error('[recalculateParentProgress]', e));
    }
  } catch (error) {
    console.error("[propagateTaskDependencies] Error:", error);
  }
}

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
  checklistCreates?: { label: string; assignee_id?: string }[];
  checklistUpdates?: Record<string, { is_completed?: boolean; assignee_id?: string }>;
  remarks?: string;
  attachmentIds?: string[];
}) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  const { taskId, updates, statusChanges, departmentChange, checklistCreates, checklistUpdates, remarks, attachmentIds } = payload;

  const { data: currentTask } = await supabaseAdmin
    .from('tasks')
    .select('assigned_to, owner_id, created_by, workspace_id, workspace:workspaces(workspace_owner_id)')
    .eq('id', taskId)
    .single();

  if (!currentTask) return { error: "Task not found" };

  const { checkServerPermission } = await import("@/lib/permissions");
  const isSuperAdmin = await checkServerPermission("SUPER_ADMIN");
  const isTaskOwner = currentTask.assigned_to === userId || currentTask.owner_id === userId || currentTask.created_by === userId;

  let canEdit = isSuperAdmin || isTaskOwner;
  if (!canEdit) {
    const wsOwnerId = Array.isArray(currentTask.workspace) ? (currentTask.workspace[0] as any)?.workspace_owner_id : (currentTask.workspace as any)?.workspace_owner_id;
    if (wsOwnerId === userId) {
      canEdit = true;
    } else if (currentTask.workspace_id) {
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', currentTask.workspace_id)
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .maybeSingle();
      if (member && (member.role === 'manager' || member.role === 'owner' || member.role === 'WORKSPACE_MANAGER' || member.role === 'WORKSPACE_OWNER')) {
        canEdit = true;
      }
    }

    if (!canEdit) {
      const { data: participant } = await supabaseAdmin
        .from('task_participants')
        .select('participation_role')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .maybeSingle();
      if (participant && (participant.participation_role === 'EXECUTOR' || participant.participation_role === 'PRIMARY')) {
        canEdit = true;
      }
    }
  }

  if (!canEdit) {
    return { error: "You do not have permission to edit this task. Only the Task Owner/Creator/Assignee, Assigned Executives, Workspace Leaders, or Super Admins can edit." };
  }

  // 1. Route status changes via changeTaskStatus (Item 2.2 / 2.5)
  if (statusChanges) {
    const statusRes = await changeTaskStatus(taskId, statusChanges, remarks, userId);
    if (statusRes && statusRes.error) {
      return { error: statusRes.error };
    }
  }

  const tCore0 = performance.now();
  // Update Task Core - Whitelist editable fields (ignore created_by, owner_id, workspace_id, is_deleted, status_id, ids)
  const allowedFields = ['subject', 'description', 'priority_id', 'department_id', 'start_date', 'end_date', 'estimated_hours', 'custom_fields', 'sprint_id'];
  const updatePayload: Record<string, any> = {};
  if (updates && typeof updates === 'object') {
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        updatePayload[key] = updates[key];
      }
    }
  }
  if (departmentChange && departmentChange.new_id !== undefined) {
    updatePayload.department_id = departmentChange.new_id;
  }

  if (updatePayload.start_date !== undefined || updatePayload.end_date !== undefined) {
    const { data: taskData } = await supabaseAdmin.from('tasks').select('start_date, end_date').eq('id', taskId).single();
    if (taskData) {
      const finalStartDate = updatePayload.start_date !== undefined ? (updatePayload.start_date && typeof updatePayload.start_date === 'string' ? updatePayload.start_date.trim() : null) : taskData.start_date;
      const finalEndDate = updatePayload.end_date !== undefined ? (updatePayload.end_date && typeof updatePayload.end_date === 'string' ? updatePayload.end_date.trim() : null) : taskData.end_date;
      if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
        return { error: "Start date cannot be later than target due date" };
      }
    }
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabaseAdmin.from('tasks').update(updatePayload).eq('id', taskId);
    if (updateError) return { error: updateError.message };
  }
  const tCore1 = performance.now(); console.log(`[TaskBatch] Core Updates took ${(tCore1 - tCore0).toFixed(2)}ms`);

  const tChild0 = performance.now();
  // Handle Checklists (parallel)
  const checklistInsertPromise = (checklistCreates && checklistCreates.length > 0)
    ? supabaseAdmin.from('task_checklists').insert(checklistCreates.map(c => ({ task_id: taskId, label: c.label, assignee_id: c.assignee_id || null, is_completed: false }))).select()
    : Promise.resolve({ data: [] });

  const checklistUpdatePromises = (checklistUpdates && Object.keys(checklistUpdates).length > 0)
    ? Object.entries(checklistUpdates).map(([id, updates]) => supabaseAdmin.from('task_checklists').update(updates).eq('id', id).select())
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

  const tChild1 = performance.now(); console.log(`[TaskBatch] Children Updates took ${(tChild1 - tChild0).toFixed(2)}ms`);

  // Background Side Effects (non-blocking - Phase T4)
  const sideEffects = [];

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
    // Remarks are bundled into the "Task Updated" business event below;
    // do not trigger a separate "Comment Added" event to prevent duplicate email blasts.
  }

  if (Object.keys(updatePayload).length > 0) {
    sideEffects.push(
      supabaseAdmin.from('task_activity_logs').update({ actor_id: userId }).eq('task_id', taskId).is('actor_id', null)
    );
  }

  // FIRE AND FORGET - DO NOT AWAIT SIDE EFFECTS
  Promise.allSettled(sideEffects).catch(e => console.error("[SideEffects Error]", e));

  // Purge the cache for this task to ensure Next.js auto-refresh works on production
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/workspaces/tasks`);

  // Fire-and-forget: Push to async background queue
  supabaseAdmin.from('tasks').select('subject, status_id, assigned_to, created_by, workspace_id, department_id, description, priority_id, start_date, end_date').eq('id', taskId).single().then(async ({ data: taskData }) => {
    const { stripHtmlToText } = await import('@/lib/email/email-renderer');
    const cleanRemarks = remarks ? stripHtmlToText(remarks) : "";
    const cleanDesc = taskData?.description ? stripHtmlToText(taskData.description) : "";
    queueBusinessEvent("Task", "Updated", {
      entity_id: taskId,
      triggering_user_id: userId,
      status: statusChanges || taskData?.status_id || "UPDATED",
      task_name: taskData?.subject || "Task Updated",
      description: cleanDesc !== cleanRemarks ? cleanDesc : "",
      remarks: cleanRemarks,
      assigned_to: taskData?.assigned_to,
      created_by: taskData?.created_by,
      workspace_id: taskData?.workspace_id,
      department_id: taskData?.department_id,
      creator_name: user?.user_metadata?.full_name || "System",
      link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tasks/${taskId}`
    }).catch(e => console.error("[NotificationEngine] Background push failed", e));
  }).then(undefined, () => { });

  return {
    success: true,
    data: {
      checklistsCreates,
      checklistsUpdates,
      comments
    }
  };
}

export async function updateTaskAssignees(taskId: string, workspaceId: string, assignees: string[], primaryAssigneeId?: string) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  // Fetch the task
  const { data: task } = await supabaseAdmin.from('tasks').select('assigned_to, created_by, owner_id, workspace_id').eq('id', taskId).single();
  if (!task) return { error: "Task not found" };

  // Check if current user is Super Admin or has TASKS_ASSIGN
  const effectiveWsId = workspaceId || task.workspace_id;
  const { hasPermission } = await import("@/lib/permissions");
  const { can } = await import("@/lib/permissions/module-access");
  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN") || await hasPermission(userId, "TASKS_MANAGE");
  const canAssignPerm = isSuperAdmin || (await can(userId, "TASK_WORKFLOW", "TASKS_ASSIGN", { workspace_id: effectiveWsId || undefined }));

  let isWorkspaceLeader = false;
  if (effectiveWsId) {
    const { data: ws } = await supabaseAdmin.from('workspaces').select('workspace_owner_id').eq('id', effectiveWsId).maybeSingle();
    if (ws?.workspace_owner_id === userId) {
      isWorkspaceLeader = true;
    } else {
      const { data: member } = await supabaseAdmin.from('workspace_members').select('role').eq('workspace_id', effectiveWsId).eq('user_id', userId).eq('is_deleted', false).maybeSingle();
      if (member && (member.role === 'manager' || member.role === 'owner' || member.role === 'WORKSPACE_MANAGER' || member.role === 'WORKSPACE_OWNER')) {
        isWorkspaceLeader = true;
      }
    }
  }

  const isTaskOwnerOrCreator = task.assigned_to === userId || task.created_by === userId || task.owner_id === userId;

  if (!isSuperAdmin && !canAssignPerm && !isWorkspaceLeader && !isTaskOwnerOrCreator) {
    await logActivityEvent('TASK', taskId, 'UNAUTHORIZED_TASK_ACTION', null, {
      action_attempted: 'UPDATE_ASSIGNMENT'
    }, userId);
    return { error: "You do not have permission to edit assignees. Only the Primary Assignee, Creator, Workspace Leader, or Super Admin can do this." };
  }

  // Handle explicit removal of primary assignee (if passed as empty string)
  let finalPrimaryId: string | null = task.assigned_to;
  if (primaryAssigneeId !== undefined) {
    finalPrimaryId = primaryAssigneeId === "" ? null : primaryAssigneeId;
  }
  // Fallback to first executor if primary is null but executors exist
  if (!finalPrimaryId && assignees.length > 0) {
    finalPrimaryId = assignees[0];
  }

  if (!finalPrimaryId && assignees.length === 0) {
    return { error: "At least one assignee or primary assignee must be selected." };
  }

  // Fetch all workspace members
  const { fetchWorkspaceStakeholders } = await import("@/lib/actions/workspaces");
  const stakeholders = await fetchWorkspaceStakeholders(workspaceId);

  // Prepare participants array
  const uniqueAssigneeIds = Array.from(new Set(assignees));
  const participants: any[] = [];
  uniqueAssigneeIds.forEach(id => participants.push({ task_id: taskId, user_id: id, participation_role: 'EXECUTOR' }));

  // Perform the swap transactionally
  // ONLY delete executors, leave explicit watchers alone!
  const { error: deleteError } = await supabaseAdmin.from('task_participants').delete().eq('task_id', taskId).eq('participation_role', 'EXECUTOR');
  if (deleteError) return { error: deleteError.message };

  if (participants.length > 0) {
    const { error: insertError } = await supabaseAdmin.from('task_participants').upsert(participants, { onConflict: 'task_id, user_id' });
    if (insertError) return { error: insertError.message };
  }

  if (finalPrimaryId !== undefined) {
    const { error: updateError } = await supabaseAdmin.from('tasks').update({ assigned_to: finalPrimaryId }).eq('id', taskId);
    if (updateError) return { error: updateError.message };
  }

  // Ensure all assignees and primary assignee are enrolled as workspace members
  if (effectiveWsId) {
    const allAssignedIds = Array.from(new Set([...uniqueAssigneeIds, ...(finalPrimaryId ? [finalPrimaryId] : [])])).filter(Boolean);
    if (allAssignedIds.length > 0) {
      const memberRows = allAssignedIds.map((uid: string) => ({
        workspace_id: effectiveWsId,
        user_id: uid,
        role: 'member',
        is_deleted: false
      }));
      await supabaseAdmin.from('workspace_members').upsert(memberRows, { onConflict: 'workspace_id,user_id' });
    }
  }

  // Purge the cache for this task to ensure Next.js auto-refresh works on production
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/workspaces/tasks`);

  // Fire-and-forget: Push to async background queue
  supabaseAdmin.from('tasks').select('subject, status_id, assigned_to, created_by, workspace_id, department_id').eq('id', taskId).single().then(({ data: taskData }) => {
    queueBusinessEvent("Task", "Executors Changed", {
      entity_id: taskId,
      triggering_user_id: userId || "",
      status: taskData?.status_id || "UPDATED",
      task_name: taskData?.subject || "Task Assignment Changed",
      assigned_to: finalPrimaryId || taskData?.assigned_to,
      created_by: taskData?.created_by,
      workspace_id: taskData?.workspace_id,
      department_id: taskData?.department_id,
      creator_name: user?.user_metadata?.full_name || "System",
      link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tasks/${taskId}`
    }).catch(e => console.error("[NotificationEngine] Background push failed", e));
  }).then(undefined, () => { });

  // Log the assignment change in audit trail
  const newExecutorNames = uniqueAssigneeIds
    .map(id => stakeholders.find((s: any) => s.id === id)?.full_name)
    .filter(Boolean)
    .join(', ');
  const primaryName = stakeholders.find((s: any) => s.id === finalPrimaryId)?.full_name || 'Unassigned';

  await supabaseAdmin.from('task_activity_logs').insert([{
    task_id: taskId,
    actor_id: userId,
    action: 'ASSIGNMENT_CHANGE',
    new_state: {
      primary_assignee: primaryName,
      executors_text: newExecutorNames || 'None'
    }
  }]);

  // Fetch task subject for notifications
  const { data: taskDetails } = await supabaseAdmin.from('tasks').select('subject').eq('id', taskId).single();
  const taskSubject = taskDetails?.subject || 'Task';

  // Notify newly assigned primary assignee if changed
  if (finalPrimaryId && finalPrimaryId !== userId && finalPrimaryId !== task.assigned_to) {
    dispatchNotification(
      finalPrimaryId,
      'Task Assigned',
      `You have been assigned as primary assignee to task "${taskSubject}".`,
      `/tasks/${taskId}`,
      'TASK',
      'ASSIGNED',
      { _disableEmail: true }
    ).catch(e => console.error("[updateTaskAssignees] dispatchNotification primary failed", e));
  }

  // Notify executors
  uniqueAssigneeIds.forEach(execId => {
    if (execId !== userId && execId !== task.assigned_to) {
      dispatchNotification(
        execId,
        'Task Executor Assignment',
        `You have been assigned as executor on task "${taskSubject}".`,
        `/tasks/${taskId}`,
        'TASK',
        'ASSIGNED',
        { _disableEmail: true }
      ).catch(e => console.error("[updateTaskAssignees] dispatchNotification executor failed", e));
    }
  });

  return { success: true };
}

export async function updateTaskWatchers(taskId: string, workspaceId: string, watchers: string[]) {
  const cookieStore = await cookies();
  const { data: { user } } = await createClient(cookieStore).auth.getUser();
  const userId = user?.id;
  if (!userId) return { error: "Unauthenticated" };

  // Fetch the task
  const { data: task } = await supabaseAdmin.from('tasks').select('assigned_to, created_by, owner_id, workspace_id, subject').eq('id', taskId).single();
  if (!task) return { error: "Task not found" };

  // Check permissions: Super Admin, Primary Assignee, Creator, or Workspace Leader
  const { hasPermission } = await import("@/lib/permissions");
  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN") || await hasPermission(userId, "TASKS_MANAGE");

  let isWorkspaceLeader = false;
  const effectiveWsId = workspaceId || task.workspace_id;
  if (effectiveWsId) {
    const { data: ws } = await supabaseAdmin.from('workspaces').select('workspace_owner_id').eq('id', effectiveWsId).maybeSingle();
    if (ws?.workspace_owner_id === userId) {
      isWorkspaceLeader = true;
    } else {
      const { data: member } = await supabaseAdmin.from('workspace_members').select('role').eq('workspace_id', effectiveWsId).eq('user_id', userId).eq('is_deleted', false).maybeSingle();
      if (member && (member.role === 'manager' || member.role === 'owner' || member.role === 'WORKSPACE_MANAGER' || member.role === 'WORKSPACE_OWNER')) {
        isWorkspaceLeader = true;
      }
    }
  }

  const isTaskOwnerOrCreator = task.assigned_to === userId || task.created_by === userId || task.owner_id === userId;

  if (!isSuperAdmin && !isWorkspaceLeader && !isTaskOwnerOrCreator) {
    return { error: "You do not have permission to edit watchers. Only the Primary Assignee, Creator, Workspace Leader, or Super Admin can do this." };
  }

  // Fetch all workspace members for validation & audit names
  const { fetchWorkspaceStakeholders } = await import("@/lib/actions/workspaces");
  const stakeholders = await fetchWorkspaceStakeholders(workspaceId);

  // Prepare participants array for watchers
  const uniqueWatcherIds = Array.from(new Set(watchers));
  const participants: any[] = [];
  uniqueWatcherIds.forEach(id => participants.push({ task_id: taskId, user_id: id, participation_role: 'WATCHER' }));

  // Delete existing watchers for this task
  const { error: deleteError } = await supabaseAdmin
    .from('task_participants')
    .delete()
    .eq('task_id', taskId)
    .eq('participation_role', 'WATCHER');
  if (deleteError) return { error: deleteError.message };

  if (participants.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('task_participants')
      .upsert(participants, { onConflict: 'task_id, user_id' });
    if (insertError) return { error: insertError.message };

    // Ensure all watchers are also enrolled in workspace members
    if (effectiveWsId && uniqueWatcherIds.length > 0) {
      const memberRows = uniqueWatcherIds.map((uid: string) => ({
        workspace_id: effectiveWsId,
        user_id: uid,
        role: 'member',
        is_deleted: false
      }));
      await supabaseAdmin.from('workspace_members').upsert(memberRows, { onConflict: 'workspace_id,user_id' });
    }
  }

  // Purge the cache for this task to ensure Next.js auto-refresh works on production
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/workspaces/tasks`);

  // Log in activity trail
  const newWatcherNames = uniqueWatcherIds
    .map(id => stakeholders.find((s: any) => s.id === id)?.full_name)
    .filter(Boolean)
    .join(', ');

  await supabaseAdmin.from('task_activity_logs').insert([{
    task_id: taskId,
    actor_id: userId,
    action: 'WATCHERS_CHANGE',
    new_state: {
      watchers_text: newWatcherNames || 'None'
    }
  }]);

  return { success: true };
}

export async function moveTasksInBulk(payload: {
  taskIds: string[];
  targetWorkspaceId: string;
  targetSubWorkspaceId?: string;
  targetParentTaskId?: string | null;
  newOwnerId?: string;
  newParticipantIds?: { user_id: string; participation_role: string }[];
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthenticated" };

    const { taskIds, targetWorkspaceId, targetSubWorkspaceId, targetParentTaskId, newOwnerId, newParticipantIds } = payload;

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

    if (targetParentTaskId !== undefined) {
      const { error: parentUpdateError } = await supabaseAdmin
        .from('tasks')
        .update({ parent_task_id: targetParentTaskId })
        .in('id', taskIds);

      if (parentUpdateError) throw parentUpdateError;
    }

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
    const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");

    // Check if user is an executor
    const { data: participant } = await supabaseAdmin
      .from('task_participants')
      .select('user_id')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .eq('participation_role', 'EXECUTOR')
      .maybeSingle();

    const { data: task } = await supabaseAdmin.from('tasks').select('workspace_id, assigned_to').eq('id', taskId).single();
    if (!task) return { error: "Task not found" };

    if (task.assigned_to !== user.id && !participant && !isSuperAdmin) {
      return { error: "Only the Task Owner, an Executive, or a Super Admin can transfer this task." };
    }

    // Fetch all subtasks to apply the same transfer logic
    const { data: subtasks } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('parent_task_id', taskId)
      .eq('is_deleted', false);

    const allTaskIds = [taskId];
    if (subtasks) {
      subtasks.forEach(st => allTaskIds.push(st.id));
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
      .in('id', allTaskIds);

    if (updateError) throw updateError;

    // Handle dropped users
    if (droppedUsers && droppedUsers.length > 0) {
      await supabaseAdmin.from('task_participants')
        .delete()
        .in('task_id', allTaskIds)
        .in('user_id', droppedUsers);
    }

    // Handle new executors
    if (newExecutors && newExecutors.length > 0) {
      const execsData = allTaskIds.flatMap(tId => newExecutors.map(userId => ({
        task_id: tId,
        user_id: userId,
        participation_role: 'EXECUTOR'
      })));
      // Delete any existing matching roles just in case, then insert
      await supabaseAdmin.from('task_participants')
        .delete()
        .in('task_id', allTaskIds)
        .in('user_id', newExecutors);

      await supabaseAdmin.from('task_participants').insert(execsData);
    }

    // --- AUTO-WATCHER LOGIC ---
    // Fetch stakeholders for the destination workspace
    const { fetchWorkspaceStakeholders } = await import('@/lib/actions/workspaces');
    const targetStakeholders = await fetchWorkspaceStakeholders(finalWorkspaceId);

    // Fetch all current participants (which now includes valid old ones + new executors)
    const { data: currentParticipants } = await supabaseAdmin
      .from('task_participants')
      .select('task_id, user_id')
      .in('task_id', allTaskIds);

    // Get the final assignee (either new or existing)
    const finalAssigneeId = newAssigneeId || task.assigned_to;

    const watcherData: any[] = [];
    for (const tId of allTaskIds) {
      const existingUserIds = new Set(currentParticipants?.filter(p => p.task_id === tId).map(p => p.user_id) || []);
      if (finalAssigneeId) existingUserIds.add(finalAssigneeId);

      const taskWatchers = targetStakeholders
        .filter((s: any) => !existingUserIds.has(s.id))
        .map((s: any) => ({
          task_id: tId,
          user_id: s.id,
          participation_role: 'WATCHER'
        }));
      watcherData.push(...taskWatchers);
    }

    if (watcherData.length > 0) {
      await supabaseAdmin.from('task_participants').insert(watcherData);
    }
    // --------------------------

    // Log activity
    const logData = allTaskIds.map(tId => ({
      task_id: tId,
      actor_id: user.id,
      action: 'WORKSPACE_CHANGE',
      new_state: {
        workspace_id: targetWorkspaceId,
        sub_workspace_id: targetSubworkspaceId || null,
        remarks: remarks,
        dropped_users: droppedUsers,
        new_assignee: newAssigneeId,
        is_subtask_transfer: tId !== taskId
      }
    }));
    await supabaseAdmin.from('task_activity_logs').insert(logData);

    if (remarks && remarks.trim()) {
      let commentMsg = `[TRANSFERRED] ${remarks.trim()}`;
      if (droppedUsers && droppedUsers.length > 0) {
        commentMsg += `\n\n(System Note: ${droppedUsers.length} out-of-scope users were dropped during transfer.)`;
      }
      if (newAssigneeId) {
        commentMsg += `\n(System Note: Primary Assignee was updated due to scope mismatch.)`;
      }

      const commentsData = allTaskIds.map(tId => ({
        task_id: tId,
        author_id: user.id,
        content: commentMsg
      }));
      await supabaseAdmin.from('task_comments').insert(commentsData);
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

export async function acknowledgeTaskAmendment(taskId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthenticated" };

    const { data: task } = await supabaseAdmin.from('tasks').select('id, description, custom_fields').eq('id', taskId).single();
    if (!task) return { error: "Task not found" };

    const pendingAmendment = task.custom_fields?.pending_amendment;
    if (!pendingAmendment) return { error: "No pending amendment found on this task." };

    const newDescription = (task.description || '') + `\n\n**Amendment Version ${pendingAmendment.version}**: ${pendingAmendment.revised_details}`;
    const updatedCustomFields = { ...task.custom_fields };
    delete updatedCustomFields.pending_amendment;

    await supabaseAdmin.from('tasks').update({
      description: newDescription,
      custom_fields: updatedCustomFields
    }).eq('id', taskId);

    if (pendingAmendment.attachment) {
      await supabaseAdmin.from('task_attachments').insert({
        task_id: taskId,
        file_name: pendingAmendment.attachment.file_name,
        file_url: pendingAmendment.attachment.file_url,
        size: pendingAmendment.attachment.size,
        file_type: pendingAmendment.attachment.file_type,
        uploaded_by: user.id
      });
      await logActivityEvent('TASK', taskId, 'AMENDMENT_ATTACHMENT_SYNCED', null, { file_name: pendingAmendment.attachment.file_name }, user.id);
    }

    await logActivityEvent('TASK', taskId, 'REQUIREMENT_AMENDMENT_ACKNOWLEDGED', null, {
      message: `Requirement amendment (Version ${pendingAmendment.version}) was acknowledged and applied.`,
    }, user.id);

    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error acknowledging task amendment:", err);
    return { error: err.message || "Failed to acknowledge amendment." };
  }
}

export async function fetchWorkspaceTasksList(workspaceId: string) {
  try {
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select('id, subject, assigned_to, parent_task_id')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return tasks || [];
  } catch (err) {
    console.error("Error fetching workspace tasks:", err);
    return [];
  }
}

export async function assignUserToTasksBatch(userId: string, assignments: { taskId: string; role: 'primary' | 'executor' }[]) {
  try {
    const cookieStore = await cookies();
    const { data: { user } } = await createClient(cookieStore).auth.getUser();
    if (!user) return { error: "Unauthenticated. Please log in." };

    const { hasPermission } = await import("@/lib/permissions");
    const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");

    for (const assignment of assignments) {
      if (!isSuperAdmin) {
        // Check if user is primary assignee or creator of this task, or manager of its workspace
        const { data: t } = await supabaseAdmin.from('tasks').select('id, assigned_to, created_by, workspace_id').eq('id', assignment.taskId).maybeSingle();
        if (!t) continue;
        const isOwner = t.assigned_to === user.id || t.created_by === user.id;
        if (!isOwner) {
          const { canManageWorkspace } = await import("@/lib/permissions");
          const { can } = await import("@/lib/permissions/module-access");
          const canAssign = await can(user.id, "TASK_WORKFLOW", "TASKS_ASSIGN", { workspace_id: t.workspace_id });
          const canManage = canAssign || (await canManageWorkspace(user.id, t.workspace_id));
          if (!canManage) {
            return { error: `Unauthorized: You do not have permission to assign users on task ${assignment.taskId}` };
          }
        }
      }

      if (assignment.role === 'primary') {
        const { error } = await supabaseAdmin
          .from('tasks')
          .update({ assigned_to: userId, updated_at: new Date().toISOString() })
          .eq('id', assignment.taskId);
        if (error) console.error("Error assigning primary:", error);
      } else if (assignment.role === 'executor') {
        const { error } = await supabaseAdmin
          .from('task_participants')
          .upsert({
            task_id: assignment.taskId,
            user_id: userId,
            participation_role: 'EXECUTOR'
          }, { onConflict: 'task_id, user_id' });
        if (error) console.error("Error assigning executor:", error);
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error in assignUserToTasksBatch:", err);
    return { error: err.message || "Failed to batch assign user to tasks." };
  }
}
