// ==============================================================================
// Domain Interfaces: Master-Driven Design & Tender Tracking (Chandak Workspace)
// ==============================================================================

export interface ProjectMaster {
  id: string;
  code: string;
  name: string;
  location: string;
  description?: string;
  createdAt: string;
}

export interface TowerMaster {
  id: string;
  projectId: string;
  towerName: string;
  towerType: "Sale" | "Society" | "Commercial" | "Rehab / SRA" | "PTC / Hostel" | "Plot / Infrastructure";
  totalFloors?: number;
  heightMeters?: number;
  description?: string;
}

export interface DisciplineMaster {
  id: string;
  name: string;
  code: string;
  icon?: string;
}

export interface WorkPackageMaster {
  id: string;
  disciplineId: string;
  disciplineName: string;
  packageName: string;
  packageCode?: string;
  defaultDurationDays?: number;
  description?: string;
}

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
  expertise: string[]; // Work package tags (multi-selection)
  contactPerson?: string;
  email?: string;
  phone?: string;
  activeProjects: string[]; // Projects tagged (multi-selection)
  onboardingStatus: "Onboard" | "Not Onboard"; // Onboard when activeProjects.length > 0
  rating?: number;
  totalDrawingsSubmitted?: number;
  averageTatDays?: number;
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

// Audit Trail Entry for Design Matrix & Package status mutations
export interface MatrixAuditLog {
  id: string;
  entryKey: string; // `${projectId}__${towerId}__${packageId}`
  projectId: string;
  projectName: string;
  towerId: string;
  towerName: string;
  packageId: string;
  packageName: string;
  disciplineName?: string;
  previousStatus?: string;
  newStatus: string;
  previousPlannedDate?: string;
  newPlannedDate: string;
  previousActualDate?: string;
  newActualDate: string;
  consultantName?: string;
  changedBy: string;
  changedByEmail?: string;
  timestamp: string;
  remarks?: string;
  mailSent: boolean;
  mailRecipientCount?: number;
  mailSubject?: string;
}

// Role-Based Access Control (RBAC) Policy: Project-wise / Role-based / CRUD options selection
export interface DesignRbacPolicy {
  id: string;
  roleCode: string; // e.g. "SUPER_ADMIN", "DESIGN_DIRECTOR", "PROJECT_MANAGER", "SITE_ENGINEER", "CONSULTANT"
  roleName: string;
  projectId: string; // "ALL" or specific project id
  projectName: string;
  module: "DESIGN_MATRIX" | "DRAWINGS" | "CONSULTANTS" | "LOOK_AHEAD" | "LIAISON" | "TRANSMITTALS" | "RFIS" | "ALL";
  canCreate: boolean; // [C]
  canRead: boolean;   // [R]
  canUpdate: boolean; // [U]
  canDelete: boolean; // [D]
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
