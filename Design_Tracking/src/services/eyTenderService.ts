import { 
  EY_PROJECT_COLUMNS, 
  EY_UNIQUE_PROJECTS, 
  EY_TENDER_PACKAGES, 
  EY_LOOK_AHEAD_ITEMS, 
  EY_LIAISON_CONSULTANTS, 
  EY_DESIGN_STAGES 
} from "../data/eyTenderData";

export interface ProjectKpiStats {
  project: string;
  totalWings: number;
  totalPackages: number;
  receivedPackages: number;
  inProgressPackages: number;
  pendingPackages: number;
  completionRate: number;
}

export class EyTenderService {
  static getProjects(): string[] {
    return EY_UNIQUE_PROJECTS;
  }

  static getProjectColumns() {
    return EY_PROJECT_COLUMNS;
  }

  static getPackages() {
    return EY_TENDER_PACKAGES;
  }

  static getLookAhead() {
    return EY_LOOK_AHEAD_ITEMS;
  }

  static getLiaisonConsultants() {
    return EY_LIAISON_CONSULTANTS;
  }

  static getStages() {
    return EY_DESIGN_STAGES;
  }

  static getProjectKpis(): ProjectKpiStats[] {
    return EY_UNIQUE_PROJECTS.map(proj => {
      const wings = EY_PROJECT_COLUMNS.filter(c => c.project === proj);
      let total = 0;
      let received = 0;
      let inProgress = 0;
      let pending = 0;

      for (const pkg of EY_TENDER_PACKAGES) {
        for (const w of wings) {
          const val = (pkg.statuses[`${w.project}__${w.tower}`] || "NA").toLowerCase();
          if (val === "na" || val === "-") continue;
          total++;
          if (val.includes("received")) received++;
          else if (val.includes("progress") || val.includes("onboard")) inProgress++;
          else if (val.includes("pending") || val.includes("not onboard")) pending++;
        }
      }

      const rate = total > 0 ? Math.round((received / total) * 100) : 0;

      return {
        project: proj,
        totalWings: wings.length,
        totalPackages: total,
        receivedPackages: received,
        inProgressPackages: inProgress,
        pendingPackages: pending,
        completionRate: rate
      };
    });
  }
}
