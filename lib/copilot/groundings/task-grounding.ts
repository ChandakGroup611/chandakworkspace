/**
 * Chandak AI Copilot — Task Workflow Grounding Engine
 * Source of Truth:
 * - lib/data/learning-data.ts
 * - docs/BUSINESS_RULES.md
 * - docs/IAM_RBAC_MATRIX.md
 */

import { learningModules } from "@/lib/data/learning-data";

export interface GroundedExplanation {
  topic: string;
  sourceDocument: string;
  definition: string;
  keyRules: string[];
  rolePermissions: Record<string, string>;
}

export const TASK_OWNERSHIP_RULES = {
  source: "docs/BUSINESS_RULES.md § 1 & docs/IAM_RBAC_MATRIX.md",
  roles: {
    PRIMARY_ASSIGNEE: {
      title: "Primary Assignee (Task Owner)",
      canEditAssignees: true,
      canEditExecutors: true,
      canEditWatchers: true,
      canEditSchedule: true, // Start Date, Due Date, Duration
      canChangeStatus: true,
      canTransferTask: true,
      canCloseOrReopen: true,
      canDeleteTask: true,
    },
    EXECUTOR: {
      title: "Executor (Collaborator)",
      canEditAssignees: false,
      canEditExecutors: false,
      canEditWatchers: false,
      canEditSchedule: false, // CANNOT alter Task Dates or Duration
      canChangeStatus: true,  // Can change status (In Progress, Resolved)
      canManageChecklists: true,
      canUploadAttachments: true,
      canAddRemarks: true,
      canTransferTask: false, // CANNOT Transfer or Delete
      canDeleteTask: false,
    },
    WATCHER: {
      title: "Watcher / Reviewer / Standard User (ROLE_AGENT)",
      canEditAssignees: false,
      canEditSchedule: false,
      canChangeStatus: false,
      canAddRemarks: true,
      readOnly: true,
      note: "MUST NOT see any Edit buttons (Primary Assignee, Executors, Watchers, Dates, Transfer)."
    },
    SUPER_ADMIN: {
      title: "Super Admin",
      fullOverride: true,
      canPerformAll: true
    }
  }
};

/**
 * Returns grounded explanation for task-related concepts
 */
export function explainTaskConcept(query: string): GroundedExplanation | null {
  const q = query.toLowerCase().trim();

  if (q.includes("primary assignee") || q.includes("task owner")) {
    return {
      topic: "Primary Assignee",
      sourceDocument: "docs/BUSINESS_RULES.md § 1",
      definition: "The designated individual accountable for delivering the task. Has full ownership of task properties, schedule, and team assignment.",
      keyRules: [
        "Only the Primary Assignee or Super Admin can modify Due Dates, Start Dates, or Duration.",
        "Can reassign Primary Assignee, add/remove Executors, and add/remove Watchers.",
        "Can transfer the task to another workspace or close/reopen the task."
      ],
      rolePermissions: {
        "Primary Assignee": "Full modification and schedule control",
        "Executor": "Blocked from altering schedule or ownership",
        "Watcher": "Read-only access"
      }
    };
  }

  if (q.includes("executor") || q.includes("collaborator")) {
    return {
      topic: "Executor",
      sourceDocument: "docs/BUSINESS_RULES.md § 1",
      definition: "An active team contributor assigned to carry out work and deliverables on a task.",
      keyRules: [
        "Can change Task Status (Start Progress, Resolve Directive).",
        "Can check off checklist items, create checklist items, and upload attachments.",
        "Can add task remarks and participate in realtime chat.",
        "CANNOT alter Task Dates, Duration, or reassign the Primary Assignee.",
        "CANNOT transfer or delete the task."
      ],
      rolePermissions: {
        "Executor": "Status, checklist, and attachment updates allowed",
        "Primary Assignee": "Supervises and manages executors"
      }
    };
  }

  if (q.includes("watcher") || q.includes("reviewer")) {
    return {
      topic: "Watcher",
      sourceDocument: "docs/BUSINESS_RULES.md § 1",
      definition: "A stakeholder who tracks progress without active execution responsibilities.",
      keyRules: [
        "Read-only access to task properties, attachments, and timeline.",
        "Can view details and add comments/remarks.",
        "Must NOT see or execute any edit buttons (Assignees, Dates, Transfer, Status)."
      ],
      rolePermissions: {
        "Watcher": "Read-only observation and commentary"
      }
    };
  }

  if (q.includes("checklist") || q.includes("subtask") || q.includes("task") || q.includes("workspace") || q.includes("ticket")) {
    const taskModule = learningModules.find(m => m.code === "TASK_WORKFLOW" || m.id === "task_management");
    if (taskModule) {
      return {
        topic: taskModule.title,
        sourceDocument: "lib/data/learning-data.ts",
        definition: taskModule.description,
        keyRules: taskModule.steps.map(s => `${s.title}: ${s.instruction}`),
        rolePermissions: {
          "Standard Users": "Restricted by workspace membership and task assignment",
          "Super Admin": "Universal operational access"
        }
      };
    }
  }

  // Explicit abstention for non-matching or unknown concepts
  return null;
}

/**
 * Returns step-by-step guidance for Task workflows
 */
export function guideTaskWorkflow(action: string) {
  const normalized = action.trim().toUpperCase().replace(/[\s-]/g, "_");
  let resolvedAction: "CREATE" | "TRANSITION_STATUS" | "RESOLVE" | "TRANSFER" = "CREATE";

  if (normalized.includes("RESOLVE") || normalized.includes("COMPLETE") || normalized.includes("CLOSE")) {
    resolvedAction = "RESOLVE";
  } else if (normalized.includes("TRANSFER") || normalized.includes("REASSIGN")) {
    resolvedAction = "TRANSFER";
  } else if (normalized.includes("STATUS") || normalized.includes("TRANSITION") || normalized.includes("PROGRESS")) {
    resolvedAction = "TRANSITION_STATUS";
  } else {
    resolvedAction = "CREATE";
  }

  switch (resolvedAction) {
    case "CREATE":
      return {
        title: "Task Creation Workflow",
        workflow: "Task Creation",
        summary: "Creating a new task deliverable within a workspace boundary.",
        sourceDocument: "lib/data/learning-data.ts",
        applicableRule: "Workspace Policy: Task must have Title, Priority, and Primary Assignee.",
        prerequisites: ["Enrolled in target Workspace", "Active user account"],
        requiredFields: ["Workspace ID", "Title / Subject", "Priority (LOW, MEDIUM, HIGH, URGENT)"],
        optionalFields: ["Primary Assignee", "Executors", "Watchers", "Start Date", "Due Date", "Checklists"],
        steps: [
          "1. Navigate to target Workspace or Workspace Tasks list (/workspaces/tasks).",
          "2. Click '+ Create Task'.",
          "3. Enter Title, Description, and select Priority.",
          "4. Designate the Primary Assignee (defaults to creator if omitted).",
          "5. Set Start Date and Due Date (optional, editable only by Primary Assignee).",
          "6. Save to initiate task lifecycle."
        ]
      };
    case "TRANSITION_STATUS":
      return {
        title: "Status Transition Workflow",
        workflow: "Status Transition",
        summary: "Progressing a task through its operational status lifecycle.",
        sourceDocument: "docs/BUSINESS_RULES.md & lib/actions/tasks.ts",
        applicableRule: "Task Governance: Parent tasks cannot be completed if subtasks remain open.",
        prerequisites: ["User must be Primary Assignee, Executor, or Super Admin"],
        requiredFields: ["Target Status ID", "Transition Remark (optional)"],
        steps: [
          "1. Open Task Execution details modal or page.",
          "2. Locate Status dropdown (In Progress, Under Review, Completed).",
          "3. Select target status and provide optional transition remark.",
          "4. System automatically validates that parent task cannot be completed if subtasks remain open."
        ]
      };
    case "RESOLVE":
      return {
        title: "Task Resolution Workflow",
        workflow: "Task Resolution",
        summary: "Closing and resolving a task after deliverable completion.",
        sourceDocument: "docs/BUSINESS_RULES.md",
        applicableRule: "Resolution Standard: All child subtasks must be closed before parent resolution.",
        prerequisites: ["All subtasks and mandatory checklist items completed"],
        requiredFields: ["Completed Checklists", "Closure Remark"],
        steps: [
          "1. Check off all checklist deliverables.",
          "2. Upload completion evidence attachment if required.",
          "3. Move status to 'Completed' or 'Resolved'.",
          "4. Primary Assignee receives instant notification to verify completion."
        ]
      };
    case "TRANSFER":
      return {
        title: "Task Workspace Transfer",
        workflow: "Task Workspace Transfer",
        summary: "Transferring task ownership and execution to a different workspace.",
        sourceDocument: "docs/BUSINESS_RULES.md",
        applicableRule: "Transfer Authority: Only Primary Assignee or Super Admin may transfer tasks.",
        prerequisites: ["User must be Primary Assignee or Super Admin", "Target workspace must exist and be active"],
        requiredFields: ["Destination Workspace ID"],
        steps: [
          "1. Click 'Transfer Task' action in Task Execution Controller.",
          "2. Select destination workspace.",
          "3. Confirm transfer. Task, attachments, checklists, and audit history migrate to new workspace boundary."
        ]
      };
  }
}
