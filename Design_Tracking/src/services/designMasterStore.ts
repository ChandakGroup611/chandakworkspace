// ==============================================================================
// Master-Driven Design & Tender Tracking Store (Chandak Workspace)
// Description: Fully dynamic master-driven store. No hardcoded data. 
//              All outputs (Matrix, Look-Ahead, Liaisoning) are generated on-the-fly 
//              from user-defined masters and user-filled transaction data.
// ==============================================================================

import { 
  ProjectMaster, 
  TowerMaster, 
  DisciplineMaster, 
  WorkPackageMaster, 
  StatutoryAuthorityMaster, 
  ConsultantMaster,
  PackageStatusEntry,
  LookAheadEntry,
  StatutoryClearanceEntry
} from "../types/masterTypes";

import { 
  EY_PROJECT_COLUMNS, 
  EY_UNIQUE_PROJECTS, 
  EY_TENDER_PACKAGES, 
  EY_LOOK_AHEAD_ITEMS, 
  EY_LIAISON_CONSULTANTS 
} from "../data/eyTenderData";

const STORAGE_KEY = "CHANDAK_DESIGN_MASTER_STORE_V2";

export interface MasterStoreState {
  projects: ProjectMaster[];
  towers: TowerMaster[];
  disciplines: DisciplineMaster[];
  packages: WorkPackageMaster[];
  authorities: StatutoryAuthorityMaster[];
  consultants: ConsultantMaster[];
  packageStatuses: Record<string, PackageStatusEntry>; // Key: `${projectId}__${towerId}__${packageId}`
  lookAheads: LookAheadEntry[];
  statutoryClearances: Record<string, StatutoryClearanceEntry>; // Key: `${projectId}__${towerId}__${authorityId}`
}

export class DesignMasterStore {
  private static state: MasterStoreState | null = null;
  private static listeners: Set<() => void> = new Set();

  /**
   * Subscribe to store updates for reactive UI re-rendering
   */
  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify() {
    this.saveToStorage();
    this.listeners.forEach(cb => {
      try { cb(); } catch (err) { console.error("Store listener error:", err); }
    });
  }

  /**
   * Initializes store state from localStorage or loads seed template
   */
  public static getState(): MasterStoreState {
    if (this.state) return this.state;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.state = JSON.parse(raw);
          return this.state!;
        }
      } catch (e) {
        console.warn("Failed to load DesignMasterStore from localStorage, using initial template:", e);
      }
    }

    // Initialize with EY Tender Reference Template so user has a working starting base
    this.state = this.buildEyReferenceSeed();
    this.saveToStorage();
    return this.state;
  }

  private static saveToStorage() {
    if (typeof window !== "undefined" && this.state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn("Failed to save DesignMasterStore to localStorage:", e);
      }
    }
  }

  // ============================================================================
  // Master Management: Projects & Towers (CRUD)
  // ============================================================================

  public static getProjects(): ProjectMaster[] {
    return this.getState().projects;
  }

  public static addProject(proj: Omit<ProjectMaster, "id" | "createdAt">): ProjectMaster {
    const state = this.getState();
    const id = `prj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newProj: ProjectMaster = {
      ...proj,
      id,
      createdAt: new Date().toISOString()
    };
    state.projects.push(newProj);
    this.notify();
    return newProj;
  }

  public static updateProject(id: string, updates: Partial<Omit<ProjectMaster, "id">>): ProjectMaster | null {
    const state = this.getState();
    const idx = state.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    state.projects[idx] = { ...state.projects[idx], ...updates };
    this.notify();
    return state.projects[idx];
  }

  public static deleteProject(id: string): void {
    const state = this.getState();
    state.projects = state.projects.filter(p => p.id !== id);
    state.towers = state.towers.filter(t => t.projectId !== id);
    // Cleanup orphaned statuses and look-aheads
    Object.keys(state.packageStatuses).forEach(k => {
      if (k.startsWith(`${id}__`)) delete state.packageStatuses[k];
    });
    Object.keys(state.statutoryClearances).forEach(k => {
      if (k.startsWith(`${id}__`)) delete state.statutoryClearances[k];
    });
    state.lookAheads = state.lookAheads.filter(la => la.projectId !== id);
    this.notify();
  }

  public static getTowers(projectId?: string): TowerMaster[] {
    const state = this.getState();
    if (!projectId || projectId === "ALL") return state.towers;
    return state.towers.filter(t => t.projectId === projectId);
  }

  public static addTower(tower: Omit<TowerMaster, "id">): TowerMaster {
    const state = this.getState();
    const id = `twr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newTower: TowerMaster = { ...tower, id };
    state.towers.push(newTower);
    this.notify();
    return newTower;
  }

  public static updateTower(id: string, updates: Partial<Omit<TowerMaster, "id">>): TowerMaster | null {
    const state = this.getState();
    const idx = state.towers.findIndex(t => t.id === id);
    if (idx === -1) return null;
    state.towers[idx] = { ...state.towers[idx], ...updates };
    this.notify();
    return state.towers[idx];
  }

  public static deleteTower(id: string): void {
    const state = this.getState();
    state.towers = state.towers.filter(t => t.id !== id);
    state.lookAheads = state.lookAheads.filter(la => la.towerId !== id);
    this.notify();
  }

  // ============================================================================
  // Master Management: Disciplines & Work Packages (CRUD)
  // ============================================================================

  public static getDisciplines(): DisciplineMaster[] {
    return this.getState().disciplines;
  }

  public static addDiscipline(name: string, code: string, icon = "📁"): DisciplineMaster {
    const state = this.getState();
    const id = `disc-${Date.now().toString(36)}`;
    const newDisc: DisciplineMaster = { id, name, code, icon };
    state.disciplines.push(newDisc);
    this.notify();
    return newDisc;
  }

  public static getPackages(disciplineName?: string): WorkPackageMaster[] {
    const state = this.getState();
    if (!disciplineName || disciplineName === "ALL") return state.packages;
    return state.packages.filter(p => p.disciplineName === disciplineName);
  }

  public static addPackage(pkg: Omit<WorkPackageMaster, "id">): WorkPackageMaster {
    const state = this.getState();
    const id = `pkg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newPkg: WorkPackageMaster = { ...pkg, id };
    state.packages.push(newPkg);
    this.notify();
    return newPkg;
  }

  public static updatePackage(id: string, updates: Partial<Omit<WorkPackageMaster, "id">>): WorkPackageMaster | null {
    const state = this.getState();
    const idx = state.packages.findIndex(p => p.id === id);
    if (idx === -1) return null;
    state.packages[idx] = { ...state.packages[idx], ...updates };
    this.notify();
    return state.packages[idx];
  }

  public static deletePackage(id: string): void {
    const state = this.getState();
    state.packages = state.packages.filter(p => p.id !== id);
    Object.keys(state.packageStatuses).forEach(k => {
      if (k.endsWith(`__${id}`)) delete state.packageStatuses[k];
    });
    this.notify();
  }

  // ============================================================================
  // Master Management: Statutory Authorities (CRUD)
  // ============================================================================

  public static getAuthorities(): StatutoryAuthorityMaster[] {
    return this.getState().authorities;
  }

  public static addAuthority(auth: Omit<StatutoryAuthorityMaster, "id">): StatutoryAuthorityMaster {
    const state = this.getState();
    const id = `auth-${Date.now().toString(36)}`;
    const newAuth: StatutoryAuthorityMaster = { ...auth, id };
    state.authorities.push(newAuth);
    this.notify();
    return newAuth;
  }

  public static updateAuthority(id: string, updates: Partial<Omit<StatutoryAuthorityMaster, "id">>): StatutoryAuthorityMaster | null {
    const state = this.getState();
    const idx = state.authorities.findIndex(a => a.id === id);
    if (idx === -1) return null;
    state.authorities[idx] = { ...state.authorities[idx], ...updates };
    this.notify();
    return state.authorities[idx];
  }

  public static deleteAuthority(id: string): void {
    const state = this.getState();
    state.authorities = state.authorities.filter(a => a.id !== id);
    Object.keys(state.statutoryClearances).forEach(k => {
      if (k.endsWith(`__${id}`)) delete state.statutoryClearances[k];
    });
    this.notify();
  }

  // ============================================================================
  // Master Management: Consultants Directory (CRUD)
  // ============================================================================

  public static getConsultants(): ConsultantMaster[] {
    return this.getState().consultants || [];
  }

  public static addConsultant(c: Omit<ConsultantMaster, "id">): ConsultantMaster {
    const state = this.getState();
    const id = `cst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newC: ConsultantMaster = { ...c, id };
    if (!state.consultants) state.consultants = [];
    state.consultants.push(newC);
    this.notify();
    return newC;
  }

  public static updateConsultant(id: string, updates: Partial<Omit<ConsultantMaster, "id">>): ConsultantMaster | null {
    const state = this.getState();
    if (!state.consultants) return null;
    const idx = state.consultants.findIndex(c => c.id === id);
    if (idx === -1) return null;
    state.consultants[idx] = { ...state.consultants[idx], ...updates };
    this.notify();
    return state.consultants[idx];
  }

  public static deleteConsultant(id: string): void {
    const state = this.getState();
    if (!state.consultants) return;
    state.consultants = state.consultants.filter(c => c.id !== id);
    this.notify();
  }

  // ============================================================================
  // Transaction Fill: Package Status & Bulk Update
  // ============================================================================

  public static recordPackageStatus(
    projectId: string,
    towerId: string,
    packageId: string,
    status: PackageStatusEntry["status"],
    targetDate?: string,
    consultantName?: string,
    remarks?: string
  ): void {
    const state = this.getState();
    const key = `${projectId}__${towerId}__${packageId}`;
    state.packageStatuses[key] = {
      id: key,
      projectId,
      towerId,
      packageId,
      status,
      targetDate,
      consultantName,
      remarks,
      updatedAt: new Date().toISOString()
    };
    this.notify();
  }

  public static bulkRecordPackageStatus(
    updates: Array<{
      projectId: string;
      towerId: string;
      packageId: string;
      status: PackageStatusEntry["status"];
      targetDate?: string;
      consultantName?: string;
      remarks?: string;
    }>
  ): void {
    const state = this.getState();
    const now = new Date().toISOString();
    updates.forEach(u => {
      const key = `${u.projectId}__${u.towerId}__${u.packageId}`;
      state.packageStatuses[key] = {
        id: key,
        projectId: u.projectId,
        towerId: u.towerId,
        packageId: u.packageId,
        status: u.status,
        targetDate: u.targetDate,
        consultantName: u.consultantName,
        remarks: u.remarks,
        updatedAt: now
      };
    });
    this.notify();
  }

  public static getPackageStatus(projectId: string, towerId: string, packageId: string): PackageStatusEntry | undefined {
    const state = this.getState();
    return state.packageStatuses[`${projectId}__${towerId}__${packageId}`];
  }

  // ============================================================================
  // Transaction Fill: Look-Ahead Milestones (CRUD)
  // ============================================================================

  public static getLookAheads(projectId?: string, timeframe?: string): LookAheadEntry[] {
    const state = this.getState();
    return state.lookAheads.filter(item => {
      if (projectId && projectId !== "ALL" && item.projectId !== projectId) return false;
      if (timeframe && timeframe !== "ALL" && item.timeframe !== timeframe) return false;
      return true;
    });
  }

  public static addLookAhead(entry: Omit<LookAheadEntry, "id" | "isExpedited">): LookAheadEntry {
    const state = this.getState();
    const id = `la-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: LookAheadEntry = { ...entry, id, isExpedited: false };
    state.lookAheads.unshift(newItem);
    this.notify();
    return newItem;
  }

  public static updateLookAhead(id: string, updates: Partial<Omit<LookAheadEntry, "id">>): LookAheadEntry | null {
    const state = this.getState();
    const idx = state.lookAheads.findIndex(la => la.id === id);
    if (idx === -1) return null;
    state.lookAheads[idx] = { ...state.lookAheads[idx], ...updates };
    this.notify();
    return state.lookAheads[idx];
  }

  public static toggleExpediteLookAhead(id: string): void {
    const state = this.getState();
    const target = state.lookAheads.find(i => i.id === id);
    if (target) {
      target.isExpedited = !target.isExpedited;
      this.notify();
    }
  }

  public static deleteLookAhead(id: string): void {
    const state = this.getState();
    state.lookAheads = state.lookAheads.filter(i => i.id !== id);
    this.notify();
  }

  // ============================================================================
  // Transaction Fill: Statutory Clearance
  // ============================================================================

  public static recordStatutoryClearance(
    projectId: string,
    towerId: string,
    authorityId: string,
    onboardingStatus: StatutoryClearanceEntry["onboardingStatus"],
    targetApprovalDate?: string,
    remarks?: string
  ): void {
    const state = this.getState();
    const key = `${projectId}__${towerId}__${authorityId}`;
    state.statutoryClearances[key] = {
      id: key,
      projectId,
      towerId,
      authorityId,
      onboardingStatus,
      targetApprovalDate,
      remarks
    };
    this.notify();
  }

  public static getStatutoryClearance(projectId: string, towerId: string, authorityId: string): StatutoryClearanceEntry | undefined {
    const state = this.getState();
    return state.statutoryClearances[`${projectId}__${towerId}__${authorityId}`];
  }

  // ============================================================================
  // Workspace Template Reset / Pre-fill Actions
  // ============================================================================

  /**
   * Reset store to completely blank masters and entries (0 projects, 0 packages)
   */
  public static resetToBlank(): void {
    this.state = {
      projects: [],
      towers: [],
      disciplines: [
        { id: "disc-1", name: "Civil & RCC", code: "CIVIL", icon: "🏗️" },
        { id: "disc-2", name: "MEPF Services", code: "MEPF", icon: "⚡" },
        { id: "disc-3", name: "Finishing & Interiors", code: "FIN", icon: "🛋️" },
        { id: "disc-4", name: "Facade & Glazing", code: "FACADE", icon: "🏢" },
        { id: "disc-5", name: "Landscape & Infrastructure", code: "LAND", icon: "🌿" }
      ],
      packages: [],
      authorities: [
        { id: "auth-1", authorityName: "Municipal Corporation (BMC)", scope: "Sanction / IOD / CC Approvals", category: "Municipal" },
        { id: "auth-2", authorityName: "CFO Fire Department", scope: "Fire NOC & High-Rise Clearances", category: "Fire & Safety" },
        { id: "auth-3", authorityName: "Tree Authority", scope: "Tree Cutting / Transplantation NOC", category: "Environment" },
        { id: "auth-4", authorityName: "Civil Aviation (AAI)", scope: "Height Clearance NOC", category: "Aviation & Defence" },
        { id: "auth-5", authorityName: "MAHA-RERA", scope: "Project Registration & Compliances", category: "Legal & RERA" }
      ],
      consultants: [],
      packageStatuses: {},
      lookAheads: [],
      statutoryClearances: {}
    };
    this.notify();
  }

  /**
   * Reload / Populate with the EY Tender Reference Template extracted from the Excel file
   */
  public static loadEyReferenceTemplate(): void {
    this.state = this.buildEyReferenceSeed();
    this.notify();
  }

  // ============================================================================
  // Seed Generator: Translates reference Excel into dynamic master entities
  // ============================================================================

  private static buildEyReferenceSeed(): MasterStoreState {
    // 1. Projects Master
    const projects: ProjectMaster[] = EY_UNIQUE_PROJECTS.map((name, i) => ({
      id: `prj-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      code: `CDK-${name.slice(0, 3).toUpperCase()}`,
      name: name,
      location: "Mumbai MMR",
      createdAt: new Date().toISOString()
    }));

    const projectMap = new Map(projects.map(p => [p.name, p.id]));

    // 2. Towers Master
    const towers: TowerMaster[] = EY_PROJECT_COLUMNS.map((col, i) => {
      const pId = projectMap.get(col.project) || `prj-${i}`;
      let type: TowerMaster["towerType"] = "Sale";
      const tLower = col.tower.toLowerCase();
      if (tLower.includes("society")) type = "Society";
      else if (tLower.includes("commercial")) type = "Commercial";
      else if (tLower.includes("rehab") || tLower.includes("sra")) type = "Rehab / SRA";
      else if (tLower.includes("ptc") || tLower.includes("hostel")) type = "PTC / Hostel";
      else if (tLower.includes("plot")) type = "Plot / Infrastructure";

      return {
        id: `twr-${col.project}-${col.tower}`.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        projectId: pId,
        towerName: col.tower,
        towerType: type
      };
    });

    // 3. Disciplines Master
    const disciplineNames = Array.from(new Set(EY_TENDER_PACKAGES.map(p => p.category).filter(Boolean)));
    const disciplines: DisciplineMaster[] = disciplineNames.map((name, i) => ({
      id: `disc-${i + 1}`,
      name: name,
      code: name.slice(0, 4).toUpperCase(),
      icon: "⚙️"
    }));

    // 4. Packages Master
    const packages: WorkPackageMaster[] = EY_TENDER_PACKAGES.map((pkg, i) => ({
      id: `pkg-${pkg.id}`,
      disciplineId: `disc-${disciplineNames.indexOf(pkg.category) + 1}`,
      disciplineName: pkg.category,
      packageName: pkg.packageName,
      packageCode: `PKG-${(i + 1).toString().padStart(3, "0")}`
    }));

    // 5. Authorities Master
    const authorities: StatutoryAuthorityMaster[] = EY_LIAISON_CONSULTANTS.map((c, i) => ({
      id: `auth-${c.id}`,
      authorityName: c.consultantTitle,
      scope: c.scope,
      category: c.consultantTitle.toLowerCase().includes("fire") ? "Fire & Safety" :
                c.consultantTitle.toLowerCase().includes("tree") ? "Environment" :
                c.consultantTitle.toLowerCase().includes("aviation") ? "Aviation & Defence" :
                c.consultantTitle.toLowerCase().includes("rera") ? "Legal & RERA" : "Municipal"
    }));

    // 6. Map live package statuses from Excel matrix
    const packageStatuses: Record<string, PackageStatusEntry> = {};
    for (const pkg of EY_TENDER_PACKAGES) {
      for (const col of EY_PROJECT_COLUMNS) {
        const rawVal = pkg.statuses[`${col.project}__${col.tower}`] || "NA";
        if (rawVal === "NA" || rawVal === "-") continue;

        const pId = projectMap.get(col.project);
        const tId = `twr-${col.project}-${col.tower}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
        if (!pId) continue;

        let status: PackageStatusEntry["status"] = "NA";
        let targetDate: string | undefined = undefined;
        const lower = rawVal.toLowerCase();

        if (lower.includes("received")) status = "Received";
        else if (lower.includes("pending") || lower.includes("not onboard")) status = "Pending";
        else if (lower.includes("progress") || lower.includes("onboard") || lower.includes("track")) status = "In progress";
        else {
          status = "Target Date";
          targetDate = rawVal;
        }

        const key = `${pId}__${tId}__pkg-${pkg.id}`;
        packageStatuses[key] = {
          id: key,
          projectId: pId,
          towerId: tId,
          packageId: `pkg-${pkg.id}`,
          status,
          targetDate,
          remarks: rawVal,
          updatedAt: new Date().toISOString()
        };
      }
    }

    // 7. Map look-aheads
    const lookAheads: LookAheadEntry[] = EY_LOOK_AHEAD_ITEMS.map((item, i) => {
      const pId = projectMap.get(item.project) || `prj-0`;
      const tId = `twr-${item.project}-${item.tower}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
      return {
        id: `la-${i + 1}`,
        projectId: pId,
        towerId: tId,
        deliverableDescription: item.description,
        timeframe: item.timeframe,
        targetDate: item.timeframe === "30_DAYS" ? "30 Days Window" : "60 Days Window",
        priority: item.timeframe === "30_DAYS" ? "CRITICAL" : "HIGH",
        isExpedited: false,
        status: "PENDING"
      };
    });

    // 8. Map statutory clearances
    const statutoryClearances: Record<string, StatutoryClearanceEntry> = {};
    for (const auth of EY_LIAISON_CONSULTANTS) {
      for (const col of EY_PROJECT_COLUMNS) {
        const rawVal = auth.statuses[`${col.project}__${col.tower}`] || "NA";
        if (rawVal === "NA" || rawVal === "-") continue;

        const pId = projectMap.get(col.project);
        const tId = `twr-${col.project}-${col.tower}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
        if (!pId) continue;

        let status: StatutoryClearanceEntry["onboardingStatus"] = "NA";
        const lower = rawVal.toLowerCase();
        if (lower.includes("not onboard")) status = "Not Onboard";
        else if (lower.includes("fixed")) status = "Fixed consultant";
        else if (lower.includes("onboard")) status = "Onboard";
        else status = "Compliance Pending";

        const key = `${pId}__${tId}__auth-${auth.id}`;
        statutoryClearances[key] = {
          id: key,
          projectId: pId,
          towerId: tId,
          authorityId: `auth-${auth.id}`,
          onboardingStatus: status,
          remarks: rawVal
        };
      }
    }

    return {
      projects,
      towers,
      disciplines,
      packages,
      authorities,
      consultants: [],
      packageStatuses,
      lookAheads,
      statutoryClearances
    };
  }

  // ============================================================================
  // Backup & Restore: JSON Import & Export
  // ============================================================================

  public static exportToJson(): string {
    return JSON.stringify(this.getState(), null, 2);
  }

  public static importFromJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr) as MasterStoreState;
      if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.packages)) {
        throw new Error("Invalid structure");
      }
      this.state = parsed;
      this.notify();
      return true;
    } catch (e) {
      console.error("Failed to import JSON into DesignMasterStore:", e);
      return false;
    }
  }
}

