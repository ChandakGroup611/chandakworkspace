// ==============================================================================
// Domain Types: Design Tracking & CAD Engineering Module (Chandak Workspace)
// ==============================================================================

export type DesignDiscipline = 
  | "Architectural" 
  | "Structural" 
  | "MEP" 
  | "Landscape" 
  | "Interior";

export type DrawingStatus = 
  | "Under Review" 
  | "Approved (GFC)" 
  | "Revision Requested" 
  | "Site Handed Over";

export interface DrawingItem {
  id: string;
  code: string;
  title: string;
  discipline: DesignDiscipline;
  project: string;
  revision: string;
  status: DrawingStatus;
  consultant: string;
  submittedDate: string;
  approvedDate?: string;
  fileSize: string;
  description?: string;
}

export interface DrawingRevision {
  id: string;
  drawingId: string;
  revisionNumber: string;
  submittedBy: string;
  date: string;
  changesSummary: string;
  fileSize: string;
  status: DrawingStatus;
}

export interface ConsultantReview {
  id: string;
  drawingId: string;
  revisionNumber: string;
  reviewerName: string;
  decision: "APPROVED" | "REVISION_REQUIRED" | "REJECTED";
  comments: string;
  timestamp: string;
}

export interface GfcRelease {
  id: string;
  drawingId: string;
  drawingCode: string;
  drawingTitle: string;
  revisionNumber: string;
  siteEngineerName: string;
  contractorFirm: string;
  handoverDate: string;
  physicalCopiesIssued: number;
}

export interface ConsultantPartner {
  id: string;
  name: string;
  category: DesignDiscipline;
  leadContact: string;
  email: string;
  phone: string;
  activeProjects: string[];
  totalDrawingsSubmitted: number;
  averageTatDays: number;
  rating: number;
}

export interface DesignProjectSummary {
  id: string;
  code: string;
  name: string;
  location: string;
  totalDrawings: number;
  gfcCount: number;
  underReviewCount: number;
}

export type TransmittalPurpose = 
  | "GOOD_FOR_CONSTRUCTION" 
  | "FOR_TENDER_BIDDING" 
  | "FOR_REVIEW_APPROVAL" 
  | "FOR_INFORMATION" 
  | "AS_BUILT_RECORD";

export interface TransmittalItem {
  id: string;
  transmittalNumber: string; // e.g. TR-CK-2026-004
  projectId: string;
  projectName: string;
  towerName?: string;
  issueDate: string;
  purpose: TransmittalPurpose;
  recipientAgency: string; // e.g. "Shapoorji Pallonji / Site Execution Team"
  recipientContact?: string;
  issuedBy: string; // e.g. "Lead Design Manager"
  drawingIds: string[];
  drawingDetails: Array<{
    drawingCode: string;
    drawingTitle: string;
    revision: string;
    copiesIssued: number;
    fileUrl?: string;
  }>;
  remarks?: string;
  status: "ISSUED" | "ACKNOWLEDGED" | "SUPERSEDED";
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export type RfiPriority = "URGENT" | "HIGH" | "NORMAL";
export type RfiStatus = "OPEN" | "UNDER_REVIEW" | "CLARIFIED" | "CLOSED";

export interface RfiItem {
  id: string;
  rfiNumber: string; // e.g. RFI-STR-042
  projectId: string;
  projectName: string;
  towerName?: string;
  discipline: DesignDiscipline;
  drawingCode?: string;
  drawingTitle?: string;
  subject: string;
  queryDescription: string;
  raisedBy: string; // Site Engineer / Contractor
  raisedDate: string;
  assignedConsultant: string;
  priority: RfiPriority;
  targetResolutionDate: string;
  status: RfiStatus;
  consultantResponse?: string;
  respondedBy?: string;
  respondedDate?: string;
  resolvingRevisionNumber?: string;
}

