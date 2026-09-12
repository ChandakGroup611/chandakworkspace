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
