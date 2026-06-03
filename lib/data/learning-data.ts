import { BookOpen, FolderKanban, ShieldCheck, Ticket } from "lucide-react";

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
    ],
    steps: [
      { title: "Open a Workspace", instruction: "Navigate to a specific Workspace to see its Task Board or List." },
      { title: "Create Task", instruction: "Click the '+ Task' button to open the task creation drawer." },
      { title: "Define Scope", instruction: "Enter the Subject and comprehensive Description." },
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
