"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { revalidatePath } from "next/cache";

export type DependencyType = 'executive' | 'watcher';

export interface DependencyCheckResult {
  userId: string;
  isSafe: boolean;
  type: DependencyType | null;
  message: string;
  blockingItems: string[];
}

/**
 * Checks if the given users have any dependencies in the given workspace and its child workspaces.
 */
export async function checkWorkspaceUserDependencies(workspaceId: string, userIds: string[]): Promise<Record<string, DependencyCheckResult>> {
  const results: Record<string, DependencyCheckResult> = {};
  
  if (!workspaceId || userIds.length === 0) return results;

  // 1. Fetch this workspace and all its descendant sub-workspaces
  const { data: allWs } = await supabaseAdmin
    .from("workspaces")
    .select("id, workspace_name, workspace_owner_id, parent_workspace_id")
    .eq("is_deleted", false);

  const targetWorkspaceIds = new Set<string>([workspaceId]);
  let added = true;
  while (added) {
    added = false;
    (allWs || []).forEach(w => {
      if (w.parent_workspace_id && targetWorkspaceIds.has(w.parent_workspace_id) && !targetWorkspaceIds.has(w.id)) {
        targetWorkspaceIds.add(w.id);
        added = true;
      }
    });
  }

  const wsIdList = Array.from(targetWorkspaceIds);

  // 2. Check Tasks in this workspace and child workspaces
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, subject, assigned_to, workspace_id, task_participants(user_id, participation_role)")
    .in("workspace_id", wsIdList)
    .eq("is_deleted", false);

  // 3. Check Tickets
  const { data: tickets } = await supabaseAdmin
    .from("tickets")
    .select("id, ticket_number, assignee_id, custom_fields")
    .eq("is_deleted", false);
    
  const workspaceTickets = (tickets || []).filter(t => wsIdList.includes(t.custom_fields?.workspace_id));

  // 4. Check Sub-Workspaces
  const { data: subWorkspaces } = await supabaseAdmin
    .from("workspaces")
    .select("id, workspace_name, workspace_owner_id, workspace_members(user_id, role)")
    .in("parent_workspace_id", wsIdList)
    .eq("is_deleted", false);

  for (const userId of userIds) {
    const blockingItems: string[] = [];
    const watcherItems: string[] = [];
    
    // Evaluate Tasks
    tasks?.forEach(task => {
      const taskName = task.subject || "Untitled Task";
      if (task.assigned_to === userId) {
        blockingItems.push(`Task: "${taskName}" (Primary Assignee)`);
      } else {
        const participant = task.task_participants?.find((p: any) => p.user_id === userId);
        if (participant) {
          if (participant.participation_role === 'EXECUTOR') {
            blockingItems.push(`Task: "${taskName}" (Executor)`);
          } else {
            watcherItems.push(`Task: "${taskName}" (Watcher)`);
          }
        }
      }
    });

    // Evaluate Tickets
    workspaceTickets.forEach(ticket => {
      if (ticket.assignee_id === userId) {
        blockingItems.push(`Ticket: #${ticket.ticket_number}`);
      }
    });

    // Evaluate Sub-Workspaces
    subWorkspaces?.forEach(sws => {
      if (sws.workspace_owner_id === userId) {
        blockingItems.push(`Sub-Workspace: "${sws.workspace_name}" (Owner)`);
      } else {
        const member = sws.workspace_members?.find((m: any) => m.user_id === userId);
        if (member) {
          if (member.role === 'manager' || member.role === 'WORKSPACE_MANAGER' || member.role === 'owner' || member.role === 'WORKSPACE_OWNER') {
            blockingItems.push(`Sub-Workspace: "${sws.workspace_name}" (Manager)`);
          } else {
            watcherItems.push(`Sub-Workspace: "${sws.workspace_name}" (Member)`);
          }
        }
      }
    });

    if (blockingItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'executive',
        message: `This user is assigned as an owner/executor on ${blockingItems.length} active item(s). Please select a replacement user to reassign their tasks to before removing them.`,
        blockingItems
      };
    } else if (watcherItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'watcher',
        message: `This user is only a watcher on ${watcherItems.length} item(s). Removing them will cleanly remove their watcher access.`,
        blockingItems: watcherItems
      };
    } else {
      results[userId] = {
        userId,
        isSafe: true,
        type: null,
        message: "",
        blockingItems: []
      };
    }
  }

  return results;
}

/**
 * Reassigns all tasks, subtasks, checklists, tickets, and ownerships from oldUserId to newUserId
 * across the workspace and all its sub-workspaces, and removes oldUserId from workspace_members.
 */
export async function reassignAndRemoveWorkspaceUser(
  workspaceId: string,
  oldUserId: string,
  newUserId: string
): Promise<{ success: boolean; error?: string; reassignedCount?: number }> {
  try {
    if (!workspaceId || !oldUserId || !newUserId) {
      return { success: false, error: "Missing required parameters for reassignment." };
    }

    if (oldUserId === newUserId) {
      return { success: false, error: "Replacement user must be different from the user being removed." };
    }

    // 1. Resolve workspace and descendant sub-workspaces
    const { data: allWs } = await supabaseAdmin
      .from("workspaces")
      .select("id, parent_workspace_id")
      .eq("is_deleted", false);

    const targetWorkspaceIds = new Set<string>([workspaceId]);
    let added = true;
    while (added) {
      added = false;
      (allWs || []).forEach(w => {
        if (w.parent_workspace_id && targetWorkspaceIds.has(w.parent_workspace_id) && !targetWorkspaceIds.has(w.id)) {
          targetWorkspaceIds.add(w.id);
          added = true;
        }
      });
    }

    const wsIdList = Array.from(targetWorkspaceIds);

    // 2. Reassign Primary Assignee on all tasks in this workspace tree
    const { data: assignedTasks } = await supabaseAdmin
      .from("tasks")
      .select("id")
      .in("workspace_id", wsIdList)
      .eq("assigned_to", oldUserId)
      .eq("is_deleted", false);

    let reassignedCount = 0;

    if (assignedTasks && assignedTasks.length > 0) {
      const taskIds = assignedTasks.map(t => t.id);
      await supabaseAdmin
        .from("tasks")
        .update({ assigned_to: newUserId, updated_at: new Date().toISOString() })
        .in("id", taskIds);
      reassignedCount += taskIds.length;
    }

    // 3. Reassign / Replace in task_participants for all tasks in these workspaces
    const { data: allWsTasks } = await supabaseAdmin
      .from("tasks")
      .select("id")
      .in("workspace_id", wsIdList)
      .eq("is_deleted", false);

    const allWsTaskIds = allWsTasks?.map(t => t.id) || [];

    if (allWsTaskIds.length > 0) {
      // Find where oldUser was EXECUTOR
      const { data: oldExecutors } = await supabaseAdmin
        .from("task_participants")
        .select("task_id")
        .in("task_id", allWsTaskIds)
        .eq("user_id", oldUserId)
        .eq("participation_role", "EXECUTOR");

      if (oldExecutors && oldExecutors.length > 0) {
        for (const ex of oldExecutors) {
          // Delete old user
          await supabaseAdmin
            .from("task_participants")
            .delete()
            .eq("task_id", ex.task_id)
            .eq("user_id", oldUserId);

          // Add new user as EXECUTOR if not already present
          const { data: exists } = await supabaseAdmin
            .from("task_participants")
            .select("task_id")
            .eq("task_id", ex.task_id)
            .eq("user_id", newUserId)
            .maybeSingle();

          if (!exists) {
            await supabaseAdmin
              .from("task_participants")
              .insert({
                task_id: ex.task_id,
                user_id: newUserId,
                participation_role: "EXECUTOR"
              });
          }
          reassignedCount++;
        }
      }

      // Delete any WATCHER entries for oldUser
      await supabaseAdmin
        .from("task_participants")
        .delete()
        .in("task_id", allWsTaskIds)
        .eq("user_id", oldUserId);

      await supabaseAdmin
        .from("task_watchers")
        .delete()
        .in("task_id", allWsTaskIds)
        .eq("user_id", oldUserId);

      // Reassign Checklist items
      await supabaseAdmin
        .from("task_checklists")
        .update({ assignee_id: newUserId })
        .in("task_id", allWsTaskIds)
        .eq("assignee_id", oldUserId);
    }

    // 4. Reassign Sub-workspace ownership
    await supabaseAdmin
      .from("workspaces")
      .update({ workspace_owner_id: newUserId })
      .in("parent_workspace_id", wsIdList)
      .eq("workspace_owner_id", oldUserId);

    // 5. Remove oldUser from workspace_members
    await supabaseAdmin
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", oldUserId);

    // 6. Ensure newUser is in workspace_members
    const { data: memberExists } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", newUserId)
      .maybeSingle();

    if (!memberExists) {
      await supabaseAdmin
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: newUserId,
          role: "member",
          is_deleted: false
        });
    }

    revalidatePath("/workspaces");
    revalidatePath("/workspaces/tasks");

    return { success: true, reassignedCount };
  } catch (err: any) {
    console.error("[reassignAndRemoveWorkspaceUser] Error:", err);
    return { success: false, error: err.message || "Failed to reassign user tasks." };
  }
}

/**
 * Checks if the given users have any dependencies in the given task.
 */
export async function checkTaskUserDependencies(taskId: string, userIds: string[]): Promise<Record<string, DependencyCheckResult>> {
  const results: Record<string, DependencyCheckResult> = {};
  
  if (!taskId || userIds.length === 0) return results;

  // 1. Check Sub-Tasks
  const { data: subTasks } = await supabaseAdmin
    .from("tasks")
    .select("id, subject, assigned_to, task_participants(user_id, participation_role)")
    .eq("parent_task_id", taskId)
    .eq("is_deleted", false);

  // 2. Check Checklists
  const { data: checklists } = await supabaseAdmin
    .from("task_checklists")
    .select("id, label, assignee_id")
    .eq("task_id", taskId);

  for (const userId of userIds) {
    const blockingItems: string[] = [];
    const watcherItems: string[] = [];
    
    // Evaluate Sub-Tasks
    subTasks?.forEach(st => {
      const subTaskName = st.subject || "Untitled Sub-Task";
      if (st.assigned_to === userId) {
        blockingItems.push(`Sub-Task: "${subTaskName}" (Primary Assignee)`);
      } else {
        const participant = st.task_participants?.find((p: any) => p.user_id === userId);
        if (participant) {
          if (participant.participation_role === 'EXECUTOR') {
            blockingItems.push(`Sub-Task: "${subTaskName}" (Executor)`);
          } else {
            watcherItems.push(`Sub-Task: "${subTaskName}" (Watcher)`);
          }
        }
      }
    });

    // Evaluate Checklists
    checklists?.forEach(cl => {
      if (cl.assignee_id === userId) {
        blockingItems.push(`Checklist Item: "${cl.label}"`);
      }
    });

    if (blockingItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'executive',
        message: `This user is assigned on ${blockingItems.length} sub-item(s). Please reassign them before removal.`,
        blockingItems
      };
    } else if (watcherItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'watcher',
        message: `This user is a watcher on ${watcherItems.length} item(s).`,
        blockingItems: watcherItems
      };
    } else {
      results[userId] = {
        userId,
        isSafe: true,
        type: null,
        message: "",
        blockingItems: []
      };
    }
  }

  return results;
}
