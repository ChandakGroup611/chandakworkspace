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

  if (q.includes("report") || q.includes("analytic") || q.includes("kpi") || q.includes("export")) {
    return {
      topic: "Workspace Task Reports & Analytics",
      sourceDocument: "app/workspaces/reports/page.tsx",
      definition: "The enterprise reporting engine for tracking task completion turnaround times, status distributions, overdue deliverables, and team productivity.",
      keyRules: [
        "Navigate to Workspaces -> Reports & analytics (/workspaces/reports).",
        "Interactive filters: Workspace, Status (Pending, In Progress, Completed, Overdue), Assignee, and Date Range.",
        "One-click data export to Excel (.xlsx) and PDF formats.",
        "Requires 'REPORTS_VIEW' permission or Super Admin status."
      ],
      rolePermissions: {
        "Super Admin": "Universal organization reporting access",
        "Standard User / Lead": "Access granted with 'REPORTS_VIEW' permission"
      }
    };
  }

  if (
    q === "checklist" ||
    q.includes("task checklist") ||
    q.includes("task management") ||
    q.includes("workspace task") ||
    q.includes("task overview") ||
    q.includes("task workflow") ||
    q === "tasks" ||
    q === "task"
  ) {
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

  if (q.includes("mitra") || q.includes("copilot") || q.includes("chandak ai") || q.includes("assistant")) {
    return {
      topic: "Chandak Mitra",
      sourceDocument: "Chandak Enterprise Portal Architecture",
      definition: "Chandak Mitra is your intelligent digital companion ('Aapka Digital Dost') embedded across the platform to assist with task tracking, fleet management, and design transmittals.",
      keyRules: [
        "Accessible from the Chandak Mitra trigger button on the top navigation bar or with keyboard shortcut Ctrl+/.",
        "Available across Task Workflow, Vehicle Desk, and Design Tracking modules.",
        "Enforces strict RBAC and ownership mirroring: only authorized users can view details or propose actions.",
        "Supports natural task keyword search (e.g. 'show my sfdc task'), live workload summaries, and real-time blocker diagnostics."
      ],
      rolePermissions: {
        "All Authorized Users": "Access grounded tools corresponding to their assigned module permissions",
        "Super Admin": "Universal operational diagnostics across all modules"
      }
    };
  }

  // Explicit abstention for non-matching or unknown concepts
  return null;
}

/**
 * Returns step-by-step guidance for Task workflows
 */
export function guideTaskWorkflow(action: string) {
  const normalized = action.trim().toUpperCase().replace(/[\s-]/g, "_");
  let resolvedAction: "CREATE" | "TRANSITION_STATUS" | "RESOLVE" | "TRANSFER" | "DELETE" | "VIEW_REPORTS" | "CHECK_STATUS" | null = null;

  if (normalized.includes("REPORT") || normalized.includes("ANALYTIC") || normalized.includes("EXPORT")) {
    resolvedAction = "VIEW_REPORTS";
  } else if (normalized.includes("WHERE") && (normalized.includes("STATUS") || normalized.includes("CHECK") || normalized.includes("FIND"))) {
    resolvedAction = "CHECK_STATUS";
  } else if (normalized.includes("DELETE") || normalized.includes("REMOVE") || normalized.includes("CANCEL") || normalized.includes("ARCHIVE")) {
    resolvedAction = "DELETE";
  } else if (normalized.includes("RESOLVE") || normalized.includes("COMPLETE") || normalized.includes("CLOSE")) {
    resolvedAction = "RESOLVE";
  } else if (normalized.includes("TRANSFER") || normalized.includes("REASSIGN")) {
    resolvedAction = "TRANSFER";
  } else if (normalized.includes("STATUS") || normalized.includes("TRANSITION") || normalized.includes("PROGRESS")) {
    resolvedAction = "TRANSITION_STATUS";
  } else if (normalized.includes("CREATE") || normalized.includes("ADD") || normalized.includes("NEW") || normalized.includes("MAKE") || normalized.includes("START")) {
    resolvedAction = "CREATE";
  } else {
    // Return null instead of silently falling back to CREATE
    return null;
  }

  switch (resolvedAction) {
    case "DELETE":
      return {
        title: "Task Deletion Workflow",
        workflow: "Task Deletion",
        summary: "Removing a task deliverable from the workspace. Requires appropriate administrative authority and dependency clearance.",
        sourceDocument: "docs/BUSINESS_RULES.md § 1 & lib/actions/tasks.ts",
        applicableRule: "Deletion Authority: Only Workspace Owners, Super Admins, or users with explicit 'TASKS_DELETE' permission can delete a task. Deletion is blocked if open dependencies or active subtasks exist.",
        prerequisites: [
          "User must be Workspace Owner, Super Admin, or have explicit 'TASKS_DELETE' permission",
          "All child subtasks must be closed or removed",
          "All task dependencies (predecessors/successors) must be cleared"
        ],
        requiredFields: ["Task ID", "Confirmation"],
        steps: [
          "1. Open the Task Execution Controller or Task Details page for the target task.",
          "2. Check the Dependencies section to ensure no tasks list this task as a predecessor or successor.",
          "3. Verify that all child subtasks have been completed or removed.",
          "4. Click the 'Delete Task' button (visible only to Workspace Owners, Admins, or users with TASKS_DELETE permission).",
          "5. Confirm the action in the prompt. The task is soft-deleted and an audit log event is recorded."
        ]
      };
    case "VIEW_REPORTS":
      return {
        title: "Workspace Task Status Reports & Analytics",
        workflow: "Task Status Reports",
        summary: "Viewing aggregated task progress, completion metrics, overdue status, and Excel/PDF reports.",
        sourceDocument: "app/workspaces/reports/page.tsx & components/reports/ReportsClient.tsx",
        applicableRule: "Reporting Authorization: Access requires 'REPORTS_VIEW' permission or Super Admin role.",
        prerequisites: ["Active Workspace Enrollment", "'REPORTS_VIEW' or Super Admin authorization"],
        requiredFields: ["Target Workspace Scope", "Date Filter (optional)"],
        steps: [
          "1. Navigate to 'Workspaces' from the top navigation bar.",
          "2. Click 'Reports & analytics' in the workspace menu (or open direct route: /workspaces/reports).",
          "3. Use the Workspace Selector to filter by a specific project workspace or select 'All Workspaces'.",
          "4. Apply Status filters (In Progress, Under Review, Completed, Overdue) or Assignee filters.",
          "5. Inspect the live KPI Bar for Total Tasks, Completion %, Overdue Count, and Turnaround Time.",
          "6. To download the report, click 'Export XLSX' for full Excel spreadsheet or 'Export PDF' for formatted executive report."
        ]
      };
    case "CHECK_STATUS":
      return {
        title: "Check Task Status & Progress",
        workflow: "Check Task Status",
        summary: "Checking real-time status, subtask progress, and deliverable state for tasks.",
        sourceDocument: "docs/BUSINESS_RULES.md & app/workspaces/tasks/page.tsx",
        applicableRule: "Visibility Rule: Users can view task status across workspaces where they have active access.",
        prerequisites: ["Enrolled in target Workspace"],
        requiredFields: ["Task ID / Subject"],
        steps: [
          "1. Open Workspaces -> Workspace Tasks (/workspaces/tasks) or your active workspace dashboard.",
          "2. Use the Hierarchy Scope selector: 'All', 'My Department', 'My Reporting Tree', or 'Assigned to Me'.",
          "3. View status pill badges (Pending, In Progress, Under Review, Completed, On Hold).",
          "4. Click on any task row to open the Task Execution Controller for deep inspection of checklists and progress remarks."
        ]
      };
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
