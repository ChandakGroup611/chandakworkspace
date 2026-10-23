/**
 * Chandak AI Copilot — Phase 2: Task Module Read-Only Tools
 * Strictly read-only; mutations remain completely disabled.
 */

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { canAccessTask, hasPermission } from "@/lib/permissions";
import { 
  explainTaskConcept, 
  guideTaskWorkflow, 
  TASK_OWNERSHIP_RULES 
} from "@/lib/copilot/groundings/task-grounding";
import type { 
  ToolDefinition, 
  ToolExecutionContext, 
  DiagnosticResult 
} from "@/lib/copilot/types";

// ============================================================================
// 1. Capability 1: EXPLAIN TOOL
// ============================================================================
export const explainTaskTool: ToolDefinition = {
  name: "explain_task_concept",
  description: "Explains Chandak task concepts, terminology, ownership roles, or business rules.",
  parameters: {
    type: "object",
    properties: {
      concept: {
        type: "string",
        description: "The task concept to explain (e.g., 'Primary Assignee', 'Executor', 'Watcher', 'Checklist')"
      }
    },
    required: ["concept"]
  },
  async execute({ concept }: { concept: string }) {
    const explanation = explainTaskConcept(concept);
    if (!explanation) {
      return {
        found: false,
        message: `I could not find a verified definition for '${concept}' in Chandak Task documentation.`,
        safeGuidance: "Please check with your department manager or refer to the Chandak Workspace Learning Hub."
      };
    }
    return {
      found: true,
      ...explanation
    };
  }
};

// ============================================================================
// 2. Capability 2: GUIDE TOOL
// ============================================================================
export const guideTaskWorkflowTool: ToolDefinition = {
  name: "guide_task_workflow",
  description: "Provides verified, step-by-step guidance for Task creation, status transition, resolution, or transfer.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Workflow action to guide: CREATE, TRANSITION_STATUS, RESOLVE, TRANSFER",
        enum: ["CREATE", "TRANSITION_STATUS", "RESOLVE", "TRANSFER"]
      }
    },
    required: ["action"]
  },
  async execute({ action }: { action: "CREATE" | "TRANSITION_STATUS" | "RESOLVE" | "TRANSFER" }) {
    return guideTaskWorkflow(action);
  }
};

// ============================================================================
// 3. Capability 3: RETRIEVE TOOL (Live Authorized Data)
// ============================================================================
export const getTaskDetailsTool: ToolDefinition = {
  name: "get_task_details",
  description: "Retrieves live task status, assignees, dates, and checklists for an authorized task.",
  parameters: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "The unique UUID or identifier of the task (e.g. TSK-102 or UUID)"
      }
    },
    required: ["taskId"]
  },
  async execute({ taskId }: { taskId: string }, context: ToolExecutionContext) {
    if (!taskId) {
      return { error: "BAD_REQUEST", message: "Task ID is required." };
    }

    // Step 1: Authoritative Server Access Check
    const allowed = await canAccessTask(context.userId, taskId);
    if (!allowed) {
      return {
        error: "ACCESS_DENIED",
        message: "You do not have permission to view this task under current workspace and ownership policies.",
        safeGuidance: "Ask the Primary Assignee to add you as an Executor or Watcher."
      };
    }

    // Step 2: Query Live Task Record (Direct query without problematic joins)
    const [taskRes, checklistsRes, participantsRes] = await Promise.all([
      supabaseAdmin
        .from("tasks")
        .select(`
          id, subject, description, priority_id, status_id, start_date, end_date,
          created_by, assigned_to, workspace_id, created_at, updated_at,
          status:status_master(id, status_name, status_code, is_closed)
        `)
        .eq("id", taskId)
        .eq("is_deleted", false)
        .maybeSingle(),
      supabaseAdmin
        .from("task_checklists")
        .select("id, title, is_completed")
        .eq("task_id", taskId),
      supabaseAdmin
        .from("task_participants")
        .select("user_id, participation_role")
        .eq("task_id", taskId)
    ]);

    if (taskRes.error || !taskRes.data) {
      return {
        error: "NOT_FOUND",
        message: `Task with ID '${taskId}' was not found or has been deleted.`,
        safeGuidance: "Verify the task number from your Workspace Tasks dashboard."
      };
    }

    const task = taskRes.data;
    const userIds = [task.assigned_to, task.created_by, ...(participantsRes.data || []).map(p => p.user_id)].filter(Boolean);

    // Fetch user names from user_master
    const { data: users } = await supabaseAdmin
      .from("user_master")
      .select("id, full_name, email")
      .in("id", userIds);

    const userMap = new Map((users || []).map(u => [u.id, u.full_name]));

    // Determine caller's verified role on this task
    let callerRoleOnTask = "VIEWER";
    if (task.assigned_to === context.userId) {
      callerRoleOnTask = "PRIMARY_ASSIGNEE";
    } else if (task.created_by === context.userId) {
      callerRoleOnTask = "CREATOR";
    } else {
      const part = participantsRes.data?.find(p => p.user_id === context.userId);
      if (part) {
        callerRoleOnTask = part.participation_role;
      }
    }

    const checklists = checklistsRes.data || [];

    return {
      success: true,
      verifiedRecord: {
        id: task.id,
        title: task.subject,
        description: task.description,
        status: (task.status as any)?.status_name || (task.status as any)?.status_code || task.status_id,
        startDate: task.start_date,
        dueDate: task.end_date,
        primaryAssignee: userMap.get(task.assigned_to) || "Unassigned",
        creator: userMap.get(task.created_by) || "Unknown",
        callerRoleOnTask,
        checklistsCount: checklists.length,
        completedChecklistsCount: checklists.filter(c => c.is_completed).length,
        executors: (participantsRes.data || [])
          .filter(p => p.participation_role === "EXECUTOR")
          .map(p => userMap.get(p.user_id))
          .filter(Boolean),
        watchers: (participantsRes.data || [])
          .filter(p => p.participation_role === "WATCHER")
          .map(p => userMap.get(p.user_id))
          .filter(Boolean)
      }
    };
  }
};

// ============================================================================
// 4. Capability 4: DIAGNOSE TOOL (Blocker & Error Analysis)
// ============================================================================
export const diagnoseTaskBlockerTool: ToolDefinition = {
  name: "diagnose_task_action_blocker",
  description: "Diagnoses why a specific task action (e.g. edit schedule, reassign, resolve) is blocked or why buttons are disabled.",
  parameters: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "The unique UUID or identifier of the task"
      },
      attemptedAction: {
        type: "string",
        description: "The action the user is trying to perform (e.g. 'EDIT_SCHEDULE', 'REASSIGN', 'DELETE', 'RESOLVE')",
        enum: ["EDIT_SCHEDULE", "REASSIGN", "DELETE", "RESOLVE", "TRANSFER"]
      }
    },
    required: ["taskId", "attemptedAction"]
  },
  async execute({ taskId, attemptedAction }: { taskId: string; attemptedAction: string }, context: ToolExecutionContext): Promise<DiagnosticResult> {
    // Step 1: Verify read access to the task
    const allowed = await canAccessTask(context.userId, taskId);
    if (!allowed) {
      return {
        isBlocked: true,
        blockerType: "PERMISSION_DENIED",
        verifiedFacts: [
          `Fact: You do not have access to view Task '${taskId}' under current workspace visibility rules.`
        ],
        workingHypotheses: [
          "Hypothesis: The task may be private to another workspace or you have not been enrolled in this project."
        ],
        applicableRule: "Workspace security policy restricts task access to enrolled members and explicit assignees.",
        recommendedSafeAction: "Request your Workspace Manager to grant you enrollment or invite you to the task."
      };
    }

    // Step 2: Fetch task details and caller's participation
    const [taskRes, partRes] = await Promise.all([
      supabaseAdmin
        .from("tasks")
        .select("id, assigned_to, created_by, status_id, parent_task_id")
        .eq("id", taskId)
        .maybeSingle(),
      supabaseAdmin
        .from("task_participants")
        .select("user_id, participation_role")
        .eq("task_id", taskId)
    ]);

    const task = taskRes.data;
    if (!task) {
      return {
        isBlocked: true,
        verifiedFacts: [`Fact: Task '${taskId}' does not exist in the database.`],
        workingHypotheses: ["Hypothesis: The task may have been deleted or archived."],
        recommendedSafeAction: "Confirm the task ID from your workspace task board."
      };
    }

    const isPrimary = task.assigned_to === context.userId;
    const isSuperAdmin = await hasPermission(context.userId, "SUPER_ADMIN");
    const participant = partRes.data?.find(p => p.user_id === context.userId);
    const participationRole = participant?.participation_role || (isPrimary ? "PRIMARY_ASSIGNEE" : "NONE");

    // Diagnostic Rule Evaluation
    if (attemptedAction === "EDIT_SCHEDULE" || attemptedAction === "REASSIGN" || attemptedAction === "TRANSFER" || attemptedAction === "DELETE") {
      if (!isPrimary && !isSuperAdmin) {
        return {
          isBlocked: true,
          blockerType: "PERMISSION_DENIED",
          verifiedFacts: [
            `Fact: You are assigned as '${participationRole}' on this task.`,
            `Fact: The designated Primary Assignee is a different user (${task.assigned_to}).`,
            "Fact: You do not possess the SUPER_ADMIN platform override role."
          ],
          workingHypotheses: [
            "Hypothesis: You may have been invited to execute work deliverables rather than manage project timelines."
          ],
          applicableRule: TASK_OWNERSHIP_RULES.source + ": 'Only the Primary Assignee (Task Owner) or Super Admin can edit dates, duration, reassign, transfer, or delete the task.'",
          recommendedSafeAction: "Contact the Primary Assignee and request them to adjust the schedule or reassign ownership."
        };
      }
    }

    if (attemptedAction === "RESOLVE") {
      // Check subtasks blocker
      const { data: openSubtasks } = await supabaseAdmin
        .from("tasks")
        .select("id, subject")
        .eq("parent_task_id", taskId)
        .eq("is_deleted", false)
        .neq("status_id", "ST_RESOLVED")
        .limit(5);

      if (openSubtasks && openSubtasks.length > 0) {
        return {
          isBlocked: true,
          blockerType: "PREREQUISITE_MISSING",
          verifiedFacts: [
            `Fact: This parent task has ${openSubtasks.length} open subtask(s) that must be resolved first.`,
            `Fact: Open subtask IDs: ${openSubtasks.map(s => s.id).join(", ")}`
          ],
          workingHypotheses: [
            "Hypothesis: Some subtask assignees have not yet checked off their deliverables."
          ],
          applicableRule: "Task Hierarchy Governance: A parent milestone cannot be closed while child tasks remain in progress.",
          recommendedSafeAction: "Review and close all child subtasks before completing the parent task."
        };
      }
    }

    return {
      isBlocked: false,
      verifiedFacts: [
        `Fact: You are authorized as ${isPrimary ? "Primary Assignee" : "Authorized User"} on Task '${taskId}'.`,
        `Fact: No blocking conditions detected for action '${attemptedAction}'.`
      ],
      workingHypotheses: [],
      recommendedSafeAction: "You may proceed with the operation directly in the task details panel."
    };
  }
};

// ============================================================================
// Phase 2 Task Tool Registry
// ============================================================================
export const taskModuleTools: Record<string, ToolDefinition> = {
  explain_task_concept: explainTaskTool,
  guide_task_workflow: guideTaskWorkflowTool,
  get_task_details: getTaskDetailsTool,
  diagnose_task_action_blocker: diagnoseTaskBlockerTool
};
