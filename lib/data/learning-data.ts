import { BookOpen, FolderKanban, ShieldCheck, Ticket, CalendarDays, Timer, Tags, Settings, Zap, Globe, FileText, CheckCircle2 } from "lucide-react";

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
    navigation: string;
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
      overview: "The Workspace Management module is the core structural spine of the platform. Workspaces represent overarching projects or departments, and can be nested infinitely using Subworkspaces (Parent-Child relationships). By mastering this module, you will understand how to encapsulate tasks, sprints, and permissions to keep enterprise data isolated and organized.",
      navigation: "Main Sidebar > Core Operations > Workspaces",
      prerequisites: [
        "A valid User Account.",
        "WORKSPACES_VIEW permission.",
        "(Optional) WORKSPACES_CREATE permission to follow along with creation."
      ]
    },
    fields: [
      { name: "Workspace Name", type: "Text Input", description: "The descriptive title of your workspace. Should be concise and easily identifiable across the organization.", isRequired: true },
      { name: "Parent Workspace (Subworkspace)", type: "Dropdown", description: "Links this workspace as a child under a larger Parent Workspace, allowing you to create complex hierarchical project trees.", isRequired: false },
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
      { action: "Database Insertion", outcome: "A new row is created in the workspaces table.", technicalDetail: "Executes an insert into public.workspaces. The ID is a generated UUIDv4." },
      { action: "Membership Binding", outcome: "Selected users are added to the workspace.", technicalDetail: "Inserts records into workspace_members linking user UUIDs to the workspace UUID." },
      { action: "Background Notifications", outcome: "Assigned users receive an alert.", technicalDetail: "The system dispatches asynchronous notifications to all members." }
    ]
  },
  {
    id: "subworkspaces",
    title: "Subworkspace Organization",
    description: "Learn how to nest departments and isolated project teams under a master Workspace.",
    icon: FolderKanban,
    startInfo: {
      overview: "Subworkspaces are fully functional Workspaces that are hierarchically linked to a Parent Workspace. They allow massive enterprise structures to be broken down cleanly (e.g. 'Engineering' parent, with 'Frontend', 'Backend', and 'DevOps' subworkspaces).",
      navigation: "Main Sidebar > Core Operations > Workspaces > [Open Workspace] > Create Subworkspace",
      prerequisites: [
        "WORKSPACES_CREATE permission.",
        "An existing Parent Workspace."
      ]
    },
    fields: [
      { name: "Subworkspace Name", type: "Text Input", description: "The descriptive title of your sub-department or project phase.", isRequired: true },
      { name: "Parent Workspace", type: "Dropdown", description: "The overarching workspace that this entity reports to.", isRequired: true },
      { name: "Inherit Members", type: "Toggle", description: "Automatically grant access to all members from the Parent Workspace.", isRequired: false },
    ],
    steps: [
      { title: "Navigate to Parent", instruction: "Open the existing Workspace that will act as the parent." },
      { title: "Initiate Child Creation", instruction: "Click the 'Create Subworkspace' button." },
      { title: "Define Hierarchy", instruction: "Ensure the Parent Workspace dropdown is accurately mapped." },
      { title: "Submit", instruction: "Click Save. The Subworkspace will now appear nested under its parent in the master hierarchy." }
    ],
    results: [
      { action: "Foreign Key Linking", outcome: "The parent_workspace_id is populated.", technicalDetail: "The database links the child record to the parent, establishing a recursive hierarchy." },
      { action: "Tree Navigation", outcome: "The sidebar UI updates.", technicalDetail: "The recursive tree components dynamically fetch and render the new child nodes." }
    ]
  },
  {
    id: "tasks",
    title: "Task Lifecycle & Execution",
    description: "Master the creation, tracking, and resolution of granular tasks within workspaces.",
    icon: Ticket,
    startInfo: {
      overview: "Tasks are the granular units of work in the system. This module covers how to document work, assign executors, set priorities, and transition tasks through their lifecycle until completion. Tasks can also be broken down into Subtasks (Parent-Child relationships) to divide massive items into bite-sized actionable pieces.",
      navigation: "Main Sidebar > Core Operations > Workspaces > [Select a Workspace] > Tasks",
      prerequisites: [
        "Access to at least one active Workspace.",
        "Basic understanding of the Workspace module."
      ]
    },
    fields: [
      { name: "Subject/Title", type: "Text Input", description: "The headline of the task. Keep it actionable and clear.", isRequired: true },
      { name: "Parent Task (Subtask)", type: "Dropdown", description: "Select an existing task to link this one as a child/subtask. Perfect for breaking down epics.", isRequired: false },
      { name: "Description", type: "Rich Text", description: "Detailed context, acceptance criteria, and technical notes.", isRequired: false },
      { name: "Priority", type: "Dropdown", description: "Urgency level (e.g., High, Medium, Low) which directly affects SLA calculations and routing.", isRequired: true },
      { name: "Participants", type: "Multi-Select", description: "Executors (doers), Reviewers (approvers), and Watchers (observers).", isRequired: false },
      { name: "Checklist", type: "Dynamic List", description: "Sub-items that must be checked off before the task is considered completely done.", isRequired: false },
      { name: "Tags & Labels", type: "Multi-Select", description: "Custom tags used for cross-workspace categorization, searching, and filtering (e.g., 'Bug', 'Frontend', 'Urgent').", isRequired: false },
    ],
    steps: [
      { title: "Open a Workspace", instruction: "Navigate to a specific Workspace to see its Task Board or List view." },
      { title: "Create Task", instruction: "Click the '+ Task' button to open the task creation drawer." },
      { title: "Define Scope", instruction: "Enter the Subject and comprehensive Description, and apply relevant Tags for categorization." },
      { title: "Assign Roles", instruction: "Add an Executor so someone is responsible for the work, and a Reviewer for quality assurance." },
      { title: "Transition Status", instruction: "Once created, open the task and use the Status Dropdown to move it from 'NEW' to 'IN PROGRESS', and eventually 'CLOSED'." }
    ],
    results: [
      { action: "Task Record Creation", outcome: "The task appears on the board.", technicalDetail: "A row is inserted into the tasks table with a default status mapping to 'NEW'." },
      { action: "Role Distribution", outcome: "Participants are assigned.", technicalDetail: "Rows are added to task_participants mapped to specific roles (EXECUTOR, WATCHER)." },
      { action: "Activity Audit Log", outcome: "A history trail is started.", technicalDetail: "Status changes and creations trigger entries in the task_activity_logs table for compliance tracking." }
    ]
  },
  {
    id: "subtasks",
    title: "Subtask Decomposition",
    description: "Break down massive Epics or user stories into bite-sized, executable pieces.",
    icon: Ticket,
    startInfo: {
      overview: "While Tasks represent deliverable units of work, sometimes a Task is too complex for a single executor. Subtasks allow you to split a parent task into distinct child components, which can be assigned to different executors and tracked independently.",
      navigation: "Workspace > Tasks > [Open Task Drawer] > Subtasks Tab",
      prerequisites: [
        "An existing Parent Task."
      ]
    },
    fields: [
      { name: "Subtask Title", type: "Text Input", description: "The specific sub-component being worked on.", isRequired: true },
      { name: "Executor", type: "Dropdown", description: "The user specifically responsible for this sub-slice of work.", isRequired: false },
      { name: "Parent Task Link", type: "System Field", description: "Automatically mapped to the task you created this from.", isRequired: true },
    ],
    steps: [
      { title: "Open Parent Task", instruction: "Click on an existing epic or complex task." },
      { title: "Navigate to Subtasks", instruction: "Click the 'Subtasks' tab inside the task drawer." },
      { title: "Create Child", instruction: "Click 'Add Subtask', assign it to an executor, and give it a title." },
      { title: "Track Progress", instruction: "Subtasks can be transitioned through statuses independently of the parent task." }
    ],
    results: [
      { action: "Parent Linking", outcome: "A new task is created and bound to the parent.", technicalDetail: "A row is inserted into the tasks table with parent_task_id set." },
      { action: "Rollup Calculations", outcome: "Progress is rolled up.", technicalDetail: "The parent task visually indicates how many of its child subtasks are completed." }
    ]
  },
  {
    id: "sprints",
    title: "Agile Sprint Planning",
    description: "Learn how to timebox your work using Agile Sprints for focused execution.",
    icon: CalendarDays,
    startInfo: {
      overview: "Sprints help teams execute a focused subset of tasks over a specific time period (usually 1-4 weeks). This prevents the team from being overwhelmed by the master backlog and ensures consistent delivery cadence.",
      navigation: "Main Sidebar > Core Operations > Workspaces > [Select a Workspace] > Sprint Planning",
      prerequisites: [
        "A Workspace with active tasks in the backlog.",
        "WORKSPACES_MANAGE or equivalent permissions to create a Sprint."
      ]
    },
    fields: [
      { name: "Sprint Name", type: "Text Input", description: "The identifier for the sprint (e.g., 'Sprint 12', 'Q3 Launch').", isRequired: true },
      { name: "Start/End Date", type: "Date Picker", description: "The exact timeframe during which the tasks must be completed.", isRequired: true },
      { name: "Goal", type: "Text Area", description: "The overarching objective of this sprint iteration.", isRequired: false },
    ],
    steps: [
      { title: "Navigate to Sprint Planning", instruction: "Open your workspace and click the 'Sprint Planning' tab." },
      { title: "Create a Sprint", instruction: "Click 'New Sprint', give it a name, and set the duration." },
      { title: "Groom Backlog", instruction: "Review tasks in the backlog and ensure they have accurate priorities and estimates." },
      { title: "Assign Tasks", instruction: "Drag tasks from your backlog into the active Sprint to commit them to this timebox." },
      { title: "Monitor Progress", instruction: "Use the Sprint Board to transition tasks across columns until the sprint concludes." }
    ],
    results: [
      { action: "Sprint Record", outcome: "A Sprint container is generated.", technicalDetail: "Inserted into the sprints table linked to the parent workspace." },
      { action: "Task Association", outcome: "Tasks are bound to the sprint.", technicalDetail: "The sprint_id foreign key is updated on the respective tasks rows." },
    ]
  },
  {
    id: "time-tracking",
    title: "Time Logging & Capacity",
    description: "Track actual hours spent on tasks versus estimates to measure team velocity.",
    icon: Timer,
    startInfo: {
      overview: "Time logging provides critical analytics for managers to understand where effort is being spent. By logging time, the system can calculate capacity, burn rates, and identify operational bottlenecks.",
      navigation: "Workspace > Tasks > [Open Task Drawer] > Time Tab",
      prerequisites: [
        "An assigned task in 'IN PROGRESS' status."
      ]
    },
    fields: [
      { name: "Hours", type: "Number Input", description: "The exact amount of time spent working during this specific session.", isRequired: true },
      { name: "Remarks", type: "Text Input", description: "A brief explanation of what was accomplished during these hours.", isRequired: false },
    ],
    steps: [
      { title: "Open a Task", instruction: "Click on any task to open its detail drawer." },
      { title: "Navigate to Time Tab", instruction: "Look for the 'Time' tab in the top navigation of the drawer." },
      { title: "Log Effort", instruction: "Enter your hours, provide a short note about the work done, and click 'Save Log'." },
      { title: "Review History", instruction: "The system aggregates your total hours and displays a historical log of every session." }
    ],
    results: [
      { action: "Time Entry", outcome: "The hours are added to the task total.", technicalDetail: "A row is inserted into task_time_logs containing the duration and the actor ID." },
      { action: "Capacity Calculation", outcome: "Dashboard metrics update automatically.", technicalDetail: "Aggregations run on the fly to compare logged time against estimated_hours." },
    ]
  },
  {
    id: "iam",
    title: "IAM & Security Governance",
    description: "Understand how Roles, Permissions, and Access Policies protect enterprise data.",
    icon: ShieldCheck,
    startInfo: {
      overview: "Identity and Access Management (IAM) controls who can see and do what in the platform. This module explains the Role-Based Access Control (RBAC) mapping and Row Level Security (RLS) layers which form the absolute security perimeter of the enterprise.",
      navigation: "Main Sidebar > Governance & Analysis > IAM Controls",
      prerequisites: [
        "SUPER_ADMIN or IAM_VIEW permissions.",
        "Understanding of organizational security policies."
      ]
    },
    fields: [
      { name: "Role Name", type: "Text Input", description: "The logical grouping of permissions (e.g., 'Project Manager').", isRequired: true },
      { name: "Permissions", type: "Checkbox Grid", description: "Granular capabilities (e.g., TASKS_VIEW, WORKSPACES_DELETE) granted to the role across all modules.", isRequired: true },
      { name: "User Assignment", type: "Dropdown", description: "Linking a user to a specific structural Role.", isRequired: true },
    ],
    steps: [
      { title: "Navigate to IAM", instruction: "Click 'IAM Controls' under 'Governance & Analysis'." },
      { title: "Review Roles", instruction: "View the list of existing Roles in the 'Role Builder' to understand current capability bundles." },
      { title: "Build a Role", instruction: "Click 'Create Role', give it a name, and toggle specific module permissions (e.g., enable Tasks Create, disable Settings Manage)." },
      { title: "Assign User Role", instruction: "Navigate to the Users tab, edit a profile, and change their assigned Role." },
      { title: "Manage Sessions", instruction: "Navigate to the Sessions tab to view active user logins and kill unauthorized sessions." }
    ],
    results: [
      { action: "Role Binding", outcome: "The user gets new capabilities.", technicalDetail: "Updates the role_id on the user_master table." },
      { action: "Snapshot Update", outcome: "Fast permissions are recalculated.", technicalDetail: "A database trigger automatically rebuilds the user_permissions_snapshot table for blazing fast RLS checks." },
      { action: "RLS Enforcement", outcome: "Subsequent queries are filtered.", technicalDetail: "Postgres Row Level Security uses has_permission_snapshot() to grant or deny access to rows dynamically." }
    ]
  },
  {
    id: "sla-governance",
    title: "SLA Governance & Routing",
    description: "Configure target response windows, working hours, and automated escalations.",
    icon: Zap,
    startInfo: {
      overview: "Service Level Agreements (SLAs) ensure that critical tickets and tasks are handled within a specific timeframe. This module teaches you how to define SLA Policies, link them to working hours, and automatically breach-track items.",
      navigation: "Main Sidebar > Governance & Analysis > SLA Rule Builder",
      prerequisites: [
        "SUPER_ADMIN or SLA_MANAGE permissions."
      ]
    },
    fields: [
      { name: "Policy Name", type: "Text Input", description: "Name of the SLA policy (e.g. Critical Outage).", isRequired: true },
      { name: "Response Target", type: "Number Input", description: "Minutes allowed before first response.", isRequired: true },
      { name: "Resolution Target", type: "Number Input", description: "Minutes allowed before total resolution.", isRequired: true },
      { name: "Working Hours Code", type: "Dropdown", description: "Links to business schedules (e.g. 24x7 or 9x5) to accurately pause timers on weekends.", isRequired: true },
      { name: "Escalation Level", type: "Dropdown", description: "Defines the severity of the alert if breached.", isRequired: true },
    ],
    steps: [
      { title: "Navigate to SLA Builder", instruction: "Click 'SLA Rule Builder' in the sidebar." },
      { title: "Create Policy", instruction: "Click 'Create Policy' and define the Response/Resolution minutes." },
      { title: "Assign Schedule", instruction: "Select a Working Hours Code so the system knows when to pause the countdown." },
      { title: "Define Holidays", instruction: "Navigate to the Holiday Calendar and add regional holidays to prevent false breaches." }
    ],
    results: [
      { action: "Policy Generation", outcome: "SLA Policy is saved.", technicalDetail: "Inserted into ticket_sla_policies table." },
      { action: "Tracker Instantiation", outcome: "When a ticket is created, an SLA timer starts.", technicalDetail: "A row in ticket_sla_trackers is bound to the ticket, calculating breach times based on the policy." },
    ]
  },
  {
    id: "ticket-automations",
    title: "Ticket Automations (IFTTT)",
    description: "Build logic triggers to automatically assign, tag, and escalate tickets without human intervention.",
    icon: Settings,
    startInfo: {
      overview: "Automations remove manual triage by using 'If-This-Then-That' (IFTTT) logic. When a ticket meets specific conditions, the engine executes predefined actions immediately.",
      navigation: "Main Sidebar > Settings > Automations",
      prerequisites: [
        "SUPER_ADMIN permissions."
      ]
    },
    fields: [
      { name: "Rule Name", type: "Text Input", description: "The identifier for the automation.", isRequired: true },
      { name: "Conditions (WHEN)", type: "Logic Builder", description: "The trigger criteria (e.g. Field: Priority, Operator: Equals, Value: High).", isRequired: true },
      { name: "Actions (THEN)", type: "Logic Builder", description: "The execution command (e.g. Assign to Group: Network Ops).", isRequired: true },
    ],
    steps: [
      { title: "Navigate to Automations", instruction: "Open Settings and select Automations." },
      { title: "Create Rule", instruction: "Click 'Create Rule' and give it a descriptive name." },
      { title: "Set Conditions", instruction: "Add one or more conditions (e.g. Category == Security)." },
      { title: "Set Actions", instruction: "Add the corresponding actions (e.g. Set SLA == Critical)." },
      { title: "Activate", instruction: "Toggle the rule to Active and Save." }
    ],
    results: [
      { action: "Event Hook", outcome: "The automation listens to database events.", technicalDetail: "When a ticket is created/updated, the automation engine evaluates the JSON logic." },
      { action: "Execution", outcome: "The ticket is modified instantly.", technicalDetail: "Automated updates are applied to the ticket record before it even hits the agent's queue." },
    ]
  },
  {
    id: "knowledge-base",
    title: "Knowledge Base Authoring",
    description: "Draft, format, and publish support articles to the self-service portal.",
    icon: FileText,
    startInfo: {
      overview: "The Knowledge Base is your organization's brain. Agents use it to document solutions, policies, and FAQs. Published articles deflect tickets by empowering users to help themselves.",
      navigation: "Main Sidebar > Support Hub > Knowledge Base",
      prerequisites: [
        "KB_MANAGE or SUPER_ADMIN permissions."
      ]
    },
    fields: [
      { name: "Article Title", type: "Text Input", description: "The main headline of the document.", isRequired: true },
      { name: "Category", type: "Dropdown", description: "Logical grouping (e.g. IT Support, HR Policies).", isRequired: true },
      { name: "Search Tags", type: "Text Input", description: "Comma-separated keywords for the search engine.", isRequired: false },
      { name: "Content", type: "Rich Text Editor", description: "The main body of the article, supporting images, lists, and formatting.", isRequired: true },
      { name: "Status", type: "Toggle", description: "Draft (Hidden) or Published (Live).", isRequired: true },
    ],
    steps: [
      { title: "Navigate to Authoring", instruction: "Click 'Knowledge Base' in the Support Hub." },
      { title: "Draft Content", instruction: "Click 'New Article', provide a title, category, and write your content in the Rich Text Editor." },
      { title: "Live Preview", instruction: "Click 'Live Preview' to see exactly how it will render for end users." },
      { title: "Publish", instruction: "Change the status to 'Published' and hit Save." }
    ],
    results: [
      { action: "Article Storage", outcome: "The article is saved in the database.", technicalDetail: "The HTML payload from React-Quill is sanitized and stored." },
      { action: "Search Indexing", outcome: "The article becomes searchable.", technicalDetail: "Tags and Title are indexed for rapid retrieval in the Self-Service Portal." },
    ]
  }
];
