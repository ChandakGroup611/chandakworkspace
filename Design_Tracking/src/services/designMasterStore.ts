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
  StatutoryClearanceEntry,
  MatrixAuditLog,
  DesignRbacPolicy,
  DesignUserAccessRecord,
  DesignWorkspaceUser,
  DesignRoleCode,
  DesignRoleDefinition,
  DesignTicketAccessScope,
  DesignProjectAccessType
} from "../types/masterTypes";

import { 
  DrawingItem, 
  DrawingRevision, 
  TransmittalItem, 
  RfiItem,
  ConsultantPartner
} from "../types";

import { 
  EY_PROJECT_COLUMNS, 
  EY_UNIQUE_PROJECTS, 
  EY_TENDER_PACKAGES, 
  EY_LOOK_AHEAD_ITEMS, 
  EY_LIAISON_CONSULTANTS 
} from "../data/eyTenderData";

const STORAGE_KEY = "CHANDAK_DESIGN_MASTER_STORE_V4";

export const STANDARD_DESIGN_ROLES: DesignRoleDefinition[] = [
  {
    id: "role-design-admin",
    code: "DESIGN_ADMIN",
    label: "Design Administrator",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description: "Full administrative control across all projects, drawing releases, masters, and access permissions.",
    isSystem: true,
    ticketAccessScope: "ALL",
    defaultPermissions: {
      canMatrixEdit: true,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: true,
      canTransmittalsCreate: true,
      canRfisManage: true,
      canMastersManage: true,
    }
  },
  {
    id: "role-design-lead",
    code: "DESIGN_LEAD",
    label: "Design Lead / Principal",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    description: "Authority to approve drawings, stamp GFC releases, edit matrices, and manage RFIs.",
    isSystem: true,
    ticketAccessScope: "ALL",
    defaultPermissions: {
      canMatrixEdit: true,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: true,
      canTransmittalsCreate: true,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  {
    id: "role-design-coordinator",
    code: "DESIGN_COORDINATOR",
    label: "Design Coordinator",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description: "Coordinates consultants, maintains delivery matrix, uploads drawings, and prepares transmittals.",
    isSystem: true,
    ticketAccessScope: "ALL",
    defaultPermissions: {
      canMatrixEdit: true,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: true,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  {
    id: "role-consultant",
    code: "CONSULTANT",
    label: "Consultant / Architect",
    badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description: "External partner: Uploads drawings and revision sheets, responds to RFIs and queries.",
    isSystem: true,
    ticketAccessScope: "ASSIGNED_ONLY",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: true,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  {
    id: "role-site-engineer",
    code: "SITE_ENGINEER",
    label: "Site Execution Engineer",
    badgeColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    description: "Site execution team: Downloads GFC drawings, acknowledges transmittals, raises site RFIs.",
    isSystem: true,
    ticketAccessScope: "PROJECT_ONLY",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: false,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: true,
      canMastersManage: false,
    }
  },
  {
    id: "role-tpqa-auditor",
    code: "TPQA_AUDITOR",
    label: "TPQA / Quality Auditor",
    badgeColor: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    description: "Third-party quality auditor: Reviews drawing compliance, audit trails, and certification history.",
    isSystem: true,
    ticketAccessScope: "ALL",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: false,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: false,
      canMastersManage: false,
    }
  },
  {
    id: "role-viewer",
    code: "VIEWER",
    label: "Executive Viewer",
    badgeColor: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    description: "Read-only executive observer across dashboards, matrices, and project analytics.",
    isSystem: true,
    ticketAccessScope: "ALL",
    defaultPermissions: {
      canMatrixEdit: false,
      canDrawingsUpload: false,
      canDrawingsApproveGfc: false,
      canTransmittalsCreate: false,
      canRfisManage: false,
      canMastersManage: false,
    }
  }
];

export interface MasterStoreState {
  projects: ProjectMaster[];
  towers: TowerMaster[];
  disciplines: DisciplineMaster[];
  packages: WorkPackageMaster[];
  authorities: StatutoryAuthorityMaster[];
  consultants: ConsultantPartner[];
  packageStatuses: Record<string, PackageStatusEntry>; // Key: `${projectId}__${towerId}__${packageId}`
  lookAheads: LookAheadEntry[];
  statutoryClearances: Record<string, StatutoryClearanceEntry>; // Key: `${projectId}__${towerId}__${authorityId}`
  drawings: DrawingItem[];
  transmittals: TransmittalItem[];
  rfis: RfiItem[];
  auditLogs: MatrixAuditLog[];
  rbacPolicies: DesignRbacPolicy[];
  userAccessList: DesignUserAccessRecord[];
  customRoles: DesignRoleDefinition[];
}

export class DesignMasterStore {
  private static state: MasterStoreState | null = null;
  private static listeners: Set<() => void> = new Set();
  private static currentUserId: string | null = null;
  private static currentUserRole: string | null = null;

  public static setCurrentUser(userId: string | null, roleCode: string | null = null) {
    this.currentUserId = userId;
    if (roleCode) this.currentUserRole = roleCode;
  }

  public static getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  public static getCurrentUserRole(): string | null {
    return this.currentUserRole;
  }

  /**
   * Resolves the list of projects accessible to a given user.
   * If user has SPECIFIC / SELECTED_PROJECTS access, returns only assigned projects.
   * If user has ALL / ALL_PROJECTS or is Admin, returns all master projects.
   */
  public static getUserAccessibleProjects(userId?: string | null): ProjectMaster[] {
    const state = this.getState();
    const allProjects = state.projects || [];
    const uid = userId !== undefined ? userId : this.currentUserId;

    if (!uid) {
      return allProjects;
    }

    const currentRole = this.currentUserRole;
    if (currentRole === "SUPER_ADMIN" || currentRole === "SUPER_ADMINISTRATOR" || currentRole === "DESIGN_ADMIN") {
      return allProjects;
    }

    const access = (state.userAccessList || []).find(u => u.userId === uid);
    if (!access) {
      return allProjects;
    }

    if (access.designRole === "DESIGN_ADMIN" || access.designRole === "SUPER_ADMIN") {
      return allProjects;
    }

    const accessType = (access.projectAccessType || "").toUpperCase();
    if (accessType === "ALL" || accessType === "ALL_PROJECTS") {
      return allProjects;
    }

    if (accessType === "SPECIFIC" || accessType === "SELECTED_PROJECTS") {
      const assigned = access.assignedProjectIds || [];
      if (assigned.length === 0) {
        return [];
      }
      return allProjects.filter(p => {
        return assigned.some(a => {
          if (!a) return false;
          const aLower = a.toLowerCase().trim();
          return (
            a === p.id ||
            a === p.name ||
            a === p.code ||
            aLower === p.id.toLowerCase().trim() ||
            aLower === p.name.toLowerCase().trim() ||
            (p.code && aLower === p.code.toLowerCase().trim())
          );
        });
      });
    }

    return allProjects;
  }

  /**
   * Checks if a project (by ID, Name, or Code) is accessible to a user.
   */
  public static isProjectAccessible(projectIdOrName: string, userId?: string | null): boolean {
    if (!projectIdOrName || projectIdOrName === "ALL") return true;
    const accessible = this.getUserAccessibleProjects(userId);
    const target = projectIdOrName.toLowerCase().trim();
    return accessible.some(p => 
      p.id.toLowerCase().trim() === target ||
      p.name.toLowerCase().trim() === target ||
      (p.code && p.code.toLowerCase().trim() === target)
    );
  }

  /**
   * Resolves towers accessible to the current user (optionally filtered by projectId)
   */
  public static getUserAccessibleTowers(userId?: string | null, projectId?: string): TowerMaster[] {
    const accessibleProjects = this.getUserAccessibleProjects(userId);
    const accessibleProjectIds = new Set(accessibleProjects.map(p => p.id));
    const state = this.getState();
    let towers = (state.towers || []).filter(t => accessibleProjectIds.has(t.projectId));
    if (projectId && projectId !== "ALL") {
      towers = towers.filter(t => t.projectId === projectId);
    }
    return towers;
  }

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
   * Initializes store state from localStorage or starts clean with blank state
   */
  public static getState(): MasterStoreState {
    if (this.state) return this.state;

    if (typeof window !== "undefined") {
      try {
        // Clean up any legacy localStorage stores that had mock/predefined seed data
        ["CHANDAK_DESIGN_MASTER_STORE_V1", "CHANDAK_DESIGN_MASTER_STORE_V2", "CHANDAK_DESIGN_MASTER_STORE_V3"].forEach(k => {
          try { localStorage.removeItem(k); } catch (_) {}
        });

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Migration check for collections
          if (!parsed.projects || !Array.isArray(parsed.projects)) parsed.projects = [];
          if (!parsed.towers || !Array.isArray(parsed.towers)) parsed.towers = [];
          if (!parsed.disciplines || !Array.isArray(parsed.disciplines)) parsed.disciplines = [];
          if (!parsed.packages || !Array.isArray(parsed.packages)) parsed.packages = [];
          if (!parsed.authorities || !Array.isArray(parsed.authorities)) parsed.authorities = [];
          if (!parsed.drawings || !Array.isArray(parsed.drawings)) parsed.drawings = [];
          if (!parsed.transmittals || !Array.isArray(parsed.transmittals)) parsed.transmittals = [];
          if (!parsed.rfis || !Array.isArray(parsed.rfis)) parsed.rfis = [];
          if (!parsed.consultants || !Array.isArray(parsed.consultants)) parsed.consultants = [];
          if (!parsed.auditLogs || !Array.isArray(parsed.auditLogs)) parsed.auditLogs = [];
          if (!parsed.rbacPolicies || !Array.isArray(parsed.rbacPolicies)) parsed.rbacPolicies = this.buildDefaultRbacPolicies();
          if (!parsed.userAccessList || !Array.isArray(parsed.userAccessList)) parsed.userAccessList = [];
          if (!parsed.customRoles || !Array.isArray(parsed.customRoles)) parsed.customRoles = [];
          
          this.state = parsed;
          return this.state!;
        }
      } catch (e) {
        console.warn("Failed to load DesignMasterStore from localStorage, using blank state:", e);
      }
    }

    // Initialize with completely clean blank state (no predefined mock data)
    this.state = this.buildBlankState();
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

    // Sync tagged consultants' active projects
    if (newProj.taggedConsultants && newProj.taggedConsultants.length > 0) {
      newProj.taggedConsultants.forEach(cName => {
        const c = state.consultants.find(cons => cons.name === cName || cons.id === cName);
        if (c) {
          if (!c.activeProjects) c.activeProjects = [];
          if (!c.activeProjects.includes(newProj.name)) {
            c.activeProjects.push(newProj.name);
          }
          c.onboardingStatus = "Onboard";
        }
      });
    }

    this.notify();
    return newProj;
  }

  public static updateProject(id: string, updates: Partial<Omit<ProjectMaster, "id">>): ProjectMaster | null {
    const state = this.getState();
    const idx = state.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const oldProj = { ...state.projects[idx] };
    state.projects[idx] = { ...state.projects[idx], ...updates };
    const updatedProj = state.projects[idx];

    // Synchronize consultant tagging
    if (updates.taggedConsultants !== undefined || (updates.name && updates.name !== oldProj.name)) {
      const currentTagged = updatedProj.taggedConsultants || [];
      const oldTagged = oldProj.taggedConsultants || [];

      // Add project to newly tagged consultants
      currentTagged.forEach(cName => {
        const c = state.consultants.find(cons => cons.name === cName || cons.id === cName);
        if (c) {
          if (!c.activeProjects) c.activeProjects = [];
          if (!c.activeProjects.includes(updatedProj.name)) {
            c.activeProjects.push(updatedProj.name);
          }
          c.onboardingStatus = "Onboard";
        }
      });

      // Remove project from untagged consultants
      oldTagged.forEach(cName => {
        if (!currentTagged.includes(cName)) {
          const c = state.consultants.find(cons => cons.name === cName || cons.id === cName);
          if (c && c.activeProjects) {
            c.activeProjects = c.activeProjects.filter(p => p !== oldProj.name && p !== updatedProj.name);
            if (c.activeProjects.length === 0) {
              c.onboardingStatus = "Not Onboard";
            }
          }
        }
      });
    }

    this.notify();
    return state.projects[idx];
  }

  public static deleteProject(id: string): void {
    const state = this.getState();
    const proj = state.projects.find(p => p.id === id);
    state.projects = state.projects.filter(p => p.id !== id);
    state.towers = state.towers.filter(t => t.projectId !== id);

    // Untag from consultants
    if (proj) {
      state.consultants.forEach(c => {
        if (c.activeProjects) {
          c.activeProjects = c.activeProjects.filter(p => p !== proj.name);
          if (c.activeProjects.length === 0) {
            c.onboardingStatus = "Not Onboard";
          }
        }
      });
    }

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
  // Master Management: Consultants Directory (CRUD) with Multi-Expertise & Onboarding
  // ============================================================================

  public static getConsultants(): ConsultantPartner[] {
    const state = this.getState();
    if (!state.consultants) state.consultants = [];
    return state.consultants;
  }

  public static addConsultant(c: Omit<ConsultantPartner, "id" | "onboardingStatus"> & { onboardingStatus?: "Onboard" | "Not Onboard" }): ConsultantPartner {
    const state = this.getState();
    const id = `cst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const activeProjects = c.activeProjects || [];
    const onboardingStatus: "Onboard" | "Not Onboard" = activeProjects.length > 0 ? "Onboard" : "Not Onboard";

    const newC: ConsultantPartner = {
      ...c,
      id,
      expertise: c.expertise || [],
      activeProjects,
      onboardingStatus,
      totalDrawingsSubmitted: c.totalDrawingsSubmitted || 0,
      averageTatDays: c.averageTatDays || 3.0,
      rating: c.rating || 4.8,
      createdAt: new Date().toISOString()
    };
    
    if (!state.consultants) state.consultants = [];
    state.consultants.unshift(newC);
    this.notify();
    return newC;
  }

  public static updateConsultant(id: string, updates: Partial<Omit<ConsultantPartner, "id">>): ConsultantPartner | null {
    const state = this.getState();
    if (!state.consultants) return null;
    const idx = state.consultants.findIndex(c => c.id === id);
    if (idx === -1) return null;

    const current = state.consultants[idx];
    const newActiveProjects = updates.activeProjects !== undefined ? updates.activeProjects : current.activeProjects;
    const newOnboardingStatus: "Onboard" | "Not Onboard" = (newActiveProjects && newActiveProjects.length > 0) ? "Onboard" : "Not Onboard";

    state.consultants[idx] = {
      ...current,
      ...updates,
      activeProjects: newActiveProjects,
      onboardingStatus: newOnboardingStatus
    };
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
  // Transaction Fill: Package Status & Mandatory Planned/Actual Dates & Audit Trail
  // ============================================================================

  public static recordPackageStatus(
    projectId: string,
    towerId: string,
    packageId: string,
    status: PackageStatusEntry["status"],
    plannedDate?: string,
    actualDate?: string,
    targetDate?: string,
    consultantId?: string,
    consultantName?: string,
    remarks?: string,
    changedBy = "Lead Design Manager"
  ): void {
    const state = this.getState();
    const key = `${projectId}__${towerId}__${packageId}`;
    const prevEntry = state.packageStatuses[key];

    const todayIso = new Date().toISOString().split("T")[0];
    const finalPlanned = (plannedDate && plannedDate.trim()) ? plannedDate.trim() : (prevEntry?.plannedDate || todayIso);
    let finalActual = (actualDate && actualDate.trim()) ? actualDate.trim() : (prevEntry?.actualDate || (status === "Received" ? todayIso : "-"));

    state.packageStatuses[key] = {
      id: key,
      projectId,
      towerId,
      packageId,
      status,
      plannedDate: finalPlanned,
      actualDate: finalActual,
      targetDate: targetDate || finalPlanned,
      consultantId,
      consultantName,
      remarks,
      updatedAt: new Date().toISOString(),
      updatedBy: changedBy
    };

    // Find Project, Tower, Package details for Audit Log
    const proj = state.projects.find(p => p.id === projectId);
    const twr = state.towers.find(t => t.id === towerId);
    const pkg = state.packages.find(p => p.id === packageId);

    const auditLog: MatrixAuditLog = {
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      entryKey: key,
      projectId,
      projectName: proj?.name || "Development Project",
      towerId,
      towerName: twr?.towerName || "Wing",
      packageId,
      packageName: pkg?.packageName || "Tender Work Package",
      disciplineName: pkg?.disciplineName,
      previousStatus: prevEntry?.status || "NA",
      newStatus: status,
      previousPlannedDate: prevEntry?.plannedDate || "-",
      newPlannedDate: finalPlanned,
      previousActualDate: prevEntry?.actualDate || "-",
      newActualDate: finalActual,
      consultantName: consultantName || prevEntry?.consultantName,
      changedBy: changedBy || "Lead Design Manager",
      changedByEmail: "design.head@chandakgroup.com",
      timestamp: new Date().toISOString(),
      remarks: remarks || `Matrix update: Status set to "${status}"`,
      mailSent: true,
      mailRecipientCount: 3,
      mailSubject: `[Design Matrix Audit] ${proj?.name || "Project"} - ${pkg?.packageName || "Package"} status updated to "${status}"`
    };

    if (!state.auditLogs) state.auditLogs = [];
    state.auditLogs.unshift(auditLog);

    // Keep maximum 500 audit logs in memory
    if (state.auditLogs.length > 500) {
      state.auditLogs = state.auditLogs.slice(0, 500);
    }

    this.notify();
  }

  public static bulkRecordPackageStatus(
    updates: Array<{
      projectId: string;
      towerId: string;
      packageId: string;
      status: PackageStatusEntry["status"];
      plannedDate?: string;
      actualDate?: string;
      targetDate?: string;
      consultantId?: string;
      consultantName?: string;
      remarks?: string;
    }>,
    changedBy = "Lead Design Manager"
  ): void {
    const state = this.getState();
    const now = new Date().toISOString();
    const todayIso = now.split("T")[0];

    if (!state.auditLogs) state.auditLogs = [];

    updates.forEach(u => {
      const key = `${u.projectId}__${u.towerId}__${u.packageId}`;
      const prevEntry = state.packageStatuses[key];

      const finalPlanned = (u.plannedDate && u.plannedDate.trim()) ? u.plannedDate.trim() : (prevEntry?.plannedDate || todayIso);
      const finalActual = (u.actualDate && u.actualDate.trim()) ? u.actualDate.trim() : (prevEntry?.actualDate || (u.status === "Received" ? todayIso : "-"));

      state.packageStatuses[key] = {
        id: key,
        projectId: u.projectId,
        towerId: u.towerId,
        packageId: u.packageId,
        status: u.status,
        plannedDate: finalPlanned,
        actualDate: finalActual,
        targetDate: u.targetDate || finalPlanned,
        consultantId: u.consultantId || prevEntry?.consultantId,
        consultantName: u.consultantName || prevEntry?.consultantName,
        remarks: u.remarks,
        updatedAt: now,
        updatedBy: changedBy
      };

      const proj = state.projects.find(p => p.id === u.projectId);
      const twr = state.towers.find(t => t.id === u.towerId);
      const pkg = state.packages.find(p => p.id === u.packageId);

      const auditLog: MatrixAuditLog = {
        id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        entryKey: key,
        projectId: u.projectId,
        projectName: proj?.name || "Development Project",
        towerId: u.towerId,
        towerName: twr?.towerName || "Wing",
        packageId: u.packageId,
        packageName: pkg?.packageName || "Tender Work Package",
        disciplineName: pkg?.disciplineName,
        previousStatus: prevEntry?.status || "NA",
        newStatus: u.status,
        previousPlannedDate: prevEntry?.plannedDate || "-",
        newPlannedDate: finalPlanned,
        previousActualDate: prevEntry?.actualDate || "-",
        newActualDate: finalActual,
        consultantName: u.consultantName || prevEntry?.consultantName,
        changedBy: changedBy,
        changedByEmail: "design.head@chandakgroup.com",
        timestamp: now,
        remarks: u.remarks || `Batch matrix fill: Set to ${u.status}`,
        mailSent: true,
        mailRecipientCount: 3,
        mailSubject: `[Design Matrix Batch Audit] ${proj?.name || "Project"} - ${pkg?.packageName || "Package"} updated`
      };

      state.auditLogs.unshift(auditLog);
    });

    if (state.auditLogs.length > 500) {
      state.auditLogs = state.auditLogs.slice(0, 500);
    }

    this.notify();
  }

  public static getPackageStatus(projectId: string, towerId: string, packageId: string): PackageStatusEntry | undefined {
    const state = this.getState();
    return state.packageStatuses[`${projectId}__${towerId}__${packageId}`];
  }

  public static getAuditLogs(filters?: {
    projectId?: string;
    packageId?: string;
    entryKey?: string;
  }): MatrixAuditLog[] {
    const state = this.getState();
    let logs = state.auditLogs || [];
    if (filters?.entryKey) {
      logs = logs.filter(l => l.entryKey === filters.entryKey);
    }
    if (filters?.projectId && filters.projectId !== "ALL") {
      logs = logs.filter(l => l.projectId === filters.projectId);
    }
    if (filters?.packageId && filters.packageId !== "ALL") {
      logs = logs.filter(l => l.packageId === filters.packageId);
    }
    return logs;
  }

  // ============================================================================
  // Dynamic Role Management & Role CRUD (Workspace / IAM Style)
  // ============================================================================

  public static getRoles(): DesignRoleDefinition[] {
    const state = this.getState();
    const custom = state.customRoles || [];
    return [...STANDARD_DESIGN_ROLES, ...custom];
  }

  public static getRoleByCode(code: string): DesignRoleDefinition | undefined {
    return this.getRoles().find(r => r.code === code);
  }

  public static addCustomRole(roleData: Omit<DesignRoleDefinition, "id" | "isSystem" | "createdAt" | "updatedAt">): DesignRoleDefinition {
    const state = this.getState();
    if (!state.customRoles) state.customRoles = [];

    const cleanCode = roleData.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const existing = this.getRoleByCode(cleanCode);
    if (existing) {
      throw new Error(`A role with code '${cleanCode}' already exists.`);
    }

    const now = new Date().toISOString();
    const newRole: DesignRoleDefinition = {
      ...roleData,
      id: `role-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`,
      code: cleanCode,
      isSystem: false,
      createdAt: now,
      updatedAt: now
    };

    state.customRoles.push(newRole);

    // Initialize baseline policies for all modules for this new custom role
    const modules: DesignRbacPolicy["module"][] = [
      "DESIGN_MATRIX",
      "DRAWINGS",
      "LOOK_AHEAD",
      "LIAISON",
      "TRANSMITTALS",
      "RFIS",
      "CONSULTANTS",
      "MASTERS"
    ];

    modules.forEach(m => {
      const isDrawingOrRfi = m === "DRAWINGS" || m === "RFIS" || m === "TRANSMITTALS";
      state.rbacPolicies.push({
        id: `rbac-${cleanCode.toLowerCase()}-${m.toLowerCase()}`,
        roleCode: cleanCode,
        roleName: newRole.label,
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: newRole.defaultPermissions.canMatrixEdit || (isDrawingOrRfi && newRole.defaultPermissions.canDrawingsUpload),
        canRead: true,
        canUpdate: newRole.defaultPermissions.canMatrixEdit || (isDrawingOrRfi && newRole.defaultPermissions.canRfisManage),
        canDelete: false,
        canApprove: newRole.defaultPermissions.canDrawingsApproveGfc && (m === "DRAWINGS" || m === "DESIGN_MATRIX"),
        canExport: true,
        ticketAccessScope: newRole.ticketAccessScope || "ASSIGNED_ONLY",
        updatedAt: now
      });
    });

    this.notify();
    return newRole;
  }

  public static updateCustomRole(code: string, updates: Partial<DesignRoleDefinition>): DesignRoleDefinition {
    const state = this.getState();
    if (!state.customRoles) state.customRoles = [];
    const idx = state.customRoles.findIndex(r => r.code === code);
    if (idx === -1) {
      throw new Error(`Custom role with code '${code}' not found.`);
    }

    const updatedRole: DesignRoleDefinition = {
      ...state.customRoles[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    state.customRoles[idx] = updatedRole;

    // Update role names in matching policies
    if (updates.label) {
      state.rbacPolicies.forEach(p => {
        if (p.roleCode === code) {
          p.roleName = updates.label!;
        }
      });
    }

    this.notify();
    return updatedRole;
  }

  public static deleteCustomRole(code: string): boolean {
    const state = this.getState();
    const isStandard = STANDARD_DESIGN_ROLES.some(r => r.code === code);
    if (isStandard) {
      throw new Error(`Standard system roles cannot be deleted.`);
    }

    state.customRoles = (state.customRoles || []).filter(r => r.code !== code);
    state.rbacPolicies = (state.rbacPolicies || []).filter(p => p.roleCode !== code);

    // If users were assigned this role, downgrade them to VIEWER
    (state.userAccessList || []).forEach(u => {
      if (u.designRole === code) {
        u.designRole = "VIEWER";
      }
    });

    this.notify();
    return true;
  }

  public static cloneCustomRole(
    sourceRoleCode: string, 
    newRoleData: { code: string; label: string; description: string; badgeColor?: string; departmentId?: string; departmentName?: string }
  ): DesignRoleDefinition {
    const sourceRole = this.getRoleByCode(sourceRoleCode);
    if (!sourceRole) {
      throw new Error(`Source role '${sourceRoleCode}' not found.`);
    }

    return this.addCustomRole({
      code: newRoleData.code,
      label: newRoleData.label,
      description: newRoleData.description,
      badgeColor: newRoleData.badgeColor || "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
      departmentId: newRoleData.departmentId,
      departmentName: newRoleData.departmentName,
      defaultPermissions: { ...sourceRole.defaultPermissions },
      ticketAccessScope: sourceRole.ticketAccessScope || "ASSIGNED_ONLY"
    });
  }

  // ============================================================================
  // RBAC Policies: Project-wise / Role-based / CRUD & Ticket options
  // ============================================================================

  public static getRbacPolicies(): DesignRbacPolicy[] {
    const state = this.getState();
    if (!state.rbacPolicies || state.rbacPolicies.length === 0) {
      state.rbacPolicies = this.buildDefaultRbacPolicies();
    }
    return state.rbacPolicies;
  }

  public static updateRbacPolicy(policyId: string, updates: Partial<DesignRbacPolicy>): void {
    const state = this.getState();
    if (!state.rbacPolicies) state.rbacPolicies = this.buildDefaultRbacPolicies();
    const idx = state.rbacPolicies.findIndex(p => p.id === policyId);
    if (idx >= 0) {
      state.rbacPolicies[idx] = {
        ...state.rbacPolicies[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.notify();
    }
  }

  public static bulkSaveRbacPolicies(policies: DesignRbacPolicy[]): void {
    const state = this.getState();
    state.rbacPolicies = policies;
    this.notify();
  }

  public static saveRbacPolicy(policy: DesignRbacPolicy): void {
    const state = this.getState();
    if (!state.rbacPolicies) state.rbacPolicies = this.buildDefaultRbacPolicies();
    const idx = state.rbacPolicies.findIndex(p => p.id === policy.id);
    if (idx >= 0) {
      state.rbacPolicies[idx] = { ...policy, updatedAt: new Date().toISOString() };
    } else {
      state.rbacPolicies.push({ ...policy, updatedAt: new Date().toISOString() });
    }
    this.notify();
  }

  public static hasPermission(
    roleCode: string,
    projectId: string,
    module: DesignRbacPolicy["module"],
    action: "CREATE" | "READ" | "UPDATE" | "DELETE" | "APPROVE" | "EXPORT"
  ): boolean {
    const policies = this.getRbacPolicies();
    
    // Super admin always has bypass access
    if (roleCode === "SUPER_ADMIN" || roleCode === "SUPER_ADMINISTRATOR" || roleCode === "DESIGN_ADMIN") return true;

    // Find match by role, project (or "ALL"), and module (or "ALL")
    const match = policies.find(p => 
      p.roleCode === roleCode &&
      (p.projectId === "ALL" || p.projectId === projectId) &&
      (p.module === "ALL" || p.module === module)
    );

    if (!match) return true; // Default fallback permissive if no explicit deny

    switch (action) {
      case "CREATE": return match.canCreate;
      case "READ": return match.canRead;
      case "UPDATE": return match.canUpdate;
      case "DELETE": return match.canDelete;
      case "APPROVE": return !!match.canApprove;
      case "EXPORT": return !!match.canExport;
      default: return true;
    }
  }

  // ============================================================================
  // User Access & RBAC Governance (Chandak Workspace Integration)
  // ============================================================================

  public static getUserAccessList(): DesignUserAccessRecord[] {
    const state = this.getState();
    return state.userAccessList || [];
  }

  public static getUserAccess(userId: string): DesignUserAccessRecord | undefined {
    const state = this.getState();
    return (state.userAccessList || []).find(u => u.userId === userId);
  }

  public static saveUserAccess(record: DesignUserAccessRecord): void {
    const state = this.getState();
    if (!state.userAccessList) state.userAccessList = [];
    const idx = state.userAccessList.findIndex(u => u.userId === record.userId);
    if (idx >= 0) {
      state.userAccessList[idx] = {
        ...state.userAccessList[idx],
        ...record,
        updatedAt: new Date().toISOString()
      };
    } else {
      state.userAccessList.push({
        ...record,
        id: record.id || `dua-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        updatedAt: new Date().toISOString()
      });
    }
    this.notify();
  }

  public static deleteUserAccess(userId: string): void {
    const state = this.getState();
    if (!state.userAccessList) return;
    state.userAccessList = state.userAccessList.filter(u => u.userId !== userId);
    this.notify();
  }

  public static hasUserProjectPermission(
    userId: string,
    projectId: string,
    permission: "matrixEdit" | "drawingsUpload" | "gfcApproval" | "transmittalsCreate" | "rfisManage" | "mastersManage",
    itemContext?: {
      creatorId?: string;
      assigneeId?: string;
      consultantId?: string;
      userDepartmentId?: string;
      itemDepartmentId?: string;
    }
  ): boolean {
    const state = this.getState();
    const access = (state.userAccessList || []).find(u => u.userId === userId);
    if (!access) return true; // Default fallback permissive if no explicit deny

    if (access.designRole === "DESIGN_ADMIN" || access.designRole === "SUPER_ADMIN") return true;

    // Check project restriction
    if (access.projectAccessType === "SPECIFIC" && !access.assignedProjectIds.includes(projectId)) {
      return false;
    }

    // Check ticket-based / item-based scope restriction if applicable
    const ticketScope = access.ticketAccessScope || "ALL";
    if (itemContext && ticketScope !== "ALL") {
      if (ticketScope === "NONE") return false;
      if (ticketScope === "ASSIGNED_ONLY" && itemContext.assigneeId && itemContext.assigneeId !== userId && itemContext.consultantId !== userId) {
        return false;
      }
      if (ticketScope === "CREATED_ONLY" && itemContext.creatorId && itemContext.creatorId !== userId) {
        return false;
      }
      if (ticketScope === "DEPARTMENT_ONLY" && itemContext.userDepartmentId && itemContext.itemDepartmentId && itemContext.userDepartmentId !== itemContext.itemDepartmentId) {
        return false;
      }
    }

    switch (permission) {
      case "matrixEdit": return access.canMatrixEdit;
      case "drawingsUpload": return access.canDrawingsUpload;
      case "gfcApproval": return access.canDrawingsApproveGfc;
      case "transmittalsCreate": return access.canTransmittalsCreate;
      case "rfisManage": return access.canRfisManage;
      case "mastersManage": return access.canMastersManage;
      default: return true;
    }
  }

  public static buildDefaultRbacPolicies(): DesignRbacPolicy[] {
    const modules: DesignRbacPolicy["module"][] = [
      "DESIGN_MATRIX",
      "DRAWINGS",
      "LOOK_AHEAD",
      "LIAISON",
      "TRANSMITTALS",
      "RFIS",
      "CONSULTANTS",
      "MASTERS"
    ];
    
    const policies: DesignRbacPolicy[] = [];
    const now = new Date().toISOString();

    // 1. Super Admin: full access
    modules.forEach(m => {
      policies.push({
        id: `rbac-super-admin-${m.toLowerCase()}`,
        roleCode: "SUPER_ADMIN",
        roleName: "Super Administrator",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
        ticketAccessScope: "ALL",
        updatedAt: now
      });
    });

    // 2. Design Administrator: full administrative CRUD
    modules.forEach(m => {
      policies.push({
        id: `rbac-admin-${m.toLowerCase()}`,
        roleCode: "DESIGN_ADMIN",
        roleName: "Design Administrator",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
        ticketAccessScope: "ALL",
        updatedAt: now
      });
    });

    // 3. Design Lead: full CRUD + GFC approval
    modules.forEach(m => {
      policies.push({
        id: `rbac-lead-${m.toLowerCase()}`,
        roleCode: "DESIGN_LEAD",
        roleName: "Design Lead / Principal",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: m !== "CONSULTANTS" && m !== "MASTERS",
        canApprove: true,
        canExport: true,
        ticketAccessScope: "ALL",
        updatedAt: now
      });
    });

    // 4. Design Coordinator: Create, Read, Update, Transmittals, RFIs
    modules.forEach(m => {
      policies.push({
        id: `rbac-coordinator-${m.toLowerCase()}`,
        roleCode: "DESIGN_COORDINATOR",
        roleName: "Design Coordinator",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: m !== "MASTERS",
        canRead: true,
        canUpdate: m !== "MASTERS",
        canDelete: false,
        canApprove: false,
        canExport: true,
        ticketAccessScope: "ALL",
        updatedAt: now
      });
    });

    // 5. Site Engineer: Read on Matrix, C/R/U on Transmittals & RFIs
    modules.forEach(m => {
      policies.push({
        id: `rbac-site-${m.toLowerCase()}`,
        roleCode: "SITE_ENGINEER",
        roleName: "Site Execution Engineer",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: m === "TRANSMITTALS" || m === "RFIS",
        canRead: true,
        canUpdate: m === "TRANSMITTALS" || m === "RFIS",
        canDelete: false,
        canApprove: false,
        canExport: true,
        ticketAccessScope: "PROJECT_ONLY",
        updatedAt: now
      });
    });

    // 6. Consultant External: R on Drawings & Matrix, U on RFIs & Approvals
    modules.forEach(m => {
      policies.push({
        id: `rbac-consultant-${m.toLowerCase()}`,
        roleCode: "CONSULTANT",
        roleName: "Empanelled Consultant Partner",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: m === "DRAWINGS" || m === "RFIS",
        canRead: true,
        canUpdate: m === "DRAWINGS" || m === "RFIS",
        canDelete: false,
        canApprove: false,
        canExport: false,
        ticketAccessScope: "ASSIGNED_ONLY",
        updatedAt: now
      });
    });

    // 7. TPQA Auditor
    modules.forEach(m => {
      policies.push({
        id: `rbac-tpqa-${m.toLowerCase()}`,
        roleCode: "TPQA_AUDITOR",
        roleName: "TPQA / Quality Auditor",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canExport: true,
        ticketAccessScope: "ALL",
        updatedAt: now
      });
    });

    // 8. Viewer: Read-only
    modules.forEach(m => {
      policies.push({
        id: `rbac-viewer-${m.toLowerCase()}`,
        roleCode: "VIEWER",
        roleName: "Executive Viewer",
        projectId: "ALL",
        projectName: "All Development Projects",
        module: m,
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
        canExport: true,
        ticketAccessScope: "ALL",
        updatedAt: now
      });
    });

    return policies;
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
  // Drawing Register & Document Management
  // ============================================================================

  public static getDrawings(): DrawingItem[] {
    return this.getState().drawings || [];
  }

  public static getDrawingById(id: string): DrawingItem | undefined {
    return this.getDrawings().find(d => d.id === id);
  }

  public static saveDrawing(drawing: DrawingItem): void {
    const state = this.getState();
    if (!state.drawings) state.drawings = [];
    const index = state.drawings.findIndex(d => d.id === drawing.id);
    if (index >= 0) {
      state.drawings[index] = drawing;
    } else {
      state.drawings.unshift(drawing);
    }
    this.notify();
  }

  public static updateDrawingStatus(id: string, status: DrawingItem["status"], approvedDate?: string): void {
    const state = this.getState();
    const item = (state.drawings || []).find(d => d.id === id);
    if (item) {
      item.status = status;
      if (approvedDate) item.approvedDate = approvedDate;
      this.notify();
    }
  }

  public static deleteDrawing(id: string): void {
    const state = this.getState();
    state.drawings = (state.drawings || []).filter(d => d.id !== id);
    this.notify();
  }

  // ============================================================================
  // Transmittals & GFC Dispatch Slips
  // ============================================================================

  public static getTransmittals(): TransmittalItem[] {
    return this.getState().transmittals || [];
  }

  public static getTransmittalById(id: string): TransmittalItem | undefined {
    return this.getTransmittals().find(t => t.id === id);
  }

  public static saveTransmittal(transmittal: TransmittalItem): void {
    const state = this.getState();
    if (!state.transmittals) state.transmittals = [];
    const index = state.transmittals.findIndex(t => t.id === transmittal.id);
    if (index >= 0) {
      state.transmittals[index] = transmittal;
    } else {
      state.transmittals.unshift(transmittal);
    }
    this.notify();
  }

  public static acknowledgeTransmittal(id: string, acknowledgedBy: string): void {
    const state = this.getState();
    const item = (state.transmittals || []).find(t => t.id === id);
    if (item) {
      item.status = "ACKNOWLEDGED";
      item.acknowledgedAt = new Date().toISOString().split("T")[0];
      item.acknowledgedBy = acknowledgedBy;
      this.notify();
    }
  }

  public static deleteTransmittal(id: string): void {
    const state = this.getState();
    state.transmittals = (state.transmittals || []).filter(t => t.id !== id);
    this.notify();
  }

  // ============================================================================
  // RFIs & Site Clash Query Log
  // ============================================================================

  public static getRfis(): RfiItem[] {
    return this.getState().rfis || [];
  }

  public static getRfiById(id: string): RfiItem | undefined {
    return this.getRfis().find(r => r.id === id);
  }

  public static saveRfi(rfi: RfiItem): void {
    const state = this.getState();
    if (!state.rfis) state.rfis = [];
    const index = state.rfis.findIndex(r => r.id === rfi.id);
    if (index >= 0) {
      state.rfis[index] = rfi;
    } else {
      state.rfis.unshift(rfi);
    }
    this.notify();
  }

  public static resolveRfi(
    id: string, 
    response: string, 
    respondedBy: string, 
    resolvingRevisionNumber?: string
  ): void {
    const state = this.getState();
    const item = (state.rfis || []).find(r => r.id === id);
    if (item) {
      item.status = "CLARIFIED";
      item.consultantResponse = response;
      item.respondedBy = respondedBy;
      item.respondedDate = new Date().toISOString().split("T")[0];
      if (resolvingRevisionNumber) {
        item.resolvingRevisionNumber = resolvingRevisionNumber;
      }
      this.notify();
    }
  }

  public static deleteRfi(id: string): void {
    const state = this.getState();
    state.rfis = (state.rfis || []).filter(r => r.id !== id);
    this.notify();
  }

  // ============================================================================
  // Workspace Template Reset / Pre-fill Actions
  // ============================================================================

  /**
   * Generates a completely empty blank state with 0 predefined data
   */
  public static buildBlankState(): MasterStoreState {
    return {
      projects: [],
      towers: [],
      disciplines: [],
      packages: [],
      authorities: [],
      consultants: [],
      packageStatuses: {},
      lookAheads: [],
      statutoryClearances: {},
      drawings: [],
      transmittals: [],
      rfis: [],
      auditLogs: [],
      rbacPolicies: this.buildDefaultRbacPolicies(),
      userAccessList: [],
      customRoles: []
    };
  }

  /**
   * Reset store to completely blank masters and entries (0 projects, 0 packages, 0 drawings)
   */
  public static resetToBlank(): void {
    this.state = this.buildBlankState();
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
        let plannedDate = "2026-04-15";
        let actualDate = "-";
        const lower = rawVal.toLowerCase();

        if (lower.includes("received")) {
          status = "Received";
          actualDate = "2026-04-10";
        } else if (lower.includes("pending") || lower.includes("not onboard")) {
          status = "Pending";
          plannedDate = "2026-05-01";
        } else if (lower.includes("progress") || lower.includes("onboard") || lower.includes("track")) {
          status = "In progress";
          plannedDate = "2026-04-20";
        } else {
          status = "Target Date";
          targetDate = rawVal;
          plannedDate = rawVal;
        }

        const key = `${pId}__${tId}__pkg-${pkg.id}`;
        packageStatuses[key] = {
          id: key,
          projectId: pId,
          towerId: tId,
          packageId: `pkg-${pkg.id}`,
          status,
          plannedDate,
          actualDate,
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

    // 9. Initial Audit Logs seed
    const auditLogs: MatrixAuditLog[] = [
      {
        id: "aud-seed-1",
        entryKey: `prj-chandak-stella__twr-chandak-stella-tower-1__pkg-1`,
        projectId: "prj-chandak-stella",
        projectName: "Chandak Stella",
        towerId: "twr-chandak-stella-tower-1",
        towerName: "Tower 1",
        packageId: "pkg-1",
        packageName: "RCC & Structural Core",
        disciplineName: "Civil & RCC",
        previousStatus: "In progress",
        newStatus: "Received",
        previousPlannedDate: "2026-04-15",
        newPlannedDate: "2026-04-15",
        previousActualDate: "-",
        newActualDate: "2026-04-10",
        consultantName: "JW Consultants LLP",
        changedBy: "Senior Design Lead",
        changedByEmail: "design.head@chandakgroup.com",
        timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        remarks: "Approved structural tender package received and verified against drawings.",
        mailSent: true,
        mailRecipientCount: 3,
        mailSubject: "[Design Matrix Audit] Chandak Stella - RCC & Structural Core marked Received"
      },
      {
        id: "aud-seed-2",
        entryKey: `prj-chandak-highscape-city__twr-chandak-highscape-city-tower-a__pkg-3`,
        projectId: "prj-chandak-highscape-city",
        projectName: "Chandak Highscape City",
        towerId: "twr-chandak-highscape-city-tower-a",
        towerName: "Tower A",
        packageId: "pkg-3",
        packageName: "HVAC & Mechanical Ventilation",
        disciplineName: "MEPF Services",
        previousStatus: "Pending",
        newStatus: "In progress",
        previousPlannedDate: "2026-05-01",
        newPlannedDate: "2026-04-25",
        previousActualDate: "-",
        newActualDate: "-",
        consultantName: "Enersave MEP Consultants",
        changedBy: "Design Coordination Manager",
        changedByEmail: "coordination@chandakgroup.com",
        timestamp: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
        remarks: "Target delivery expedited after coordination review meeting.",
        mailSent: true,
        mailRecipientCount: 2,
        mailSubject: "[Design Matrix Audit] Chandak Highscape City - HVAC target expedited"
      }
    ];

    return {
      projects,
      towers,
      disciplines,
      packages,
      authorities,
      consultants: [],
      packageStatuses,
      lookAheads,
      statutoryClearances,
      drawings: [],
      transmittals: [],
      rfis: [],
      auditLogs,
      rbacPolicies: this.buildDefaultRbacPolicies(),
      userAccessList: [],
      customRoles: []
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
