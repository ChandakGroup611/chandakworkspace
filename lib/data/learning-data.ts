import { BookOpen, FolderKanban, ShieldCheck, Ticket, CalendarDays, Timer, Tags } from "lucide-react";

export type LearningModuleField = {
  name: string;
  type: string;
  description: string;
  isRequired: boolean;
};

export type LearningModuleStep = {
  title: string;
  instruction: string;
};

export type LearningModuleResult = {
  action: string;
  outcome: string;
  technicalDetail: string;
};

export type LearningModule = {
  id: string;
  title: string;
  description: string;
  icon: any;
  startInfo: {
    overview: string;
    prerequisites: string[];
  };
  fields: LearningModuleField[];
  steps: LearningModuleStep[];
  results: LearningModuleResult[];
};

export const learningModules: LearningModule[] = [
  {
    id: "workspaces",
    title: "Workspace Management",
    description: "Learn how to orchestrate projects, manage members, and organize your company hierarchy.",
    icon: FolderKanban,
    startInfo: {
      overview: "The Workspace Management module is the core structural spine of ADIOS. Workspaces represent overarching projects or departments. By learning this module, you'll understand how to encapsulate tasks, sprints, and permissions.",
      prerequisites: [
        "A valid ADIOS User Account.",
        "WORKSPACES_VIEW permission.",
        "(Optional) WORKSPACES_CREATE permission to follow along with creation."
      ]
    },
    fields: [
      { name: "Workspace Name", type: "Text Input", description: "The descriptive title of your workspace. Should be concise and easily identifiable.", isRequired: true },
      { name: "Workspace Code", type: "Text Input", description: "A unique identifier (e.g., IT-ERP). The system will auto-generate one if left blank.", isRequired: false },
      { name: "Company", type: "Dropdown", description: "Links the workspace to a specific corporate entity within the Master Database.", isRequired: true },
      { name: "Start/End Date", type: "Date Picker", description: "Defines the active lifecycle of the workspace for reporting purposes.", isRequired: false },
      { name: "Assignees", type: "Multi-Select", description: "Users granted access to view and interact with tasks inside this workspace.", isRequired: false },
    ],
    steps: [
      { title: "Navigate to Workspaces", instruction: "Click on 'Workspaces' under 'Core Operations' in the left-hand navigation sidebar." },
      { title: "Initiate Creation", instruction: "Click the '+ New Workspace' button in the top right corner of the Workspace list." },
      { title: "Fill Metadata", instruction: "Provide the Workspace Name and select the applicable Company." },
      { title: "Assign Members", instruction: "Use the Assignees dropdown to select users who should have access. You (the creator) are automatically assigned as the Manager." },
      { title: "Submit", instruction: "Click 'Create Workspace' to finalize the structural generation." }
    ],
    results: [
      { action: "Database Insertion", outcome: "A new row is created in the `workspaces` table.", technicalDetail: "Executes an insert into public.workspaces. The ID is a generated UUIDv4." },
      { action: "Membership Binding", outcome: "Selected users are added to the workspace.", technicalDetail: "Inserts records into `workspace_members` linking user UUIDs to the workspace UUID." },
      { action: "Background Notifications", outcome: "Assigned users receive an alert.", technicalDetail: "The system dispatches asynchronous notifications to all members via `dispatchNotification()`." }
    ]
  },
  {
    id: "tasks",
    title: "Task Lifecycle & Execution",
    description: "Master the creation, tracking, and resolution of granular tasks within workspaces.",
    icon: Ticket,
    startInfo: {
      overview: "Tasks are the granular units of work in ADIOS. This module covers how to document work, assign executors, set priorities, and transition tasks through their lifecycle until completion.",
      prerequisites: [
        "Access to at least one active Workspace.",
        "Basic understanding of the Workspace module."
      ]
    },
    fields: [
      { name: "Subject/Title", type: "Text Input", description: "The headline of the task. Keep it actionable.", isRequired: true },
      { name: "Description", type: "Rich Text", description: "Detailed context, acceptance criteria, and notes.", isRequired: false },
      { name: "Priority", type: "Dropdown", description: "Urgency level (e.g., High, Medium, Low) which affects SLA calculations.", isRequired: true },
      { name: "Participants", type: "Multi-Select", description: "Executors (doers), Reviewers (approvers), and Watchers (observers).", isRequired: false },
      { name: "Checklist", type: "Dynamic List", description: "Sub-items that must be checked off before the task is considered done.", isRequired: false },
      { name: "Tags & Labels", type: "Multi-Select", description: "Custom tags used for cross-workspace categorization, searching, and filtering (e.g., 'Bug', 'Frontend', 'Urgent').", isRequired: false },
    ],
    steps: [
      { title: "Open a Workspace", instruction: "Navigate to a specific Workspace to see its Task Board or List." },
      { title: "Create Task", instruction: "Click the '+ Task' button to open the task creation drawer." },
      { title: "Define Scope", instruction: "Enter the Subject and comprehensive Description, and apply relevant Tags for categorization." },
      { title: "Assign Roles", instruction: "Add an Executor so someone is responsible for the work." },
      { title: "Transition Status", instruction: "Once created, open the task and use the top-right Status Dropdown to move it from 'NEW' to 'IN PROGRESS', and eventually 'CLOSED'." }
    ],
    results: [
      { action: "Task Record Creation", outcome: "The task appears on the board.", technicalDetail: "A row is inserted into the `tasks` table with a default status mapping to 'NEW'." },
      { action: "Role Distribution", outcome: "Participants are assigned.", technicalDetail: "Rows are added to `task_participants` mapped to specific roles (EXECUTOR, WATCHER)." },
      { action: "Activity Audit Log", outcome: "A history trail is started.", technicalDetail: "Status changes and creations trigger entries in the `task_activity_logs` table for compliance tracking." }
    ]
  },
  {
    id: "sprints",
    title: "Sprint Planning",
    description: "Learn how to timebox your work using Agile Sprints for focused execution.",
    icon: CalendarDays,
    startInfo: {
      overview: "Sprints help teams execute a focused subset of tasks over a specific time period (usually 1-4 weeks). This prevents the team from being overwhelmed by the master backlog.",
      prerequisites: [
        "A Workspace with active tasks.",
        "WORKSPACES_MANAGE or equivalent permissions to create a Sprint."
      ]
    },
    fields: [
      { name: "Sprint Name", type: "Text Input", description: "The identifier for the sprint (e.g., 'Sprint 12', 'Q3 Launch').", isRequired: true },
      { name: "Start/End Date", type: "Date Picker", description: "The exact timeframe during which the tasks must be completed.", isRequired: true },
      { name: "Goal", type: "Text Input", description: "The overarching objective of this sprint iteration.", isRequired: false },
    ],
    steps: [
      { title: "Navigate to Sprint Planning", instruction: "Open your workspace and click the 'Sprint Planning' tab next to 'Execution Hierarchy'." },
      { title: "Create a Sprint", instruction: "Click 'New Sprint', give it a name, and set the duration." },
      { title: "Assign Tasks", instruction: "Drag tasks from your backlog into the active Sprint to commit them to this timebox." },
      { title: "Monitor Progress", instruction: "Use the Sprint Board to transition tasks across columns until the sprint concludes." }
    ],
    results: [
      { action: "Sprint Record", outcome: "A Sprint container is generated.", technicalDetail: "Inserted into the `sprints` table linked to the parent workspace." },
      { action: "Task Association", outcome: "Tasks are bound to the sprint.", technicalDetail: "The `sprint_id` foreign key is updated on the respective `tasks` rows." },
    ]
  },
  {
    id: "time-tracking",
    title: "Time Logging & Capacity",
    description: "Track actual hours spent on tasks versus estimates to measure team velocity.",
    icon: Timer,
    startInfo: {
      overview: "Time logging provides critical analytics for managers to understand where effort is being spent. By logging time, the system can calculate capacity, burn rates, and identify bottlenecks.",
      prerequisites: [
        "An assigned task."
      ]
    },
    fields: [
      { name: "Hours", type: "Number Input", description: "The amount of time spent working during this specific session.", isRequired: true },
      { name: "Remarks", type: "Text Input", description: "A brief explanation of what was accomplished during these hours.", isRequired: false },
    ],
    steps: [
      { title: "Open a Task", instruction: "Click on any task to open its detail drawer." },
      { title: "Navigate to Time Tab", instruction: "Look for the 'Time' tab in the top navigation of the drawer." },
      { title: "Log Effort", instruction: "Enter your hours, provide a short note about the work done, and click 'Save Log'." },
      { title: "Review History", instruction: "The system aggregates your total hours and displays a historical log of every session." }
    ],
    results: [
      { action: "Time Entry", outcome: "The hours are added to the task total.", technicalDetail: "A row is inserted into `task_time_logs` containing the duration and the actor ID." },
      { action: "Capacity Calculation", outcome: "Dashboard metrics update automatically.", technicalDetail: "Aggregations run on the fly to compare logged time against `estimated_hours`." },
    ]
  },
  {
    id: "iam",
    title: "IAM & Security Governance",
    description: "Understand how Roles, Permissions, and Access Policies protect enterprise data.",
    icon: ShieldCheck,
    startInfo: {
      overview: "Identity and Access Management (IAM) controls who can see and do what in ADIOS. This module explains the Role-Based Access Control (RBAC) mapping and Row Level Security (RLS) layers.",
      prerequisites: [
        "SUPER_ADMIN or IAM_VIEW permissions.",
        "Understanding of organizational security policies."
      ]
    },
    fields: [
      { name: "Role Name", type: "Text Input", description: "The logical grouping of permissions (e.g., 'Project Manager').", isRequired: true },
      { name: "Permissions", type: "Checkbox Grid", description: "Granular capabilities (e.g., TASKS_VIEW, WORKSPACES_DELETE) granted to the role.", isRequired: true },
      { name: "User Assignment", type: "Dropdown", description: "Linking a user to a specific structural Role.", isRequired: true },
    ],
    steps: [
      { title: "Navigate to IAM", instruction: "Click 'IAM Controls' under 'Governance & Analysis'." },
      { title: "Review Roles", instruction: "View the list of existing Roles to understand current capability bundles." },
      { title: "Assign User Role", instruction: "Click on a User, Edit their profile, and change their assigned Role." },
      { title: "Database Sync", instruction: "Changes are applied immediately across the entire platform." }
    ],
    results: [
      { action: "Role Binding", outcome: "The user gets new capabilities.", technicalDetail: "Updates the `role_id` on the `user_master` table." },
      { action: "Snapshot Update", outcome: "Fast permissions are recalculated.", technicalDetail: "A database trigger automatically rebuilds the `user_permissions_snapshot` table for blazing fast RLS checks." },
      { action: "RLS Enforcement", outcome: "Subsequent queries are filtered.", technicalDetail: "Postgres Row Level Security uses `has_permission_snapshot()` to grant or deny access to rows." }
    ]
  }
];
