// ==============================================================================
// Master-Driven Design & Tender Tracker Schema (Empty - User Driven)
// ==============================================================================

export interface ProjectTowerColumn {
  colKey: string;
  project: string;
  tower: string;
}

export interface TenderPackageItem {
  id: string;
  rowNumber: number;
  category: string;
  packageName: string;
  statuses: Record<string, string>; // key: `${project}__${tower}`
}

export interface LookAheadItem {
  project: string;
  tower: string;
  timeframe: "30_DAYS" | "60_DAYS";
  description: string;
}

export interface LiaisonConsultantItem {
  id: string;
  consultantTitle: string;
  scope: string;
  statuses: Record<string, string>;
}

export interface DesignStageItem {
  stageName: string;
  consultant: string;
  deliverable: string;
}

export const EY_PROJECT_COLUMNS: ProjectTowerColumn[] = [];
export const EY_UNIQUE_PROJECTS: string[] = [];
export const EY_TENDER_PACKAGES: TenderPackageItem[] = [];
export const EY_LOOK_AHEAD_ITEMS: LookAheadItem[] = [];
export const EY_LIAISON_CONSULTANTS: LiaisonConsultantItem[] = [];
export const EY_DESIGN_STAGES: DesignStageItem[] = [];
