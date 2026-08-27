"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";

export type DependencyType = 'executive' | 'watcher';

export interface DependencyCheckResult {
  userId: string;
  isSafe: boolean;
  type: DependencyType | null;
  message: string;
  blockingItems: string[];
}

/**
 * Checks if the given users have any dependencies in the given workspace.
 */
export async function checkWorkspaceUserDependencies(workspaceId: string, userIds: string[]): Promise<Record<string, DependencyCheckResult>> {
  const results: Record<string, DependencyCheckResult> = {};
  
  if (!workspaceId || userIds.length === 0) return results;

  // 1. Check Tasks
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assigned_to, task_participants(user_id, participation_role)")
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false);

  // 2. Check Tickets
  const { data: tickets } = await supabaseAdmin
    .from("tickets")
    .select("id, ticket_number, assignee_id, custom_fields")
    .eq("is_deleted", false);
    
  const workspaceTickets = (tickets || []).filter(t => t.custom_fields?.workspace_id === workspaceId);

  // 3. Check Sub-Workspaces
  const { data: subWorkspaces } = await supabaseAdmin
    .from("workspaces")
    .select("id, workspace_name, workspace_owner_id, workspace_members(user_id, role)")
    .eq("parent_workspace_id", workspaceId)
    .eq("is_deleted", false);


  for (const userId of userIds) {
    const blockingItems: string[] = [];
    const watcherItems: string[] = [];
    
    // Evaluate Tasks
    tasks?.forEach(task => {
      if (task.assigned_to === userId) {
        blockingItems.push(`Task: ${task.title} (Primary Assignee)`);
      } else {
        const participant = task.task_participants?.find((p: any) => p.user_id === userId);
        if (participant) {
          if (participant.participation_role === 'EXECUTOR') {
            blockingItems.push(`Task: ${task.title} (Executor)`);
          } else {
            watcherItems.push(`Task: ${task.title} (Watcher)`);
          }
        }
      }
    });

    // Evaluate Tickets
    workspaceTickets.forEach(ticket => {
      if (ticket.assignee_id === userId) {
        blockingItems.push(`Ticket: ${ticket.ticket_number}`);
      }
    });

    // Evaluate Sub-Workspaces
    subWorkspaces?.forEach(sws => {
      if (sws.workspace_owner_id === userId) {
        blockingItems.push(`Sub-Workspace: ${sws.workspace_name} (Owner)`);
      } else {
        const member = sws.workspace_members?.find((m: any) => m.user_id === userId);
        if (member) {
          if (member.role === 'manager' || member.role === 'WORKSPACE_MANAGER' || member.role === 'owner' || member.role === 'WORKSPACE_OWNER') {
            blockingItems.push(`Sub-Workspace: ${sws.workspace_name} (Manager)`);
          } else {
            watcherItems.push(`Sub-Workspace: ${sws.workspace_name} (Member)`);
          }
        }
      }
    });

    if (blockingItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'executive',
        message: `This user is enrolled in ${blockingItems[0]}${blockingItems.length > 1 ? ` and ${blockingItems.length - 1} other activities` : ''}. If you want to change, first change the executive with a different user, then remove.`,
        blockingItems
      };
    } else if (watcherItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'watcher',
        message: `This user is a watcher on ${watcherItems[0]}${watcherItems.length > 1 ? ` and ${watcherItems.length - 1} other activities` : ''}. Do you want to continue?`,
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
 * Checks if the given users have any dependencies in the given task.
 */
export async function checkTaskUserDependencies(taskId: string, userIds: string[]): Promise<Record<string, DependencyCheckResult>> {
  const results: Record<string, DependencyCheckResult> = {};
  
  if (!taskId || userIds.length === 0) return results;

  // 1. Check Sub-Tasks
  const { data: subTasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, assigned_to, task_participants(user_id, participation_role)")
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
      if (st.assigned_to === userId) {
        blockingItems.push(`Sub-Task: ${st.title} (Primary Assignee)`);
      } else {
        const participant = st.task_participants?.find((p: any) => p.user_id === userId);
        if (participant) {
          if (participant.participation_role === 'EXECUTOR') {
            blockingItems.push(`Sub-Task: ${st.title} (Executor)`);
          } else {
            watcherItems.push(`Sub-Task: ${st.title} (Watcher)`);
          }
        }
      }
    });

    // Evaluate Checklists
    checklists?.forEach(cl => {
      if (cl.assignee_id === userId) {
        blockingItems.push(`Checklist Item: ${cl.label}`);
      }
    });

    if (blockingItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'executive',
        message: `This user is enrolled in ${blockingItems[0]}${blockingItems.length > 1 ? ` and ${blockingItems.length - 1} other activities` : ''}. If you want to change, first change the executive with a different user, then remove.`,
        blockingItems
      };
    } else if (watcherItems.length > 0) {
      results[userId] = {
        userId,
        isSafe: false,
        type: 'watcher',
        message: `This user is a watcher on ${watcherItems[0]}${watcherItems.length > 1 ? ` and ${watcherItems.length - 1} other activities` : ''}. Do you want to continue?`,
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
