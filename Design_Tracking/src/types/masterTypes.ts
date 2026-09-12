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
  contactPerson?: string;
  email?: string;
  phone?: string;
}

// Live Transaction Entry (Filled by user)
export interface PackageStatusEntry {
  id: string;
  projectId: string;
  towerId: string;
  packageId: string;
  status: "Received" | "In progress" | "Pending" | "Target Date" | "NA";
  targetDate?: string;
  consultantName?: string;
  remarks?: string;
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
