import { 
  Compass, 
  FolderKanban, 
  Ticket, 
  FileCheck2, 
  Car, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Database, 
  Layers, 
  ArrowRight, 
  Workflow, 
  GitFork, 
  Zap, 
  Activity, 
  BookOpen, 
  Key, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Boxes
} from "lucide-react";

// ==============================================================================
// Types for Module Learning, CRUD, Field Dictionary & Architecture Dependencies
// ==============================================================================

export type ModuleDependency = {
  sourceModuleId: string;
  sourceModuleName: string;
  targetModuleId: string;
  targetModuleName: string;
  relationshipType: "PROVIDES_DATA_TO" | "TRIGGERS_ACTION_IN" | "ENFORCES_GOVERNANCE_ON" | "SYNCS_METRICS_TO";
  dataTransferred: string;
  impactOnSourceChange: string;
  impactOnTargetChange: string;
};

export type LearningModuleField = {
  name: string;
  dbColumn: string;
  type: "Text" | "Number" | "Dropdown" | "Multi-Select" | "Date" | "Boolean" | "File / URL" | "JSON / Object" | "UUID / FK";
  isRequired: boolean;
  validationRules?: string;
  description: string;
  purpose: string;
  foreignKeyRelation?: string;
};

export type CrudOperationSpec = {
  operation: "CREATE" | "READ" | "UPDATE" | "DELETE";
  code: "C" | "R" | "U" | "D";
  title: string;
  overview: string;
  navigationPath: string;
  whoCanPerform: string[];
  requiredInputs: string[];
  systemMutations: string[];
  safetyAndCascadeRules: string;
};

export type LearningModuleStep = {
  title: string;
  instruction: string;
  technicalNote?: string;
};

export type LearningModuleResult = {
  action: string;
  outcome: string;
  technicalDetail: string;
};

export type LearningModule = {
  id: string;
  code: string;
  title: string;
  category: "CORE_OPS" | "ENGINEERING" | "GOVERNANCE" | "FLEET";
  description: string;
  icon: any;
  businessPurpose: string;
  databaseTables: string[];
  inflowFromModules: string[];
  outflowToModules: string[];
  rippleImpactSummary: string;
  startInfo: {
    overview: string;
    navigation: string;
    prerequisites: string[];
  };
  crudOperations: CrudOperationSpec[];
  fields: LearningModuleField[];
  steps: LearningModuleStep[];
  results: LearningModuleResult[];
};

// ==============================================================================
// 1. Cross-Module Ecosystem Dependencies & Architecture Connections
// ==============================================================================

export const ecosystemDependencies: ModuleDependency[] = [
  {
    sourceModuleId: "iam_rbac",
    sourceModuleName: "IAM & Security Governance",
    targetModuleId: "task_workflow",
    targetModuleName: "Task & Ticket Management",
    relationshipType: "ENFORCES_GOVERNANCE_ON",
    dataTransferred: "User Profiles, Role Definitions, Department Scope, Ticket Scopes ([C][R][U][D][A][E])",
    impactOnSourceChange: "If a user is deactivated or role altered in IAM, the user is instantly barred from ticket reassignment, editing, or viewing restricted department tickets.",
    impactOnTargetChange: "Task module strictly enforces IAM policies on every server action and hides mutation triggers from unauthorized users."
  },
  {
    sourceModuleId: "iam_rbac",
    sourceModuleName: "IAM & Security Governance",
    targetModuleId: "design_tracking",
    targetModuleName: "Design & Tracking (CAD / Matrix)",
    relationshipType: "ENFORCES_GOVERNANCE_ON",
    dataTransferred: "Design Role Codes (DESIGN_ADMIN, CONSULTANT, SITE_ENGINEER, TPQA_AUDITOR), Project Scopes",
    impactOnSourceChange: "Deactivating a consultant user in IAM prevents them from uploading drawings, responding to RFIs, or viewing project transmittals.",
    impactOnTargetChange: "Design Tracking validates permissions before executing drawing reviews, transmittal dispatches, or master edits."
  },
  {
    sourceModuleId: "workspaces_masters",
    sourceModuleName: "Workspaces & Master Entities",
    targetModuleId: "task_workflow",
    targetModuleName: "Task & Ticket Management",
    relationshipType: "PROVIDES_DATA_TO",
    dataTransferred: "Workspace Hierarchy (Parent-Child trees), Company Master, Category tags",
    impactOnSourceChange: "Deleting or moving a Workspace reparents all nested subtasks and migrates ticket ownership scope.",
    impactOnTargetChange: "Tickets require a valid workspace_id foreign key to establish departmental boundaries."
  },
  {
    sourceModuleId: "requirements_module",
    sourceModuleName: "Requirements Planning & Approvals",
    targetModuleId: "task_workflow",
    targetModuleName: "Task & Ticket Management",
    relationshipType: "TRIGGERS_ACTION_IN",
    dataTransferred: "Approved Requirement Scope, Deliverables List, Target Due Dates, Attachments",
    impactOnSourceChange: "When a Requirement is Approved by the Leadership Committee, it triggers auto-generation of execution Tasks and assigns executors.",
    impactOnTargetChange: "Tasks created from Requirements maintain a back-link foreign key (requirement_id) for end-to-end traceability."
  },
  {
    sourceModuleId: "design_tracking",
    sourceModuleName: "Design & Tracking (CAD / Matrix)",
    targetModuleId: "task_workflow",
    targetModuleName: "Task & Ticket Management",
    relationshipType: "TRIGGERS_ACTION_IN",
    dataTransferred: "Look-Ahead Milestones (30/60/90 Day Deliverables), Clash RFIs, Expedited Escalations",
    impactOnSourceChange: "Expediting a Look-Ahead milestone or raising a site clash RFI can auto-generate high-priority support tickets for consultant resolution.",
    impactOnTargetChange: "Ticket closure updates RFI status in Design Tracking and unlocks drawing revision clearance."
  },
  {
    sourceModuleId: "vehicle_desk",
    sourceModuleName: "Vehicle Desk & Fleet Operations",
    targetModuleId: "task_workflow",
    targetModuleName: "Task & Ticket Management",
    relationshipType: "TRIGGERS_ACTION_IN",
    dataTransferred: "Vehicle Breakdowns, Service Requests, Fuel Over-Consumption Alerts, Incident Reports",
    impactOnSourceChange: "Flagging a vehicle breakdown or scheduled maintenance interval creates an urgent maintenance task assigned to Fleet Operations.",
    impactOnTargetChange: "Resolving the maintenance ticket clears the vehicle status back to 'Available' in the fleet pool."
  },
  {
    sourceModuleId: "amc_contracts",
    sourceModuleName: "AMC & Vendor Contracts",
    targetModuleId: "task_workflow",
    targetModuleName: "Task & Ticket Management",
    relationshipType: "TRIGGERS_ACTION_IN",
    dataTransferred: "Contract Expiration Reminders (30-day notice), Preventative Maintenance Schedules",
    impactOnSourceChange: "Approaching contract expirations trigger automated ticket generation for Procurement and Legal contract renewal.",
    impactOnTargetChange: "Tickets monitor renewal vendor negotiations and update contract end dates upon execution."
  },
  {
    sourceModuleId: "task_workflow",
    sourceModuleName: "Task & Ticket Management",
    targetModuleId: "sla_monitoring",
    targetModuleName: "SLA Monitoring & Governance",
    relationshipType: "SYNCS_METRICS_TO",
    dataTransferred: "Creation Timestamp, First Response Time, Stage Transitions, Priority, Resolution Timestamp",
    impactOnSourceChange: "Every status transition or delayed response triggers SLA recalculation; breaches escalate to Department Managers.",
    impactOnTargetChange: "SLA engine calculates operational health KPIs, compliance ratios, and escalation flags displayed across executive dashboards."
  }
];

// ==============================================================================
// 2. Comprehensive Module-by-Module Dictionaries & CRUD Specifications
// ==============================================================================

export const learningModules: LearningModule[] = [
  // ----------------------------------------------------------------------------
  // MODULE 1: DESIGN & TRACKING
  // ----------------------------------------------------------------------------
  {
    id: "design_tracking",
    code: "DESIGN_TRACKING",
    title: "Design & Tracking (CAD & Tender Tracker)",
    category: "ENGINEERING",
    description: "End-to-end design governance, 3D/CAD drawing register, consultant tracking, statutory clearance liaisoning, and GFC transmittals.",
    icon: Compass,
    businessPurpose: "Ensures site contractors receive verified Good-for-Construction (GFC) drawings without delays, prevents multi-disciplinary clashes (ARCH vs STR vs MEP), tracks municipal approvals (MCGM, Fire, RERA), and holds external consultant firms accountable to SLA delivery dates.",
    databaseTables: [
      "design_projects",
      "design_towers",
      "design_packages",
      "design_sub_packages",
      "design_consultants",
      "design_statutory_authorities",
      "design_statutory_clearances",
      "design_matrix_entries",
      "design_look_aheads",
      "design_drawings",
      "design_drawing_revisions",
      "design_transmittals",
      "design_rfis",
      "design_matrix_audit_logs"
    ],
    inflowFromModules: [
      "IAM & Security Governance (User credentials, RBAC matrix, Consultant partner profiles)",
      "Workspaces & Master Entities (Top-level company & corporate division mapping)"
    ],
    outflowToModules: [
      "Task & Ticket Management (Clash RFIs & Expedited milestone escalation tickets)",
      "SLA Monitoring (Consultant drawing turnaround TAT and milestone delay tracking)",
      "System Audit Logs (Tamper-evident log of all GFC approvals and revisions)"
    ],
    rippleImpactSummary: "Modifying project structures, tower configurations, or package masters automatically cascades through the entire design matrix grid. Deleting a master requires referential integrity verification to prevent orphaned drawings or transmittal records.",
    startInfo: {
      overview: "The Design & Tracking module is organized into 5 core operational tabs: (1) Tender Design Matrix Grid, (2) Look-Ahead 30/60/90-Day Milestones, (3) Statutory Clearances Liaisoning, (4) Drawing Register & Multi-Revision Vault, and (5) Transmittals & Site RFI Logs.",
      navigation: "Main Navigation > Design & Tracking (/design)",
      prerequisites: [
        "DESIGN_VIEW permission or DESIGN_ADMIN / DESIGN_LEAD / CONSULTANT role.",
        "Pre-configured Category / Discipline Masters (ARCH, STR, MEP, FAC, LAND).",
        "Active Project and Tower records in Master Store."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "Master & Transaction Creation",
        overview: "Create new Projects, Towers/Wings, Sub-Packages, Consultants, Authorities, Drawings, Transmittals, or RFIs.",
        navigationPath: "Design Tracking > Masters Manager > '+ New Master' OR Drawing Register > '+ Upload Drawing'",
        whoCanPerform: ["SUPER_ADMIN", "DESIGN_ADMIN", "DESIGN_LEAD", "CONSULTANT (Drawings/RFIs only)"],
        requiredInputs: ["Entity Code / Name", "Discipline / Category Tag", "Assigned Project ID", "Target Date / SLA"],
        systemMutations: [
          "Inserts row into corresponding PostgreSQL table (e.g. design_projects, design_drawings).",
          "Calculates initial revision 'R0' for drawings.",
          "Generates dynamic matrix cell entries for all towers matching the package.",
          "Logs action 'CREATE' in design_matrix_audit_logs."
        ],
        safetyAndCascadeRules: "Duplicate codes (e.g. duplicate drawing code or sub-package code) are rejected by unique constraints."
      },
      {
        operation: "READ",
        code: "R",
        title: "Matrix Viewing & Filter Queries",
        overview: "View real-time matrix status grids, search drawing files, inspect revision history, and download PDF/DWG assets.",
        navigationPath: "Design Tracking > Matrix View / Drawings / Look-Ahead",
        whoCanPerform: ["ALL Authenticated Design Roles with Read Scope (DESIGN_ADMIN, CONSULTANT, SITE_ENGINEER, VIEWER)"],
        requiredInputs: ["Filter: Project (or ALL)", "Filter: Discipline (ARCH/STR/MEP)", "Search Keyword"],
        systemMutations: [
          "Executes fetchFullDesignTrackingState() Server Action with RLS filtering.",
          "Hydrates in-memory DesignMasterStore with live database state."
        ],
        safetyAndCascadeRules: "Consultant users only see projects and drawings explicitly tagged to their organization."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "Status Transitions & GFC Approvals",
        overview: "Update matrix cell statuses (Pending -> In Progress -> Received), approve drawings as GFC, resolve site RFIs, or expedite milestones.",
        navigationPath: "Design Tracking > Matrix Cell Click OR Drawing Details > 'Approve as GFC' / 'Request Revision'",
        whoCanPerform: ["DESIGN_ADMIN", "DESIGN_LEAD", "PEER_REVIEWER", "TPQA_AUDITOR"],
        requiredInputs: ["New Status / Decision", "Approved Date (if GFC)", "Review Comments / Clarification text"],
        systemMutations: [
          "Updates target row with new status and updated_at timestamp.",
          "If stamped GFC, flags is_gfc=true and enables Transmittal Slip creation.",
          "Dispatches async server action saveMatrixEntryAction / saveDrawingAction.",
          "Logs action 'UPDATE' or 'STATUS_CHANGE' in design_matrix_audit_logs."
        ],
        safetyAndCascadeRules: "Only Design Admin / Lead can approve GFC. Site Engineers and Viewers have read-only access to approval triggers."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "Master Deletion & Foreign Key Cascades",
        overview: "Safely remove obsolete masters or draft items with automatic referential integrity validation.",
        navigationPath: "Design Tracking > Masters > Trash / Delete Icon",
        whoCanPerform: ["SUPER_ADMIN", "DESIGN_ADMIN"],
        requiredInputs: ["Target Entity ID", "Confirmation of Dependent Impact"],
        systemMutations: [
          "Evaluates getEntityDependencies() to count linked drawings, transmittals, and matrix cells.",
          "If confirmed, deletes dependent matrix records or cascades cleanly.",
          "Dispatches deleteProjectAction / deleteTowerAction / deletePackageAction.",
          "Logs action 'CASCADE_DELETE' in design_matrix_audit_logs."
        ],
        safetyAndCascadeRules: "Entities referenced by active Good-for-Construction (GFC) transmittals cannot be deleted without superseding the transmittal first."
      }
    ],
    fields: [
      { name: "Project Name", dbColumn: "name", type: "Text", isRequired: true, description: "Official corporate name of the real estate project (e.g. Chandak GreenAir).", purpose: "Top-level grouping for all towers, drawings, and approvals.", foreignKeyRelation: "design_projects.id" },
      { name: "Project Code", dbColumn: "code", type: "Text", isRequired: true, validationRules: "Unique uppercase string (e.g. PRJ-GRN)", description: "Unique short alphanumeric identifier for indexing.", purpose: "Prefix for all drawings and transmittals." },
      { name: "Tower / Wing Name", dbColumn: "tower_name", type: "Text", isRequired: true, description: "Specific building or phase (e.g. Tower A - Sale, Rehab Wing).", purpose: "Enables wing-level tracking since construction progresses independently per tower.", foreignKeyRelation: "design_towers.id" },
      { name: "Discipline", dbColumn: "discipline", type: "Dropdown", isRequired: true, validationRules: "Must match PackageMaster (ARCH, STR, MEP, FAC, LAND, INT, FIRE)", description: "Core engineering classification.", purpose: "Filters drawings and assigns domain lead reviewers." },
      { name: "Sub-Package Deliverable", dbColumn: "sub_package_name", type: "Text", isRequired: true, description: "Granular engineering milestone (e.g. Structural Foundation, HVAC Chillers).", purpose: "Forms the matrix rows." },
      { name: "Consultant Firm", dbColumn: "firm_name", type: "Dropdown", isRequired: true, description: "Third-party architecture or engineering company name.", purpose: "Tracks SLA submission dates and drawing upload permissions.", foreignKeyRelation: "design_consultants.id" },
      { name: "Matrix Cell Status", dbColumn: "status", type: "Dropdown", isRequired: true, validationRules: "'Received' | 'In progress' | 'Pending' | 'Target Date' | 'NA' | 'Under Review'", description: "Current deliverable lifecycle status.", purpose: "Color-codes the executive tracking matrix." },
      { name: "Planned Target Date", dbColumn: "planned_date", type: "Date", isRequired: true, description: "Contractual deadline for consultant submission.", purpose: "Monitors delay variance and SLA adherence." },
      { name: "Actual Release Date", dbColumn: "actual_date", type: "Date", isRequired: false, description: "Date GFC drawing was formally cleared.", purpose: "Calculates total turnaround duration (TAT)." },
      { name: "Drawing Code / Sheet No", dbColumn: "code", type: "Text", isRequired: true, validationRules: "Unique string (e.g. DWG-CK-STR-101)", description: "Official CAD drawing sheet number.", purpose: "Unique blueprint identifier for site contractors." },
      { name: "Drawing Revision", dbColumn: "current_revision", type: "Text", isRequired: true, validationRules: "R0, R1, R2, etc.", description: "Current version of the blueprint.", purpose: "Ensures site teams only build using the latest approved revision." },
      { name: "Is GFC (Good for Construction)", dbColumn: "is_gfc", type: "Boolean", isRequired: true, description: "Flag indicating whether drawing is stamped for site execution.", purpose: "Prerequisite for GFC Transmittal Slips." },
      { name: "Transmittal Slip Number", dbColumn: "transmittal_number", type: "Text", isRequired: true, validationRules: "Unique string (e.g. TR-CK-2026-004)", description: "Formal dispatch notice identifier.", purpose: "Contractual proof of blueprint handover to contractor." },
      { name: "RFI Subject & Clash Query", dbColumn: "query_description", type: "Text", isRequired: true, description: "Site engineer's description of physical clash on field.", purpose: "Requests consultant clarification or revised drawing." }
    ],
    steps: [
      { title: "Step 1: Configure Disciplines & Sub-Packages", instruction: "Define engineering categories (Architectural, Structural, MEP) and granular deliverables (Piling, Core Walls, HVAC)." },
      { title: "Step 2: Onboard Consultants & Authorities", instruction: "Create consultant partner profiles and add statutory regulatory bodies (MCGM, CFO, SRA, RERA)." },
      { title: "Step 3: Setup Project & Towers", instruction: "Add the master project and configure all towers/wings with floor heights and completion dates." },
      { title: "Step 4: Assign Consultants & Target SLA Dates", instruction: "Fill matrix cells with assigned consultant firms and contractual submission deadlines." },
      { title: "Step 5: Review Uploaded Drawings & Issue GFC Transmittals", instruction: "Consultants upload blueprints; design leads approve as GFC and generate formal dispatch slips for site contractors." }
    ],
    results: [
      { action: "Matrix Generation", outcome: "Project × Tower × Sub-Package grid auto-populates.", technicalDetail: "Executes saveBatchMatrixEntriesAction to Supabase design_matrix_entries." },
      { action: "GFC Stamping", outcome: "Drawing stamped 'Approved (GFC)' and locked for revisions.", technicalDetail: "Updates design_drawings.is_gfc = true and dispatches realtime notifications to Site Engineers." },
      { action: "Tamper-Proof Audit Logging", outcome: "All edits recorded with timestamp and user ID.", technicalDetail: "Appends row to design_matrix_audit_logs with foreign key cascade tracking." }
    ]
  },

  // ----------------------------------------------------------------------------
  // MODULE 2: TASK & TICKET WORKFLOW
  // ----------------------------------------------------------------------------
  {
    id: "task_workflow",
    code: "TASK_WORKFLOW",
    title: "Task & Ticket Management",
    category: "CORE_OPS",
    description: "Core collaborative engine for operational ticketing, task lifecycle management, checklists, assignees, and resolution workflows.",
    icon: Ticket,
    businessPurpose: "Acts as the central work orchestration platform where tickets, issues, change requests, and department deliverables are assigned, tracked against SLAs, and resolved with mandatory attachment verifications.",
    databaseTables: [
      "tickets",
      "ticket_assignments",
      "ticket_subtasks",
      "ticket_checklists",
      "ticket_attachments",
      "ticket_resolution_files",
      "ticket_audit_logs"
    ],
    inflowFromModules: [
      "IAM & Security Governance (Assignees, Primary Executors, Role Permissions)",
      "Workspaces & Master Entities (Workspace boundaries, Project departments)",
      "Requirements Planning (Approved requirements auto-spawn execution tasks)",
      "Vehicle Desk & Design Tracking (Incident tickets, breakdown tasks, RFI escalations)"
    ],
    outflowToModules: [
      "SLA Monitoring (Response time, Stage timers, Escalation thresholds)",
      "AMC & Vendor Contracts (Preventative maintenance task completions)",
      "Executive Dashboards (Burndown charts, TAT metrics, Bottleneck analytics)"
    ],
    rippleImpactSummary: "Closing or reassigning a ticket updates SLA counters, triggers notifications to stakeholders, and unblocks linked parent requirements or vehicle maintenance records.",
    startInfo: {
      overview: "Tickets represent work units that transition across standardized stages: Backlog -> In Progress -> Under Review -> Completed / Resolved -> Closed.",
      navigation: "Main Navigation > Core Operations > Ticket Tracking (/tickets)",
      prerequisites: [
        "TICKETS_VIEW permission.",
        "Active Workspace membership.",
        "Assigned User profile in IAM."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "Ticket Creation",
        overview: "Raise a new operational task or support ticket with priority, due date, category, and multi-file attachments.",
        navigationPath: "Tickets > '+ New Ticket' OR Global Navbar '+' Button",
        whoCanPerform: ["ALL Authenticated Users with TICKETS_CREATE permission"],
        requiredInputs: ["Title", "Workspace ID", "Category / Type", "Priority (Low/Medium/High/Urgent)", "Due Date"],
        systemMutations: [
          "Inserts record into public.tickets table.",
          "Generates unique human-readable ticket code (e.g. TCK-2026-0891).",
          "Binds initial Primary Assignee and secondary Executors in ticket_assignments.",
          "Starts SLA response timer in background."
        ],
        safetyAndCascadeRules: "Uploaded files must provide instant in-browser Preview and Download capabilities before submission."
      },
      {
        operation: "READ",
        code: "R",
        title: "Ticket Listing & Kanban View",
        overview: "Inspect ticket portfolios, filter by Assignee/Status/Priority/Workspace, and search ticket content.",
        navigationPath: "Tickets > List View / Kanban Board / Calendar View",
        whoCanPerform: ["Users with TICKETS_VIEW permission, scoped by IAM ticketAccessScope"],
        requiredInputs: ["Workspace Scope", "Status Filter", "Pagination Offset"],
        systemMutations: ["Queries tickets table joined with workspace_members and ticket_assignments."],
        safetyAndCascadeRules: "Users with 'ASSIGNED_ONLY' scope cannot view tickets belonging to other team members."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "Status Transitions & Resolution Files",
        overview: "Progress tickets through lifecycle stages, add checklist items, reassign executors, and attach completion evidence.",
        navigationPath: "Ticket Details View > Status Dropdown / Assignee Controller",
        whoCanPerform: ["Primary Assignee", "Workspace Manager", "SUPER_ADMIN"],
        requiredInputs: ["Target Status", "Resolution Summary (when resolving)", "Mandatory Evidence Document"],
        systemMutations: [
          "Updates status, stage_entered_at, and resolution_notes in tickets table.",
          "Uploads proof files to resolution-files storage bucket and records in ticket_resolution_files.",
          "Records full state diff in ticket_audit_logs."
        ],
        safetyAndCascadeRules: "Non-owners and spectator roles are strictly prevented from altering status or assignees."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "Ticket Deletion & Archival",
        overview: "Soft delete or archive cancelled/duplicate tickets.",
        navigationPath: "Ticket Details > Actions > 'Delete Ticket'",
        whoCanPerform: ["Workspace Manager", "SUPER_ADMIN (TICKETS_DELETE permission required)"],
        requiredInputs: ["Ticket ID", "Deletion Reason"],
        systemMutations: [
          "Sets is_deleted = true or moves to compliance trash bin.",
          "Preserves audit log and resolution attachments for compliance."
        ],
        safetyAndCascadeRules: "Tickets tied to active billing contracts or legal requirements cannot be hard-deleted."
      }
    ],
    fields: [
      { name: "Ticket Code", dbColumn: "code", type: "Text", isRequired: true, validationRules: "Auto-generated unique string", description: "Unique tracking code (e.g. TCK-2026-042).", purpose: "Universal reference identifier." },
      { name: "Title", dbColumn: "title", type: "Text", isRequired: true, description: "Short, descriptive summary of the work item.", purpose: "Identifies work in lists and notifications." },
      { name: "Description", dbColumn: "description", type: "Text", isRequired: false, description: "Detailed specification, instructions, or error report.", purpose: "Provides full context to the assigned executor." },
      { name: "Workspace", dbColumn: "workspace_id", type: "Dropdown", isRequired: true, description: "Project or department boundary.", purpose: "Enforces data isolation and member access.", foreignKeyRelation: "workspaces.id" },
      { name: "Priority", dbColumn: "priority", type: "Dropdown", isRequired: true, validationRules: "'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'", description: "Urgency level.", purpose: "Determines SLA response and resolution deadlines." },
      { name: "Status", dbColumn: "status", type: "Dropdown", isRequired: true, validationRules: "'BACKLOG' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED'", description: "Current stage in execution pipeline.", purpose: "Drives Kanban boards and SLA timers." },
      { name: "Primary Assignee", dbColumn: "primary_assignee_id", type: "Dropdown", isRequired: true, description: "User primarily responsible for completing the ticket.", purpose: "Ownership accountability.", foreignKeyRelation: "users.id" },
      { name: "Due Date", dbColumn: "due_date", type: "Date", isRequired: false, description: "Target completion deadline.", purpose: "Flags overdue tickets on dashboards." },
      { name: "Resolution Proof File", dbColumn: "file_url", type: "File / URL", isRequired: false, description: "Completion evidence (photo, signed report, PDF).", purpose: "Guarantees zero blind task closures." }
    ],
    steps: [
      { title: "Step 1: Open Ticket Creation Wizard", instruction: "Click '+ New Ticket' and select the target Workspace." },
      { title: "Step 2: Define Scope & Priority", instruction: "Set title, description, priority, and assign Primary Assignee." },
      { title: "Step 3: Attach Reference Files", instruction: "Upload reference specifications; verify in-browser preview." },
      { title: "Step 4: Execute & Track", instruction: "Move status to 'In Progress', check off subtasks, and add progress comments." },
      { title: "Step 5: Resolve with Proof", instruction: "Upload completion evidence, input resolution notes, and mark 'Completed'." }
    ],
    results: [
      { action: "Creation", outcome: "Ticket generated with unique code and active SLA timer.", technicalDetail: "Inserted into tickets table and dispatched to assigned user inbox." },
      { action: "Stage Movement", outcome: "Audit trail records stage timestamp.", technicalDetail: "Logs stage_duration_seconds for SLA analytics." }
    ]
  },

  // ----------------------------------------------------------------------------
  // MODULE 3: REQUIREMENTS PLANNING & APPROVALS
  // ----------------------------------------------------------------------------
  {
    id: "requirements_module",
    code: "REQUIREMENTS",
    title: "Requirements Planning & Approvals",
    category: "CORE_OPS",
    description: "Structured scope definition, multi-tier stakeholder approval workflows, and automated task conversion for large deliverables.",
    icon: FileCheck2,
    businessPurpose: "Eliminates scope creep by requiring formal justification, budget allocation, and multi-sign-off approval (HOD -> Finance -> VP) before operational tasks are launched.",
    databaseTables: [
      "requirements",
      "requirement_approvals",
      "requirement_deliverables",
      "requirement_attachments",
      "requirement_audit_logs"
    ],
    inflowFromModules: [
      "Workspaces & Master Entities (Department, Business Unit, Company allocation)",
      "IAM & Security Governance (Designated Approver Matrix, Department Heads)"
    ],
    outflowToModules: [
      "Task & Ticket Management (Auto-creates linked Tasks upon final approval)",
      "Executive Analytics (Capital expenditure and project pipeline forecasting)"
    ],
    rippleImpactSummary: "Approving or Rejecting a requirement triggers instant notifications to the creator and unlocks downstream task generation. Deleting a requirement cascades to its draft deliverables.",
    startInfo: {
      overview: "Requirements progress through: Draft -> Submitted for Review -> Approvals in Progress -> Approved -> Tasks Generated -> Completed.",
      navigation: "Main Navigation > Core Operations > Requirements (/requirements)",
      prerequisites: [
        "REQUIREMENTS_VIEW permission.",
        "Assigned Department Head / Approver Matrix."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "Requirement Proposal Creation",
        overview: "Draft a new business requirement with scope details, budget, estimated timeline, and required deliverables.",
        navigationPath: "Requirements > '+ New Requirement'",
        whoCanPerform: ["Project Leads, Department Managers (REQUIREMENTS_CREATE permission)"],
        requiredInputs: ["Requirement Title", "Business Justification", "Estimated Budget", "Target Due Date", "Deliverables List"],
        systemMutations: [
          "Inserts record into requirements table with status 'DRAFT'.",
          "Stores planned deliverables in requirement_deliverables.",
          "Attaches supporting documents in requirement_attachments."
        ],
        safetyAndCascadeRules: "Draft requirements can be edited freely; once submitted for approval, scope is locked."
      },
      {
        operation: "READ",
        code: "R",
        title: "Requirement Master & Approval Queues",
        overview: "Review submitted requirements, inspect business cases, and check multi-tier sign-off progress.",
        navigationPath: "Requirements > Master List / Approval Queue",
        whoCanPerform: ["Stakeholders, Approvers, and Users with REQUIREMENTS_VIEW permission"],
        requiredInputs: ["Status Filter", "Department Filter"],
        systemMutations: ["Queries requirements joined with requirement_approvals and approver user profiles."],
        safetyAndCascadeRules: "Approvers only see pending sign-off items in their approval queue."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "Multi-Tier Approval & Task Conversion",
        overview: "Approvers sign off or reject proposals with mandatory feedback. Final sign-off auto-generates tasks.",
        navigationPath: "Requirement Details > 'Approve Requirement' / 'Reject with Comments'",
        whoCanPerform: ["Designated Approvers in the requirement approval matrix"],
        requiredInputs: ["Approval Decision (APPROVED / REJECTED / CHANGES_REQUESTED)", "Digital Signature / Review Comments"],
        systemMutations: [
          "Updates requirement_approvals row for current approver.",
          "If final tier reached, transitions requirements.status to 'APPROVED'.",
          "Executes batch task creation in tickets table for every deliverable.",
          "Logs action in requirement_audit_logs."
        ],
        safetyAndCascadeRules: "Approvers cannot approve their own submitted requirements (Separation of Duties)."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "Requirement Cancellation",
        overview: "Cancel or delete obsolete draft requirements.",
        navigationPath: "Requirement Details > 'Cancel Requirement'",
        whoCanPerform: ["Creator (if Draft), SUPER_ADMIN"],
        requiredInputs: ["Requirement ID", "Cancellation Justification"],
        systemMutations: ["Soft deletes requirement and linked draft approval records."],
        safetyAndCascadeRules: "Requirements that have already generated live, in-progress tasks cannot be deleted."
      }
    ],
    fields: [
      { name: "Requirement Code", dbColumn: "code", type: "Text", isRequired: true, description: "Unique requirement code (e.g. REQ-2026-018).", purpose: "Universal traceability code." },
      { name: "Title", dbColumn: "title", type: "Text", isRequired: true, description: "Clear deliverable summary.", purpose: "Identifies requirement in approval queues." },
      { name: "Business Justification", dbColumn: "justification", type: "Text", isRequired: true, description: "Why this work is required and ROI/impact.", purpose: "Informs executive approval decisions." },
      { name: "Estimated Budget (INR)", dbColumn: "estimated_budget", type: "Number", isRequired: false, description: "Projected financial expenditure.", purpose: "Finance approval validation." },
      { name: "Approval Status", dbColumn: "status", type: "Dropdown", isRequired: true, validationRules: "'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED'", description: "Current governance stage.", purpose: "Controls task conversion readiness." },
      { name: "Deliverables List", dbColumn: "deliverables", type: "JSON / Object", isRequired: true, description: "List of discrete milestones to be spawned as tasks upon approval.", purpose: "Automated task breakdown." }
    ],
    steps: [
      { title: "Step 1: Draft Requirement Proposal", instruction: "Fill title, justification, budget, and list discrete deliverables." },
      { title: "Step 2: Attach Reference Documentation", instruction: "Upload vendor quotes or architectural briefs; verify preview." },
      { title: "Step 3: Submit for Approval", instruction: "System routes to Designated Approvers based on financial threshold." },
      { title: "Step 4: Approver Sign-Off", instruction: "Approvers review and execute digital sign-off." },
      { title: "Step 5: Automated Task Conversion", instruction: "System automatically creates Tickets in Task Workflow." }
    ],
    results: [
      { action: "Approval Sign-Off", outcome: "Requirement transitions to 'APPROVED'.", technicalDetail: "Updates requirement_approvals and requirements table." },
      { action: "Task Generation", outcome: "Live tasks spawned in Task Workflow with back-links.", technicalDetail: "Inserts records into tickets with requirement_id foreign key." }
    ]
  },

  // ----------------------------------------------------------------------------
  // MODULE 4: VEHICLE DESK & FLEET OPERATIONS
  // ----------------------------------------------------------------------------
  {
    id: "vehicle_desk",
    code: "VEHICLE_DESK",
    title: "Vehicle Desk & Fleet Management",
    category: "FLEET",
    description: "Corporate fleet lifecycle, driver management, trip dispatch logs, fuel & odometer monitoring, maintenance services, and insurance/PUC compliance.",
    icon: Car,
    businessPurpose: "Ensures seamless corporate transportation and site logistics, tracks vehicle compliance (PUC, Insurance, Fitness), enforces maintenance schedules, monitors fuel efficiency, and manages driver assignments.",
    databaseTables: [
      "vehicles",
      "vehicle_drivers",
      "vehicle_trips",
      "vehicle_maintenance_logs",
      "vehicle_fuel_logs",
      "vehicle_compliance_documents",
      "vehicle_audit_logs"
    ],
    inflowFromModules: [
      "IAM & Security Governance (Fleet Managers, Drivers, Authorized Requestors)",
      "Workspaces & Master Entities (Company ownership, Branch allocation)"
    ],
    outflowToModules: [
      "Task & Ticket Management (Auto-spawns breakdown maintenance tasks)",
      "AMC & Vendor Contracts (Vehicle insurance and annual service agreements)"
    ],
    rippleImpactSummary: "Marking a vehicle as 'In Service' or 'Under Maintenance' blocks it from new trip dispatches. Document expirations (Insurance/PUC) trigger compliance warning banners.",
    startInfo: {
      overview: "Vehicle Desk manages 4 operational verticals: (1) Vehicle Registry & Status Pool, (2) Driver Allocations & Licenses, (3) Trip Dispatch Logs, and (4) Maintenance & Fuel Expense Ledgers.",
      navigation: "Main Navigation > Vehicle Desk (/vehicle)",
      prerequisites: [
        "FLEET_VIEW permission.",
        "Configured Vehicle Categories (Sedan, SUV, Site Pickup, Bus)."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "Vehicle & Driver Onboarding",
        overview: "Register a new corporate vehicle, upload RC/Insurance documents, and onboard certified drivers.",
        navigationPath: "Vehicle Desk > '+ New Vehicle' OR Drivers > '+ Add Driver'",
        whoCanPerform: ["FLEET_MANAGER", "SUPER_ADMIN"],
        requiredInputs: ["Registration Number", "Make & Model", "Chassis/Engine No", "Fuel Type", "RC Document", "Insurance Expiry"],
        systemMutations: [
          "Inserts vehicle into vehicles table with status 'AVAILABLE'.",
          "Uploads RC and Insurance PDFs to vehicle-documents bucket.",
          "Schedules automated compliance renewal alerts."
        ],
        safetyAndCascadeRules: "Registration numbers are strictly validated against Indian transport formats (e.g. MH-02-CB-1234) and must be unique."
      },
      {
        operation: "READ",
        code: "R",
        title: "Fleet Registry & Trip Dashboard",
        overview: "Monitor vehicle availability in real-time, inspect active trips, check fuel consumption, and track maintenance due dates.",
        navigationPath: "Vehicle Desk > Fleet Overview / Trips / Fuel Logs",
        whoCanPerform: ["All Fleet Roles and Authorized Corporate Requestors"],
        requiredInputs: ["Status Filter (Available/On Trip/Maintenance)", "Date Range"],
        systemMutations: ["Fetches vehicle records joined with active trip dispatches and latest odometer readings."],
        safetyAndCascadeRules: "Drivers only view their personally assigned trips."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "Trip Dispatch, Odometer & Fuel Logging",
        overview: "Dispatch vehicles on corporate trips, log start/end odometer readings, record fuel receipts, and log service completions.",
        navigationPath: "Vehicle Desk > 'Dispatch Trip' / 'Log Fuel' / 'Complete Service'",
        whoCanPerform: ["FLEET_MANAGER", "ASSIGNED_DRIVER"],
        requiredInputs: ["Trip ID", "End Odometer Reading", "Fuel Liters & Amount", "Fuel Bill Receipt Upload"],
        systemMutations: [
          "Updates vehicle_trips status to 'COMPLETED'.",
          "Updates vehicles.current_odometer_km and total mileage.",
          "Inserts fuel expense entry in vehicle_fuel_logs.",
          "Recalculates vehicle km/L fuel efficiency."
        ],
        safetyAndCascadeRules: "End odometer reading must strictly be greater than start odometer reading."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "Vehicle Decommissioning & Archival",
        overview: "Retire or sell vehicles from the active fleet pool.",
        navigationPath: "Vehicle Details > 'Decommission Vehicle'",
        whoCanPerform: ["FLEET_MANAGER", "SUPER_ADMIN"],
        requiredInputs: ["Vehicle ID", "Disposal Reason", "Sale / Scrap Certificate"],
        systemMutations: [
          "Sets vehicles.status = 'DECOMMISSIONED'.",
          "Archives historical trip and maintenance records."
        ],
        safetyAndCascadeRules: "Vehicles with active ongoing trips cannot be decommissioned."
      }
    ],
    fields: [
      { name: "Registration Number", dbColumn: "registration_number", type: "Text", isRequired: true, validationRules: "Unique Indian RTO format (e.g. MH-02-CB-5678)", description: "Vehicle license plate number.", purpose: "Primary real-world identifier." },
      { name: "Make & Model", dbColumn: "model_name", type: "Text", isRequired: true, description: "Manufacturer and vehicle line (e.g. Toyota Innova Hycross).", purpose: "Capacity and vehicle classification." },
      { name: "Vehicle Status", dbColumn: "status", type: "Dropdown", isRequired: true, validationRules: "'AVAILABLE' | 'ON_TRIP' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED'", description: "Current operational availability.", purpose: "Controls dispatch eligibility." },
      { name: "Current Odometer (KM)", dbColumn: "current_odometer_km", type: "Number", isRequired: true, description: "Total distance traveled by the vehicle.", purpose: "Triggers preventative maintenance intervals (e.g. every 10,000 KM)." },
      { name: "Fuel Type", dbColumn: "fuel_type", type: "Dropdown", isRequired: true, validationRules: "'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC' | 'HYBRID'", description: "Propulsion type.", purpose: "Fuel expense categorization and emissions tracking." },
      { name: "Insurance Expiry Date", dbColumn: "insurance_expiry_date", type: "Date", isRequired: true, description: "Policy expiration date.", purpose: "Legal compliance and renewal alerts." },
      { name: "Assigned Driver", dbColumn: "driver_id", type: "Dropdown", isRequired: false, description: "Designated chauffeur/driver profile.", purpose: "Driver accountability.", foreignKeyRelation: "vehicle_drivers.id" }
    ],
    steps: [
      { title: "Step 1: Register New Vehicle", instruction: "Input registration number, model, odometer, and upload RC/Insurance documents." },
      { title: "Step 2: Onboard & Verify Driver", instruction: "Create driver profile with Commercial Driving License and contact info." },
      { title: "Step 3: Dispatch Trip", instruction: "Select available vehicle, assign driver, record start odometer, and dispatch." },
      { title: "Step 4: Complete Trip & Log Fuel", instruction: "Enter closing odometer, upload fuel expense receipt, and submit." },
      { title: "Step 5: Schedule Periodic Maintenance", instruction: "System alerts when 10,000 KM threshold is reached to schedule servicing." }
    ],
    results: [
      { action: "Dispatch", outcome: "Vehicle status transitions to 'ON_TRIP'.", technicalDetail: "Prevents double-booking across concurrent departments." },
      { action: "Trip Completion", outcome: "Odometer updated, mileage calculated, vehicle marked 'AVAILABLE'.", technicalDetail: "Updates vehicles table and appends vehicle_trips row." }
    ]
  },

  // ----------------------------------------------------------------------------
  // MODULE 5: AMC & VENDOR CONTRACTS
  // ----------------------------------------------------------------------------
  {
    id: "amc_contracts",
    code: "AMC_CONTRACTS",
    title: "AMC & Vendor Contract Management",
    category: "GOVERNANCE",
    description: "Annual Maintenance Contracts (AMC), corporate asset warranties, vendor SLA agreements, renewal alerts, and scheduled preventative servicing.",
    icon: ShieldCheck,
    businessPurpose: "Protects enterprise infrastructure (Elevators, DG Sets, HVAC Chillers, Fire Hydrants, IT Servers) under valid service contracts, avoids costly downtime, and guarantees timely contract renewals before warranty expiry.",
    databaseTables: [
      "amc_contracts",
      "amc_assets",
      "amc_service_schedules",
      "amc_vendor_profiles",
      "amc_documents"
    ],
    inflowFromModules: [
      "Workspaces & Master Entities (Corporate entities, Site locations, Vendor Masters)",
      "IAM & Security Governance (Procurement Leads, Contract Administrators)"
    ],
    outflowToModules: [
      "Task & Ticket Management (Auto-generates preventative maintenance tasks)",
      "Executive Analytics (Annual maintenance expenditure and renewal forecast)"
    ],
    rippleImpactSummary: "Contract expirations trigger automated warning alerts 30 days in advance. Expired AMCs flag linked assets as 'Uncovered / At Risk'.",
    startInfo: {
      overview: "AMC tracks contracts through: Active -> Renewal Pending -> Expired -> Renewed -> Terminated.",
      navigation: "Main Navigation > Governance & Analysis > AMC & Subscriptions (/amc)",
      prerequisites: [
        "AMC_VIEW permission.",
        "Vendor Master directory."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "Contract & Asset Onboarding",
        overview: "Record a new maintenance contract, bind assets, set contract duration, and attach signed SLA agreements.",
        navigationPath: "AMC > '+ New AMC Contract'",
        whoCanPerform: ["PROCUREMENT_MANAGER", "SUPER_ADMIN"],
        requiredInputs: ["Contract Title", "Vendor ID", "Start Date & End Date", "Annual Cost", "Covered Assets List", "Signed PDF"],
        systemMutations: [
          "Inserts record into amc_contracts with status 'ACTIVE'.",
          "Links equipment in amc_assets.",
          "Generates scheduled preventative maintenance visit dates in amc_service_schedules."
        ],
        safetyAndCascadeRules: "End date must be strictly greater than start date. Uploaded PDF contract is validated."
      },
      {
        operation: "READ",
        code: "R",
        title: "Contract Registry & Warranty Dashboard",
        overview: "Inspect active contracts, filter by vendor or expiry window (30/60/90 days), and download SLA agreements.",
        navigationPath: "AMC > Contracts List / Expiring Soon",
        whoCanPerform: ["Users with AMC_VIEW permission"],
        requiredInputs: ["Vendor Filter", "Expiry Scope (30 Days / All)"],
        systemMutations: ["Queries amc_contracts joined with amc_vendor_profiles and amc_assets."],
        safetyAndCascadeRules: "Read-only users cannot modify contract values or renewal terms."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "Contract Renewal & Service Sign-Off",
        overview: "Renew expiring contracts, update annual fees, and sign off completed vendor maintenance visits.",
        navigationPath: "Contract Details > 'Renew Contract' / 'Sign Off Service Visit'",
        whoCanPerform: ["CONTRACT_ADMIN", "SUPER_ADMIN"],
        requiredInputs: ["New End Date", "Revised Contract Value", "Vendor Service Report Upload"],
        systemMutations: [
          "Extends amc_contracts.end_date and updates status to 'ACTIVE'.",
          "Marks amc_service_schedules visit as 'COMPLETED'.",
          "Appends renewal audit history."
        ],
        safetyAndCascadeRules: "Service visit sign-off requires mandatory upload of vendor service engineer timesheet."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "Contract Termination",
        overview: "Terminate cancelled or breached vendor contracts.",
        navigationPath: "Contract Details > 'Terminate Contract'",
        whoCanPerform: ["SUPER_ADMIN", "LEGAL_HEAD"],
        requiredInputs: ["Contract ID", "Termination Reason"],
        systemMutations: [
          "Sets amc_contracts.status = 'TERMINATED'.",
          "Unlinks assets from active coverage."
        ],
        safetyAndCascadeRules: "Historical service reports are permanently preserved for warranty compliance."
      }
    ],
    fields: [
      { name: "Contract Reference Code", dbColumn: "contract_code", type: "Text", isRequired: true, description: "Unique contract identifier (e.g. AMC-2026-HVAC-01).", purpose: "Universal contract tracking number." },
      { name: "Contract Title", dbColumn: "title", type: "Text", isRequired: true, description: "Descriptive title of service agreement.", purpose: "Identifies contract scope." },
      { name: "Vendor / Service Provider", dbColumn: "vendor_id", type: "Dropdown", isRequired: true, description: "External engineering contractor providing servicing.", purpose: "Vendor performance tracking.", foreignKeyRelation: "vendors.id" },
      { name: "Annual Contract Value (INR)", dbColumn: "annual_cost", type: "Number", isRequired: true, description: "Total annual maintenance fee.", purpose: "Financial budgeting and PO verification." },
      { name: "Contract Start Date", dbColumn: "start_date", type: "Date", isRequired: true, description: "Commencement date of coverage.", purpose: "Calculates active warranty period." },
      { name: "Contract Expiry Date", dbColumn: "end_date", type: "Date", isRequired: true, description: "Termination date of coverage.", purpose: "Drives 30-day automated renewal warnings." },
      { name: "Service Frequency", dbColumn: "frequency", type: "Dropdown", isRequired: true, validationRules: "'MONTHLY' | 'QUARTERLY' | 'BI_ANNUAL' | 'ANNUAL'", description: "Interval for preventative maintenance visits.", purpose: "Generates preventative maintenance schedules." }
    ],
    steps: [
      { title: "Step 1: Create AMC Record", instruction: "Input contract title, select vendor, and set start/end dates." },
      { title: "Step 2: Tag Covered Assets", instruction: "Select machinery (Lifts, DG Sets, STP, Chillers) covered under this AMC." },
      { title: "Step 3: Upload Signed SLA PDF", instruction: "Attach the executed contract document; verify in-browser preview." },
      { title: "Step 4: Monitor Preventative Visits", instruction: "System auto-generates scheduled maintenance tickets for each quarter." },
      { title: "Step 5: Contract Renewal", instruction: "When 30-day alert triggers, negotiate revised terms and extend contract." }
    ],
    results: [
      { action: "Contract Activation", outcome: "Asset warranty locked; service schedules auto-generated.", technicalDetail: "Inserts into amc_contracts and populates amc_service_schedules." },
      { action: "Renewal Warning", outcome: "Dispatches automated notification to Procurement Team.", technicalDetail: "Cron triggers alert 30 days before end_date." }
    ]
  },

  // ----------------------------------------------------------------------------
  // MODULE 6: IAM, RBAC & SECURITY GOVERNANCE
  // ----------------------------------------------------------------------------
  {
    id: "iam_rbac",
    code: "IAM_RBAC",
    title: "IAM, RBAC & Security Governance",
    category: "GOVERNANCE",
    description: "Enterprise identity management, Role-Based Access Control (RBAC), fine-grained CRUD permissions ([C][R][U][D][A][E]), ticket access scopes, and multi-tenant project isolation.",
    icon: UserCheck,
    businessPurpose: "Enforces strict security boundaries, ensures zero unauthorized mutations, guarantees that standard users and external vendors only access their tagged projects/tickets, and provides full administrative audit control.",
    databaseTables: [
      "users",
      "roles",
      "permissions",
      "role_permissions",
      "design_rbac_policies",
      "user_project_access",
      "active_sessions",
      "security_audit_logs"
    ],
    inflowFromModules: [
      "System Master & Workspace Admin (Corporate domain, user directory, Google SSO)"
    ],
    outflowToModules: [
      "ALL MODULES (Enforces authorization, hides unauthorized UI buttons, validates API endpoints)"
    ],
    rippleImpactSummary: "Changing a role's permissions or deactivating a user immediately propagates across all client sessions and blocks server-action mutations.",
    startInfo: {
      overview: "IAM controls access at 3 levels: (1) System Role (SUPER_ADMIN, ADMIN, AGENT, VIEWER), (2) Module Permissions ([C][R][U][D][A][E]), and (3) Scope Limits (ALL, PROJECT_ONLY, ASSIGNED_ONLY).",
      navigation: "Main Navigation > Governance & Analysis > RBAC Access Policies / IAM Controls (/rbac, /iam)",
      prerequisites: [
        "SUPER_ADMIN role or IAM_MANAGE permission."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "User Onboarding & Custom Role Creation",
        overview: "Invite new corporate users, provision login credentials, and define custom enterprise roles.",
        navigationPath: "User Master > '+ Invite User' OR RBAC > '+ Create Custom Role'",
        whoCanPerform: ["SUPER_ADMIN", "IAM_ADMIN"],
        requiredInputs: ["User Email", "Full Name", "Department", "Primary Role", "Assigned Project Scopes"],
        systemMutations: [
          "Creates user in Supabase Auth and inserts row into public.users.",
          "Generates default permission matrix bindings in role_permissions.",
          "Logs security onboarding event in security_audit_logs."
        ],
        safetyAndCascadeRules: "Corporate email domains are enforced. Passwords must meet strict enterprise complexity rules."
      },
      {
        operation: "READ",
        code: "R",
        title: "Access Matrix & Session Inspection",
        overview: "Inspect live permission matrices, view active user sessions, and evaluate access scopes across modules.",
        navigationPath: "RBAC > Permission Matrix Grid / Active Sessions",
        whoCanPerform: ["SUPER_ADMIN", "SECURITY_AUDITOR"],
        requiredInputs: ["Role Code Filter", "User Filter"],
        systemMutations: ["Queries roles, permissions, and active_sessions with real-time heartbeat monitoring."],
        safetyAndCascadeRules: "Standard users cannot view or inspect other users' permission matrices."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "Granular Permission Matrix Editing",
        overview: "Toggle [C] Create, [R] Read, [U] Update, [D] Delete, [A] Approve, [E] Export permissions per module.",
        navigationPath: "RBAC Policies > Matrix Grid Checkboxes > 'Save Policy Matrix'",
        whoCanPerform: ["SUPER_ADMIN"],
        requiredInputs: ["Target Role ID", "Module Code", "Selected CRUD Checkboxes", "Ticket Scope (ALL/ASSIGNED_ONLY)"],
        systemMutations: [
          "Upserts design_rbac_policies or role_permissions records.",
          "Invalidates cached user session claims.",
          "Logs permission elevation in security_audit_logs."
        ],
        safetyAndCascadeRules: "SUPER_ADMIN role permissions cannot be downgraded to prevent administrative lockout."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "User Deactivation & Role Deprecation",
        overview: "Instantly revoke user access or delete obsolete custom roles.",
        navigationPath: "User Details > 'Deactivate User' / 'Revoke Sessions'",
        whoCanPerform: ["SUPER_ADMIN"],
        requiredInputs: ["User ID", "Revocation Reason"],
        systemMutations: [
          "Sets users.is_active = false and revokes all active JWT sessions in active_sessions.",
          "Blocks subsequent API and Server Action invocations immediately."
        ],
        safetyAndCascadeRules: "Deactivated users retain audit history to preserve historical accountability."
      }
    ],
    fields: [
      { name: "Full Name", dbColumn: "full_name", type: "Text", isRequired: true, description: "Official corporate name of the employee or consultant.", purpose: "Displayed across assignees and audit logs." },
      { name: "Email Address", dbColumn: "email", type: "Text", isRequired: true, validationRules: "Valid email format; must be unique", description: "Login identifier and notification target.", purpose: "Authentication credentials." },
      { name: "Role Code", dbColumn: "role_code", type: "Dropdown", isRequired: true, description: "Assigned security role (e.g. SUPER_ADMIN, DESIGN_LEAD, SITE_ENGINEER).", purpose: "Determines baseline permissions.", foreignKeyRelation: "roles.code" },
      { name: "Can Create [C]", dbColumn: "can_create", type: "Boolean", isRequired: true, description: "Permission to create new entities in the target module.", purpose: "Enforces UI and API creation restrictions." },
      { name: "Can Read [R]", dbColumn: "can_read", type: "Boolean", isRequired: true, description: "Permission to view listings and detail pages.", purpose: "Controls data visibility." },
      { name: "Can Update [U]", dbColumn: "can_update", type: "Boolean", isRequired: true, description: "Permission to edit fields and transition statuses.", purpose: "Restricts mutation triggers." },
      { name: "Can Delete [D]", dbColumn: "can_delete", type: "Boolean", isRequired: true, description: "Permission to delete or cascade records.", purpose: "Prevents accidental data loss." },
      { name: "Can Approve [A]", dbColumn: "can_approve", type: "Boolean", isRequired: true, description: "Permission to execute GFC releases or requirement approvals.", purpose: "Separation of duties." },
      { name: "Ticket Access Scope", dbColumn: "ticket_access_scope", type: "Dropdown", isRequired: true, validationRules: "'ALL' | 'ASSIGNED_ONLY' | 'CREATED_ONLY' | 'PROJECT_ONLY' | 'NONE'", description: "Restricts visibility scope for operational tickets.", purpose: "Enforces least-privilege visibility." }
    ],
    steps: [
      { title: "Step 1: Create or Select Role", instruction: "Select a standard role or create a custom role (e.g. 'Structural Peer Reviewer')." },
      { title: "Step 2: Configure Module CRUD Matrix", instruction: "Check/uncheck [C], [R], [U], [D], [A], [E] permissions for each module." },
      { title: "Step 3: Define Project & Ticket Scopes", instruction: "Set ticket scope to 'ASSIGNED_ONLY' or 'PROJECT_ONLY' for external vendors." },
      { title: "Step 4: Assign Role to Users", instruction: "Map user profiles to the configured role." },
      { title: "Step 5: Audit & Verify", instruction: "Review active sessions to confirm authorization boundaries are enforced." }
    ],
    results: [
      { action: "Matrix Update", outcome: "Permissions immediately enforced on UI buttons and backend queries.", technicalDetail: "Upserts to design_rbac_policies with RLS validation." },
      { action: "Deactivation", outcome: "Active session killed; subsequent requests return 401 Unauthorized.", technicalDetail: "Updates active_sessions and revokes Supabase auth tokens." }
    ]
  },

  // ----------------------------------------------------------------------------
  // MODULE 7: SLA MONITORING & GOVERNANCE
  // ----------------------------------------------------------------------------
  {
    id: "sla_monitoring",
    code: "SLA_MONITORING",
    title: "SLA Monitoring & Governance",
    category: "GOVERNANCE",
    description: "Service Level Agreement (SLA) timers, first response thresholds, resolution deadlines, breach warnings, and automated escalation matrix.",
    icon: ShieldAlert,
    businessPurpose: "Guarantees that customer issues, internal requests, and consultant deliverables are addressed within contractual timeframes, alerting management before breaches occur.",
    databaseTables: [
      "sla_policies",
      "sla_breach_logs",
      "sla_escalation_rules",
      "sla_metrics_cache"
    ],
    inflowFromModules: [
      "Task & Ticket Management (Creation timestamps, Priority, Stage transitions)",
      "Design & Tracking (Look-Ahead milestone dates and drawing turnaround durations)"
    ],
    outflowToModules: [
      "IAM & Notifications (Dispatches escalation emails and high-priority push alerts to managers)",
      "Executive Dashboards (SLA Compliance % and Operational Health KPIs)"
    ],
    rippleImpactSummary: "SLA breaches automatically elevate ticket priority, dispatch escalation alerts to Department Heads, and reflect on team KPI scorecards.",
    startInfo: {
      overview: "SLA rules define: (1) First Response Target (e.g. 15 mins for Urgent), (2) Resolution Target (e.g. 4 hours for Urgent), and (3) Escalation tiers.",
      navigation: "Main Navigation > Governance & Analysis > SLA Monitoring (/sla)",
      prerequisites: [
        "SLA_VIEW permission."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "SLA Policy Creation",
        overview: "Configure response and resolution thresholds based on Priority and Department.",
        navigationPath: "SLA Monitoring > '+ New SLA Policy'",
        whoCanPerform: ["SUPER_ADMIN", "OPERATIONS_HEAD"],
        requiredInputs: ["Policy Name", "Target Priority", "First Response Minutes", "Resolution Minutes", "Escalation Email Matrix"],
        systemMutations: [
          "Inserts record into sla_policies table.",
          "Attaches escalation rules in sla_escalation_rules."
        ],
        safetyAndCascadeRules: "Urgent priorities must have shorter resolution windows than Normal priorities."
      },
      {
        operation: "READ",
        code: "R",
        title: "Live Breach Monitor & Compliance Metrics",
        overview: "Track active countdown timers, inspect tickets approaching breach (Amber alert), and review historical compliance rates.",
        navigationPath: "SLA Monitoring > Active Timers / Breach Log",
        whoCanPerform: ["All Managers and Team Leads with SLA_VIEW permission"],
        requiredInputs: ["Department Filter", "Status Filter (Within SLA / Near Breach / Breached)"],
        systemMutations: ["Calculates real-time elapsed duration against ticket timestamps."],
        safetyAndCascadeRules: "Calculations automatically pause outside configured business working hours (if enabled)."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "SLA Policy Adjustment & Grace Period Granting",
        overview: "Tune breach thresholds or grant an approved grace-period extension with justification.",
        navigationPath: "SLA Policy Details > 'Edit Policy' OR Ticket SLA Details > 'Grant Grace Extension'",
        whoCanPerform: ["OPERATIONS_HEAD", "SUPER_ADMIN"],
        requiredInputs: ["Extension Duration (Hours)", "Written Justification"],
        systemMutations: [
          "Updates target resolution deadline in tickets table.",
          "Logs grace extension event in sla_breach_logs."
        ],
        safetyAndCascadeRules: "Grace extensions require written approval notes to prevent arbitrary metric inflation."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "Policy Deactivation",
        overview: "Retire obsolete SLA policies.",
        navigationPath: "SLA Policies > 'Deactivate Policy'",
        whoCanPerform: ["SUPER_ADMIN"],
        requiredInputs: ["Policy ID"],
        systemMutations: ["Sets sla_policies.is_active = false."],
        safetyAndCascadeRules: "Historical breach logs remain intact for compliance audits."
      }
    ],
    fields: [
      { name: "Policy Name", dbColumn: "name", type: "Text", isRequired: true, description: "Descriptive name of SLA tier (e.g. Critical IT Infrastructure SLA).", purpose: "Identifies SLA policy rule." },
      { name: "Target Priority", dbColumn: "priority", type: "Dropdown", isRequired: true, validationRules: "'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'", description: "Applicable ticket urgency.", purpose: "Matches policy to ticket." },
      { name: "First Response Target (Mins)", dbColumn: "response_time_minutes", type: "Number", isRequired: true, description: "Maximum allowed minutes before first agent reply.", purpose: "Guarantees quick customer triage." },
      { name: "Resolution Target (Hours)", dbColumn: "resolution_time_hours", type: "Number", isRequired: true, description: "Maximum allowed hours before ticket resolution.", purpose: "Guarantees prompt issue closure." },
      { name: "Escalation Manager Email", dbColumn: "escalation_email", type: "Text", isRequired: true, description: "Department Manager notified upon breach.", purpose: "Automated executive escalation." }
    ],
    steps: [
      { title: "Step 1: Define SLA Policy Rules", instruction: "Set response and resolution thresholds per priority tier." },
      { title: "Step 2: Bind Escalation Matrix", instruction: "Designate manager emails to receive breach alerts." },
      { title: "Step 3: Monitor Live Timers", instruction: "Track tickets with visual progress countdowns (Green -> Amber -> Red)." },
      { title: "Step 4: Automated Breach Handling", instruction: "Upon breach, system alerts managers and flags ticket as Breached." }
    ],
    results: [
      { action: "Countdown Timer", outcome: "Visual progress bar on ticket detail view.", technicalDetail: "Updates live via reactive client interval." },
      { action: "Breach Event", outcome: "Inserts record into sla_breach_logs and sends push alert.", technicalDetail: "Dispatches async email to escalation manager." }
    ]
  },

  // ----------------------------------------------------------------------------
  // MODULE 8: WORKSPACES & SUB-WORKSPACES
  // ----------------------------------------------------------------------------
  {
    id: "workspaces_masters",
    code: "WORKSPACES",
    title: "Workspaces & Sub-Workspaces",
    category: "CORE_OPS",
    description: "Hierarchical project trees, corporate divisions, department nesting, member access enrollment, and cross-workspace data migration.",
    icon: FolderKanban,
    businessPurpose: "Provides multi-tenant structural isolation, allowing massive enterprises to organize departments (IT, Civil, Design, Accounts, Legal) with nested project sub-teams and isolated member permissions.",
    databaseTables: [
      "workspaces",
      "workspace_members",
      "companies",
      "workspace_data_migrations"
    ],
    inflowFromModules: [
      "IAM & Security Governance (User memberships, Department allocations)",
      "System Master (Company Master directory)"
    ],
    outflowToModules: [
      "Task & Ticket Management (Enforces workspace boundaries for all tasks)",
      "Requirements Planning (Allocates requirements to specific business units)"
    ],
    rippleImpactSummary: "Deleting a workspace reparents or deletes nested child workspaces and re-assigns tickets. Transferring a workspace migrates all linked tasks.",
    startInfo: {
      overview: "Workspaces can be nested infinitely: Parent Workspace (e.g. 'Real Estate Development') -> Child Sub-Workspace (e.g. 'Project Trees Phase 1') -> Sub-team (e.g. 'Structural Engineering').",
      navigation: "Main Navigation > Core Operations > Workspaces (/workspaces)",
      prerequisites: [
        "WORKSPACES_VIEW permission.",
        "Active Company Master record."
      ]
    },
    crudOperations: [
      {
        operation: "CREATE",
        code: "C",
        title: "Workspace & Subworkspace Creation",
        overview: "Create a root Workspace or nest a Subworkspace under a Parent Workspace.",
        navigationPath: "Workspaces > '+ New Workspace' / 'Create Subworkspace'",
        whoCanPerform: ["SUPER_ADMIN", "WORKSPACE_ADMIN (WORKSPACES_CREATE permission)"],
        requiredInputs: ["Workspace Name", "Company ID", "Parent Workspace ID (Optional)", "Initial Member List"],
        systemMutations: [
          "Inserts record into workspaces table with parent_workspace_id linking.",
          "Adds creator as Workspace Manager in workspace_members.",
          "Enrolls selected team members."
        ],
        safetyAndCascadeRules: "Cyclic nesting (e.g. Workspace A -> Parent B -> Parent A) is strictly prevented."
      },
      {
        operation: "READ",
        code: "R",
        title: "Workspace Tree & Member Portfolio",
        overview: "Navigate hierarchical workspace trees, inspect enrolled members, and review task distribution.",
        navigationPath: "Workspaces > Tree View / Master List",
        whoCanPerform: ["Enrolled Workspace Members and System Admins"],
        requiredInputs: ["Parent ID (for tree expansion)"],
        systemMutations: ["Recursive tree query fetching nested workspaces and member counts."],
        safetyAndCascadeRules: "Users only see workspaces they are explicitly enrolled in unless granted WORKSPACES_VIEW_ALL."
      },
      {
        operation: "UPDATE",
        code: "U",
        title: "Workspace Reconfiguration & Member Management",
        overview: "Update workspace details, transfer ownership, enroll new members, or adjust parent hierarchy.",
        navigationPath: "Workspace Settings > 'Manage Members' / 'Edit Details'",
        whoCanPerform: ["Workspace Manager", "SUPER_ADMIN"],
        requiredInputs: ["Target Workspace ID", "Updated Fields / Member Diff"],
        systemMutations: [
          "Updates workspaces record.",
          "Inserts or deletes rows in workspace_members.",
          "Logs reconfiguration in workspace audit trail."
        ],
        safetyAndCascadeRules: "Every workspace must have at least one designated Manager."
      },
      {
        operation: "DELETE",
        code: "D",
        title: "Workspace Decommissioning & Transfer",
        overview: "Safely delete a workspace after transferring tasks to an alternative workspace.",
        navigationPath: "Workspaces > 'Transfer Tasks & Delete'",
        whoCanPerform: ["SUPER_ADMIN"],
        requiredInputs: ["Target Workspace ID", "Destination Workspace for Task Migration"],
        systemMutations: [
          "Migrates active tickets to destination workspace.",
          "Soft-deletes workspace record."
        ],
        safetyAndCascadeRules: "Cannot delete a workspace containing active tickets without executing the Transfer Task wizard."
      }
    ],
    fields: [
      { name: "Workspace Name", dbColumn: "name", type: "Text", isRequired: true, description: "Official name of the workspace or department.", purpose: "Primary structural identifier." },
      { name: "Workspace Code", dbColumn: "code", type: "Text", isRequired: false, validationRules: "Auto-generated short code (e.g. IT-ERP)", description: "Alphanumeric code.", purpose: "Quick search and indexing prefix." },
      { name: "Company", dbColumn: "company_id", type: "Dropdown", isRequired: true, description: "Corporate legal entity.", purpose: "Multi-company data isolation.", foreignKeyRelation: "companies.id" },
      { name: "Parent Workspace", dbColumn: "parent_workspace_id", type: "Dropdown", isRequired: false, description: "Parent node in the hierarchical tree.", purpose: "Enables nested sub-department structures.", foreignKeyRelation: "workspaces.id" },
      { name: "Workspace Manager", dbColumn: "manager_id", type: "Dropdown", isRequired: true, description: "User responsible for overall workspace governance.", purpose: "Administrative ownership.", foreignKeyRelation: "users.id" },
      { name: "Enrolled Members", dbColumn: "member_ids", type: "Multi-Select", isRequired: false, description: "Users granted access to create and collaborate on tasks.", purpose: "Membership access control." }
    ],
    steps: [
      { title: "Step 1: Create Master Workspace", instruction: "Provide department/project name and select corporate company." },
      { title: "Step 2: Nest Sub-Workspaces", instruction: "Create child teams under the parent node to model your organization hierarchy." },
      { title: "Step 3: Enroll Members & Assign Roles", instruction: "Add team members and assign Workspace Manager designations." },
      { title: "Step 4: Launch Department Tasks", instruction: "Enrolled members create and manage tickets isolated to this workspace." }
    ],
    results: [
      { action: "Creation", outcome: "Workspace generated with recursive tree node.", technicalDetail: "Inserts into workspaces table and sets workspace_members." },
      { action: "Member Enrollment", outcome: "Users gain immediate access to workspace tasks.", technicalDetail: "Inserts records into workspace_members linking user UUIDs." }
    ]
  }
];
