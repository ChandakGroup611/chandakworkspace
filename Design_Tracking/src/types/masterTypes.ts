// ==============================================================================
// Domain Interfaces: Master-Driven Design & Tender Tracking (Chandak Workspace)
// ==============================================================================

export interface ProjectMaster {
  id: string;
  code: string;
  name: string;
  location: string;
  isSubProject?: boolean;
  parentProjectId?: string;
  parentProjectName?: string;
  subProjectName?: string;
  projectType?: "Residential High-Rise" | "Luxury Residential" | "Commercial Office" | "Mixed-Use Development" | "Township" | "SRA / Redevelopment" | "Hospitality" | "Infrastructure" | string;
  plotArea?: string;
  builtUpArea?: string;
  estimatedBudget?: string;
  reraNumber?: string;
  projectStatus?: "Planning & Design" | "Statutory Approvals" | "Tendering" | "Under Construction" | "Finishing & Handover" | "Completed" | string;
  targetCompletionDate?: string;
  leadManager?: string;
  leadManagerEmail?: string;
  taggedConsultants?: string[]; // Multi-selected consultant partner names / IDs (Project-Level)
  taggedCategories?: string[]; // Multi-selected discipline / category names (Project-Level)
  taggedPackages?: string[]; // Multi-selected Package Master names (Project-Level alias)
  subProjectConsultants?: Record<string, string[]>; // Subproject/Tower ID -> Consultant names/IDs
  subProjectCategories?: Record<string, string[]>; // Subproject/Tower ID -> Category names
  subProjectPackages?: Record<string, string[]>; // Subproject/Tower ID -> Package names (alias)
  description?: string;
  createdAt: string;
}

export interface TowerMaster {
  id: string;
  projectId: string;
  projectName?: string;
  towerName: string;
  subProjectCode?: string;
  towerType: "Sale" | "Society" | "Commercial" | "Rehab / SRA" | "PTC / Hostel" | "Plot / Infrastructure";
  totalFloors?: number;
  heightMeters?: number;
  targetCompletionDate?: string;
  taggedConsultants?: string[]; // Sub-project level assigned consultants
  taggedCategories?: string[]; // Sub-project level assigned discipline categories
  taggedPackages?: string[]; // Sub-project level assigned packages (alias)
  description?: string;
  createdAt?: string;
}

export type SubProjectMaster = TowerMaster;

export interface PackageMaster {
  id: string;
  name: string; // Main engineering discipline/package e.g. "Architectural", "Structural", "MEPF Services", "Civil & RCC", "Façade", "Landscape", "Interior", "Fire & Safety", "BIM"
  code: string; // Identifier code e.g. "ARCH", "STR", "MEP", "CIV", "FAC"
  description?: string;
  color?: string;
  icon?: string;
  createdAt?: string;
}

export type DisciplineMaster = PackageMaster;
export type CategoryMaster = PackageMaster;

export interface SubPackageMaster {
  id: string;
  disciplineId: string;
  disciplineName: string;
  packageName: string;
  packageCode: string;
  packageId?: string; // Foreign key to parent PackageMaster.id (alias disciplineId)
  subPackageName?: string; // Granular Sub-Package / Deliverable title (e.g. "Structural Foundation & Superstructure")
  subPackageCode?: string; // Sub-Package Code e.g. "STR-01" (alias packageCode)
  defaultDurationDays?: number;
  description?: string;
}

export type WorkPackageMaster = SubPackageMaster;

export interface StatutoryAuthorityMaster {
  id: string;
  authorityName: string;
  scope: string;
  category: "Municipal" | "Fire & Safety" | "Environment" | "Aviation & Defence" | "Legal & RERA" | "Utilities";
}

export interface ConsultantMaster {
  id: string;
  firmName: string;
  discipline: string;
  categories?: string[]; // Multi-selected mapped categories from Category Master
  packages?: string[]; // Multi-selected mapped parent packages from Package Master (alias)
  expertise: string[]; // Work package / sub-package tags (multi-selection)
  subPackages?: string[]; // Sub-package tags (alias)
  contactPerson?: string;
  email?: string;
  phone?: string;
  activeProjects: string[]; // Projects tagged (multi-selection)
  onboardingStatus: "Onboard" | "Not Onboard"; // Onboard when activeProjects.length > 0
  rating?: number;
  totalDrawingsSubmitted?: number;
  averageTatDays?: number;
  createdAt?: string;
}

// Live Transaction Entry (Filled by user)
export interface PackageStatusEntry {
  id: string;
  projectId: string;
  towerId: string;
  packageId: string;
  status: "Received" | "In progress" | "Pending" | "Target Date" | "NA";
  plannedDate: string; // Mandatory planned date
  actualDate: string;  // Mandatory actual/tracked date
  targetDate?: string;
  consultantId?: string;
  consultantName?: string;
  remarks?: string;
  updatedAt: string;
  updatedBy?: string;
}

// ==============================================================================
// Foreign Key Dependency & Referential Integrity Tracking
// ==============================================================================

export interface ForeignKeyDependencyItem {
  foreignKeyField: string; // e.g. "projectId", "towerId", "packageId", "consultantId", "authorityId"
  referencedEntityType: string; // e.g. "Sub-Project", "Tower / Wing", "Matrix Status Cell", "Look-Ahead Milestone", "Statutory Clearance", "Drawing Register", "Transmittal", "RFI"
  count: number;
  previewItems: string[];
  canCascade: boolean;
}

export interface EntityDependencyReport {
  entityType: "PROJECT" | "SUB_PROJECT" | "TOWER" | "PACKAGE" | "SUB_PACKAGE" | "CONSULTANT" | "AUTHORITY" | "CATEGORY";
  entityId: string;
  entityName: string;
  totalDependentRecords: number;
  dependencies: ForeignKeyDependencyItem[];
  isReferencedByOtherRecords: boolean;
}

// Audit Trail Entry for Design Matrix, Masters, and Transactional CRUD & Foreign Key Cascades
export interface MatrixAuditLog {
  id: string;
  entryKey?: string; // `${projectId}__${towerId}__${packageId}` or `${entityType}__${entityId}`
  action?: "CREATE" | "UPDATE" | "DELETE" | "CASCADE_DELETE" | "STATUS_CHANGE";
  entityType?: "PROJECT" | "SUB_PROJECT" | "TOWER" | "PACKAGE" | "CONSULTANT" | "AUTHORITY" | "CATEGORY" | "MATRIX_CELL" | "LOOK_AHEAD" | "LIAISON" | "DRAWING" | "TRANSMITTAL" | "RFI";
  entityId?: string;
  entityName?: string;
  projectId?: string;
  projectName?: string;
  towerId?: string;
  towerName?: string;
  packageId?: string;
  packageName?: string;
  disciplineName?: string;
  previousStatus?: string;
  newStatus?: string;
  previousPlannedDate?: string;
  newPlannedDate?: string;
  previousActualDate?: string;
  newActualDate?: string;
  consultantId?: string;
  consultantName?: string;
  previousValue?: any;
  newValue?: any;
  impactSummary?: string;
  foreignKeyDependencies?: ForeignKeyDependencyItem[];
  changedBy: string;
  changedByEmail?: string;
  timestamp: string;
  remarks?: string;
  reason?: string;
  mailSent: boolean;
  mailRecipientCount?: number;
  mailSubject?: string;
}

export type DesignTicketAccessScope = 
  | "ALL" 
  | "ASSIGNED_ONLY" 
  | "CREATED_ONLY" 
  | "PROJECT_ONLY" 
  | "DEPARTMENT_ONLY" 
  | "NONE";

export interface DesignRbacPolicy {
  id: string;
  roleCode: string; // e.g. "SUPER_ADMIN", "DESIGN_ADMIN", "DESIGN_LEAD", "DESIGN_COORDINATOR", "SITE_ENGINEER", "CONSULTANT", "TPQA_AUDITOR", "VIEWER", or custom role code
  roleName: string;
  projectId: string; // "ALL" or specific project id
  projectName: string;
  module: "DESIGN_MATRIX" | "DRAWINGS" | "CONSULTANTS" | "LOOK_AHEAD" | "LIAISON" | "TRANSMITTALS" | "RFIS" | "MASTERS" | "ALL";
  canCreate: boolean; // [C]
  canRead: boolean;   // [R]
  canUpdate: boolean; // [U]
  canDelete: boolean; // [D]
  canApprove?: boolean; // [A] (e.g. GFC Release / Verification approval)
  canExport?: boolean; // [E] (e.g. Export Matrix / Reports)
  ticketAccessScope?: DesignTicketAccessScope; // Ticket-based / Assignment-based option
  updatedAt: string;
}

// Live Look-Ahead Milestone Entry (Filled by user)
export interface LookAheadEntry {
  id: string;
  projectId: string;
  towerId: string;
  deliverableDescription: string;
  timeframe: "30_DAYS" | "60_DAYS" | "90_DAYS";
  targetDate: string;
  priority: "CRITICAL" | "HIGH" | "NORMAL";
  isExpedited: boolean;
  contractorOrConsultant?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

// Live Statutory Clearance Entry (Filled by user)
export interface StatutoryClearanceEntry {
  id: string;
  projectId: string;
  towerId: string;
  authorityId: string;
  onboardingStatus: "Onboard" | "Fixed consultant" | "Not Onboard" | "Compliance Pending" | "NA";
  targetApprovalDate?: string;
  fileReferenceNumber?: string;
  remarks?: string;
}

// ==============================================================================
// User Access & RBAC Governance (Chandak Workspace Integration)
// ==============================================================================

export type StandardDesignRoleCode = 
  | "DESIGN_ADMIN" 
  | "DESIGN_LEAD" 
  | "DESIGN_COORDINATOR" 
  | "CONSULTANT" 
  | "SITE_ENGINEER" 
  | "TPQA_AUDITOR" 
  | "VIEWER";

export type DesignRoleCode = StandardDesignRoleCode | string;

export interface DesignRoleDefinition {
  id: string;
  code: string;
  label: string;
  badgeColor: string;
  description: string;
  isSystem: boolean;
  departmentId?: string;
  departmentName?: string;
  defaultPermissions: {
    canMatrixEdit: boolean;
    canDrawingsUpload: boolean;
    canDrawingsApproveGfc: boolean;
    canTransmittalsCreate: boolean;
    canRfisManage: boolean;
    canMastersManage: boolean;
  };
  ticketAccessScope?: DesignTicketAccessScope;
  createdAt?: string;
  updatedAt?: string;
}

export type DesignProjectAccessType = "ALL" | "SPECIFIC";

export interface DesignUserAccessRecord {
  id?: string;
  userId: string;
  designRole: DesignRoleCode;
  projectAccessType: DesignProjectAccessType;
  assignedProjectIds: string[]; // Array of project IDs
  canMatrixEdit: boolean;
  canDrawingsUpload: boolean;
  canDrawingsApproveGfc: boolean;
  canTransmittalsCreate: boolean;
  canRfisManage: boolean;
  canMastersManage: boolean;
  ticketAccessScope?: DesignTicketAccessScope;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DesignWorkspaceUser {
  id: string;
  fullName: string;
  email: string;
  userCode?: string;
  profilePhoto?: string | null;
  isActive: boolean;
  roleId?: string;
  roleName?: string;
  roleCode?: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationName?: string;
  hasModuleAccess: boolean;
  designAccess?: DesignUserAccessRecord | null;
}

