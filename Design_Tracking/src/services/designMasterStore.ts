// ==============================================================================
// Master-Driven Design & Tender Tracking Store (Chandak Workspace)
// Description: Fully dynamic master-driven store. No hardcoded data. 
//              All outputs (Matrix, Look-Ahead, Liaisoning) are generated on-the-fly 
//              from user-defined masters and user-filled transaction data.
// ==============================================================================

import { 
  ProjectMaster, 
  TowerMaster, 
  SubProjectMaster,
  PackageMaster,
  SubPackageMaster,
  DisciplineMaster, 
  CategoryMaster,
  WorkPackageMaster, 
  StatutoryAuthorityMaster, 
  ConsultantMaster,
  PackageStatusEntry,
  LookAheadEntry,
  StatutoryClearanceEntry,
  MatrixAuditLog,
  ForeignKeyDependencyItem,
  EntityDependencyReport,
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

export const DEFAULT_DESIGN_CATEGORIES: PackageMaster[] = [
  { id: "cat-arch", name: "Architectural", code: "ARCH", icon: "🏛️", color: "purple", description: "Master planning, floor plans, elevations, sections & 3D visualization" },
  { id: "cat-str", name: "Structural", code: "STR", icon: "🏗️", color: "blue", description: "Substructure, superstructure, RCC frames, steel detailing & PT slabs" },
  { id: "cat-mep", name: "MEPF Services", code: "MEP", icon: "⚡", color: "amber", description: "HVAC, plumbing, electrical distribution, fire fighting & ELV" },
  { id: "cat-civ", name: "Civil & RCC", code: "CIV", icon: "🧱", color: "slate", description: "Earthwork, excavation, RCC core, masonry & basic shell works" },
  { id: "cat-facd", name: "Façade & Glazing", code: "FACD", icon: "🏢", color: "teal", description: "Curtain walls, aluminum composite panels, railings & fenestration" },
  { id: "cat-land", name: "Landscape & Infrastructure", code: "LAND", icon: "🌳", color: "emerald", description: "Hardscape, softscape, storm water drainage, external paving & lighting" },
  { id: "cat-int", name: "Interior & Fitouts", code: "INT", icon: "🛋️", color: "rose", description: "Lobbies, clubhouse interiors, show flats, common areas & finishes" },
  { id: "cat-geo", name: "Geotechnical & Soil", code: "GEO", icon: "⛰️", color: "amber", description: "Soil investigations, piling designs, slope stability & shoring systems" },
  { id: "cat-fire", name: "Fire & Life Safety", code: "FIRE", icon: "🔥", color: "rose", description: "Hydrant systems, sprinklers, smoke management & statutory fire compliance" },
  { id: "cat-env", name: "Environmental & Green", code: "ENV", icon: "🌱", color: "emerald", description: "IGBC/LEED rating, solar integration, STP/WTP, rainwater harvesting" },
  { id: "cat-traf", name: "Traffic & Parking", code: "TRAF", icon: "🚗", color: "blue", description: "Vehicular circulation, ramp slope design, automated puzzle/stack parking" },
  { id: "cat-bim", name: "BIM Coordination", code: "BIM", icon: "💻", color: "indigo", description: "3D clash detection, LOD 300/400 models, asset tagging & 4D simulation" },
  { id: "cat-spec", name: "Specialist Studies", code: "SPEC", icon: "🔬", color: "purple", description: "Wind tunnel analysis, acoustic studies, thermal comfort & lighting simulation" }
];

export const DEFAULT_DESIGN_PACKAGES: PackageMaster[] = DEFAULT_DESIGN_CATEGORIES;

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
          if (!parsed.disciplines || !Array.isArray(parsed.disciplines) || parsed.disciplines.length === 0) {
            parsed.disciplines = [...DEFAULT_DESIGN_CATEGORIES];
          }
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
    this.saveToStorage(true);
    return this.state;
  }

  private static saveTimeout: ReturnType<typeof setTimeout> | null = null;

  private static saveToStorage(immediate = false) {
    if (typeof window !== "undefined" && this.state) {
      if (immediate) {
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout);
          this.saveTimeout = null;
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
          console.warn("Failed to save DesignMasterStore to localStorage:", e);
        }
        return;
      }

      // Debounce non-immediate serialization (250ms) to avoid locking the UI thread during rapid updates
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        try {
          if (this.state) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
          }
        } catch (e) {
          console.warn("Failed to save DesignMasterStore to localStorage:", e);
        }
        this.saveTimeout = null;
      }, 250);
    }
  }

  // ============================================================================
  // Foreign Key Dependency & Referential Integrity Analysis
  // ============================================================================

  public static logAudit(logData: Partial<MatrixAuditLog>): MatrixAuditLog {
    const state = this.getState();
    if (!state.auditLogs) state.auditLogs = [];

    const newLog: MatrixAuditLog = {
      id: logData.id || `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      entryKey: logData.entryKey,
      action: logData.action || "STATUS_CHANGE",
      entityType: logData.entityType,
      entityId: logData.entityId,
      entityName: logData.entityName,
      projectId: logData.projectId,
      projectName: logData.projectName,
      towerId: logData.towerId,
      towerName: logData.towerName,
      packageId: logData.packageId,
      packageName: logData.packageName,
      disciplineName: logData.disciplineName,
      previousStatus: logData.previousStatus,
      newStatus: logData.newStatus,
      previousPlannedDate: logData.previousPlannedDate,
      newPlannedDate: logData.newPlannedDate,
      previousActualDate: logData.previousActualDate,
      newActualDate: logData.newActualDate,
      consultantId: logData.consultantId,
      consultantName: logData.consultantName,
      previousValue: logData.previousValue,
      newValue: logData.newValue,
      impactSummary: logData.impactSummary,
      foreignKeyDependencies: logData.foreignKeyDependencies,
      changedBy: logData.changedBy || "Design Manager",
      changedByEmail: logData.changedByEmail || "design.manager@chandakgroup.com",
      timestamp: logData.timestamp || new Date().toISOString(),
      remarks: logData.remarks,
      reason: logData.reason,
      mailSent: !!logData.mailSent,
      mailRecipientCount: logData.mailRecipientCount || 0,
      mailSubject: logData.mailSubject
    };

    state.auditLogs.unshift(newLog);
    if (state.auditLogs.length > 5000) {
      state.auditLogs = state.auditLogs.slice(0, 5000);
    }
    return newLog;
  }

  /**
   * Evaluates all inbound foreign key references for a given entity before deletion or update
   */
  public static getEntityDependencies(
    entityType: EntityDependencyReport["entityType"],
    entityId: string
  ): EntityDependencyReport {
    const state = this.getState();
    const dependencies: ForeignKeyDependencyItem[] = [];

    if (entityType === "PROJECT" || entityType === "SUB_PROJECT") {
      const proj = state.projects.find(p => p.id === entityId);
      const projName = proj?.name || entityId;

      // 1. Child Sub-Projects
      const childSubProjects = state.projects.filter(p => p.parentProjectId === entityId);
      if (childSubProjects.length > 0) {
        dependencies.push({
          foreignKeyField: "parentProjectId",
          referencedEntityType: "Child Sub-Projects / Phases",
          count: childSubProjects.length,
          previewItems: childSubProjects.map(p => p.name),
          canCascade: true
        });
      }

      // 2. Tower Wings
      const towers = state.towers.filter(t => t.projectId === entityId);
      if (towers.length > 0) {
        dependencies.push({
          foreignKeyField: "projectId",
          referencedEntityType: "Tower Wings",
          count: towers.length,
          previewItems: towers.map(t => t.towerName),
          canCascade: true
        });
      }

      // 3. Matrix Status Cells
      const matrixKeys = Object.keys(state.packageStatuses).filter(k => k.startsWith(`${entityId}__`));
      if (matrixKeys.length > 0) {
        dependencies.push({
          foreignKeyField: "projectId",
          referencedEntityType: "Matrix Status Transaction Cells",
          count: matrixKeys.length,
          previewItems: matrixKeys.slice(0, 4),
          canCascade: true
        });
      }

      // 4. Look-Ahead Milestones
      const lookAheads = state.lookAheads.filter(la => la.projectId === entityId);
      if (lookAheads.length > 0) {
        dependencies.push({
          foreignKeyField: "projectId",
          referencedEntityType: "Look-Ahead Milestones",
          count: lookAheads.length,
          previewItems: lookAheads.map(la => la.deliverableDescription).slice(0, 3),
          canCascade: true
        });
      }

      // 5. Statutory Clearances
      const statutoryKeys = Object.keys(state.statutoryClearances).filter(k => k.startsWith(`${entityId}__`));
      if (statutoryKeys.length > 0) {
        dependencies.push({
          foreignKeyField: "projectId",
          referencedEntityType: "Statutory Authority NOC Records",
          count: statutoryKeys.length,
          previewItems: statutoryKeys.slice(0, 3),
          canCascade: true
        });
      }

      // 6. Drawings
      const drawings = (state.drawings || []).filter(d => d.project === projName || d.project === entityId);
      if (drawings.length > 0) {
        dependencies.push({
          foreignKeyField: "project",
          referencedEntityType: "Drawing Register CAD/PDF Files",
          count: drawings.length,
          previewItems: drawings.map(d => `${d.code} (${d.title})`).slice(0, 3),
          canCascade: true
        });
      }

      // 7. Transmittals
      const transmittals = (state.transmittals || []).filter(t => t.projectId === entityId || t.projectName === projName);
      if (transmittals.length > 0) {
        dependencies.push({
          foreignKeyField: "projectId",
          referencedEntityType: "Drawing Transmittals",
          count: transmittals.length,
          previewItems: transmittals.map(t => t.transmittalNumber).slice(0, 3),
          canCascade: true
        });
      }

      // 8. RFIs
      const rfis = (state.rfis || []).filter(r => r.projectId === entityId || r.projectName === projName);
      if (rfis.length > 0) {
        dependencies.push({
          foreignKeyField: "projectId",
          referencedEntityType: "Design RFI Queries",
          count: rfis.length,
          previewItems: rfis.map(r => r.rfiNumber).slice(0, 3),
          canCascade: true
        });
      }

      // 9. Consultant Partner Tags
      const taggedCons = (state.consultants || []).filter(c => c.activeProjects?.includes(projName));
      if (taggedCons.length > 0) {
        dependencies.push({
          foreignKeyField: "activeProjects",
          referencedEntityType: "Tagged Consultant Partners",
          count: taggedCons.length,
          previewItems: taggedCons.map(c => c.name).slice(0, 3),
          canCascade: false
        });
      }

      const totalDependent = dependencies.reduce((acc, d) => acc + d.count, 0);
      return {
        entityType,
        entityId,
        entityName: projName,
        totalDependentRecords: totalDependent,
        dependencies,
        isReferencedByOtherRecords: totalDependent > 0
      };
    }

    if (entityType === "TOWER") {
      const twr = state.towers.find(t => t.id === entityId);
      const twrName = twr?.towerName || entityId;

      // 1. Matrix Status Cells
      const matrixKeys = Object.keys(state.packageStatuses).filter(k => k.includes(`__${entityId}__`));
      if (matrixKeys.length > 0) {
        dependencies.push({
          foreignKeyField: "towerId",
          referencedEntityType: "Matrix Status Cells",
          count: matrixKeys.length,
          previewItems: matrixKeys.slice(0, 4),
          canCascade: true
        });
      }

      // 2. Look-Aheads
      const lookAheads = state.lookAheads.filter(la => la.towerId === entityId);
      if (lookAheads.length > 0) {
        dependencies.push({
          foreignKeyField: "towerId",
          referencedEntityType: "Look-Ahead Milestones",
          count: lookAheads.length,
          previewItems: lookAheads.map(la => la.deliverableDescription).slice(0, 3),
          canCascade: true
        });
      }

      // 3. Statutory Clearances
      const statutoryKeys = Object.keys(state.statutoryClearances).filter(k => k.includes(`__${entityId}__`));
      if (statutoryKeys.length > 0) {
        dependencies.push({
          foreignKeyField: "towerId",
          referencedEntityType: "Statutory Authority Clearances",
          count: statutoryKeys.length,
          previewItems: statutoryKeys.slice(0, 3),
          canCascade: true
        });
      }

      // 4. Drawings
      const drawings = (state.drawings || []).filter(d => (d as any).towerId === entityId || (d as any).tower === twrName);
      if (drawings.length > 0) {
        dependencies.push({
          foreignKeyField: "towerId",
          referencedEntityType: "Drawing Register",
          count: drawings.length,
          previewItems: drawings.map(d => d.code).slice(0, 3),
          canCascade: true
        });
      }

      const totalDependent = dependencies.reduce((acc, d) => acc + d.count, 0);
      return {
        entityType,
        entityId,
        entityName: twrName,
        totalDependentRecords: totalDependent,
        dependencies,
        isReferencedByOtherRecords: totalDependent > 0
      };
    }

    if (entityType === "PACKAGE") {
      const pkg = state.packages.find(p => p.id === entityId);
      const pkgName = pkg?.packageName || entityId;

      // 1. Matrix Status Cells
      const matrixKeys = Object.keys(state.packageStatuses).filter(k => k.endsWith(`__${entityId}`));
      if (matrixKeys.length > 0) {
        dependencies.push({
          foreignKeyField: "packageId",
          referencedEntityType: "Matrix Status Cells",
          count: matrixKeys.length,
          previewItems: matrixKeys.slice(0, 4),
          canCascade: true
        });
      }

      // 2. Drawings by Discipline / Package
      if (pkg?.disciplineName) {
        const drawings = (state.drawings || []).filter(d => d.discipline === pkg.disciplineName);
        if (drawings.length > 0) {
          dependencies.push({
            foreignKeyField: "discipline",
            referencedEntityType: "Discipline Drawings",
            count: drawings.length,
            previewItems: drawings.map(d => d.code).slice(0, 3),
            canCascade: false
          });
        }
      }

      // 3. Consultant Expertise
      const consWithPkg = (state.consultants || []).filter(c => c.expertise?.includes(pkgName));
      if (consWithPkg.length > 0) {
        dependencies.push({
          foreignKeyField: "expertise",
          referencedEntityType: "Consultants Tagged with Expertise",
          count: consWithPkg.length,
          previewItems: consWithPkg.map(c => c.name).slice(0, 3),
          canCascade: false
        });
      }

      const totalDependent = dependencies.reduce((acc, d) => acc + d.count, 0);
      return {
        entityType,
        entityId,
        entityName: pkgName,
        totalDependentRecords: totalDependent,
        dependencies,
        isReferencedByOtherRecords: totalDependent > 0
      };
    }

    if (entityType === "CONSULTANT") {
      const cons = state.consultants.find(c => c.id === entityId || c.name === entityId);
      const consName = cons?.name || entityId;

      // 1. Tagged Projects
      const projects = state.projects.filter(p => p.taggedConsultants?.includes(consName) || p.taggedConsultants?.includes(entityId));
      if (projects.length > 0) {
        dependencies.push({
          foreignKeyField: "taggedConsultants",
          referencedEntityType: "Assigned Development Projects",
          count: projects.length,
          previewItems: projects.map(p => p.name).slice(0, 3),
          canCascade: false
        });
      }

      // 2. Tagged Towers
      const towers = state.towers.filter(t => t.taggedConsultants?.includes(consName) || t.taggedConsultants?.includes(entityId));
      if (towers.length > 0) {
        dependencies.push({
          foreignKeyField: "taggedConsultants",
          referencedEntityType: "Assigned Tower Wings",
          count: towers.length,
          previewItems: towers.map(t => t.towerName).slice(0, 3),
          canCascade: false
        });
      }

      // 3. Matrix Status Assignments
      const matrixEntries = Object.values(state.packageStatuses).filter(ps => ps.consultantId === entityId || ps.consultantName === consName);
      if (matrixEntries.length > 0) {
        dependencies.push({
          foreignKeyField: "consultantId",
          referencedEntityType: "Matrix Status Assignments",
          count: matrixEntries.length,
          previewItems: matrixEntries.map(m => m.id).slice(0, 3),
          canCascade: false
        });
      }

      // 4. Drawings Submitted
      const drawings = (state.drawings || []).filter(d => d.consultant === consName || d.consultant === entityId);
      if (drawings.length > 0) {
        dependencies.push({
          foreignKeyField: "consultant",
          referencedEntityType: "Submitted Drawings",
          count: drawings.length,
          previewItems: drawings.map(d => d.code).slice(0, 3),
          canCascade: false
        });
      }

      // 5. Transmittals
      const transmittals = (state.transmittals || []).filter(t => t.recipientAgency === consName || t.recipientAgency?.includes(consName));
      if (transmittals.length > 0) {
        dependencies.push({
          foreignKeyField: "recipientAgency",
          referencedEntityType: "Transmittals",
          count: transmittals.length,
          previewItems: transmittals.map(t => t.transmittalNumber).slice(0, 3),
          canCascade: false
        });
      }

      // 6. RFIs
      const rfis = (state.rfis || []).filter(r => r.assignedConsultant === consName);
      if (rfis.length > 0) {
        dependencies.push({
          foreignKeyField: "assignedConsultant",
          referencedEntityType: "Assigned RFIs",
          count: rfis.length,
          previewItems: rfis.map(r => r.rfiNumber).slice(0, 3),
          canCascade: false
        });
      }

      const totalDependent = dependencies.reduce((acc, d) => acc + d.count, 0);
      return {
        entityType,
        entityId,
        entityName: consName,
        totalDependentRecords: totalDependent,
        dependencies,
        isReferencedByOtherRecords: totalDependent > 0
      };
    }

    if (entityType === "AUTHORITY") {
      const auth = state.authorities.find(a => a.id === entityId);
      const authName = auth?.authorityName || entityId;

      // 1. Statutory Clearances
      const clearances = Object.keys(state.statutoryClearances).filter(k => k.endsWith(`__${entityId}`));
      if (clearances.length > 0) {
        dependencies.push({
          foreignKeyField: "authorityId",
          referencedEntityType: "Statutory Authority Clearances",
          count: clearances.length,
          previewItems: clearances.slice(0, 3),
          canCascade: true
        });
      }

      const totalDependent = dependencies.reduce((acc, d) => acc + d.count, 0);
      return {
        entityType,
        entityId,
        entityName: authName,
        totalDependentRecords: totalDependent,
        dependencies,
        isReferencedByOtherRecords: totalDependent > 0
      };
    }

    if (entityType === "CATEGORY") {
      const cat = state.disciplines.find(d => d.id === entityId || d.name === entityId);
      const catName = cat?.name || entityId;

      // 1. Work Packages
      const pkgs = state.packages.filter(p => p.disciplineName === catName || p.disciplineId === entityId);
      if (pkgs.length > 0) {
        dependencies.push({
          foreignKeyField: "disciplineName",
          referencedEntityType: "Work Packages",
          count: pkgs.length,
          previewItems: pkgs.map(p => p.packageName).slice(0, 3),
          canCascade: true
        });
      }

      // 2. Consultants
      const consultants = state.consultants.filter(c => (c.categories && c.categories.includes(catName)) || c.category === catName);
      if (consultants.length > 0) {
        dependencies.push({
          foreignKeyField: "categories",
          referencedEntityType: "Tagged Consultant Partners",
          count: consultants.length,
          previewItems: consultants.map(c => c.name).slice(0, 3),
          canCascade: false
        });
      }

      // 3. Projects
      const projects = state.projects.filter(p => p.taggedCategories?.includes(catName));
      if (projects.length > 0) {
        dependencies.push({
          foreignKeyField: "taggedCategories",
          referencedEntityType: "Tagged Projects",
          count: projects.length,
          previewItems: projects.map(p => p.name).slice(0, 3),
          canCascade: false
        });
      }

      // 4. Tower Wings / Sub-Projects
      const towers = state.towers.filter(t => t.taggedCategories?.includes(catName));
      if (towers.length > 0) {
        dependencies.push({
          foreignKeyField: "taggedCategories",
          referencedEntityType: "Tagged Sub-Project Wings",
          count: towers.length,
          previewItems: towers.map(t => t.towerName).slice(0, 3),
          canCascade: false
        });
      }

      // 5. Drawings
      const drawings = (state.drawings || []).filter(d => d.discipline === catName);
      if (drawings.length > 0) {
        dependencies.push({
          foreignKeyField: "discipline",
          referencedEntityType: "Drawing Sheets",
          count: drawings.length,
          previewItems: drawings.map(d => d.code).slice(0, 3),
          canCascade: false
        });
      }

      const totalDependent = dependencies.reduce((acc, d) => acc + d.count, 0);
      return {
        entityType,
        entityId,
        entityName: catName,
        totalDependentRecords: totalDependent,
        dependencies,
        isReferencedByOtherRecords: totalDependent > 0
      };
    }

    return {
      entityType,
      entityId,
      entityName: entityId,
      totalDependentRecords: 0,
      dependencies: [],
      isReferencedByOtherRecords: false
    };
  }

  // ============================================================================
  // Master Management: Projects & Towers (CRUD) with Foreign Key Audit Tracking
  // ============================================================================

  public static getProjects(): ProjectMaster[] {
    return this.getState().projects;
  }

  public static addProject(proj: Omit<ProjectMaster, "id" | "createdAt">, createdBy = "Design Lead"): ProjectMaster {
    const state = this.getState();
    const id = `prj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newProj: ProjectMaster = {
      ...proj,
      id,
      createdAt: new Date().toISOString()
    };
    state.projects.push(newProj);

    // Ensure project has at least one default Tower Wing
    const defaultTower: TowerMaster = {
      id: `twr-${id}-wing-a`,
      projectId: id,
      towerName: "Wing A",
      towerType: "Sale"
    };
    state.towers.push(defaultTower);

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

    // Log Audit Trail for Project Creation
    this.logAudit({
      action: "CREATE",
      entityType: newProj.isSubProject ? "SUB_PROJECT" : "PROJECT",
      entityId: id,
      entityName: newProj.name,
      projectId: id,
      projectName: newProj.name,
      newValue: newProj,
      impactSummary: `Initialized new ${newProj.isSubProject ? "Sub-Project" : "Project"} with default Wing A and ${newProj.taggedConsultants?.length || 0} tagged consultants`,
      changedBy: createdBy,
      remarks: `Created ${newProj.name} (${newProj.code})`
    });

    this.notify();
    return newProj;
  }

  public static updateProject(
    id: string,
    updates: Partial<Omit<ProjectMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): ProjectMaster | null {
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

    // Foreign Key propagation if Project Name changed
    if (updates.name && updates.name !== oldProj.name) {
      // 1. Update child sub-projects parentProjectName
      state.projects.forEach(p => {
        if (p.parentProjectId === id) {
          p.parentProjectName = updates.name;
        }
      });
      // 2. Update drawings referencing old project name
      (state.drawings || []).forEach(d => {
        if (d.project === oldProj.name) d.project = updates.name!;
      });
      // 3. Update transmittals referencing old project name
      (state.transmittals || []).forEach(t => {
        if (t.projectId === id || t.projectName === oldProj.name) t.projectName = updates.name!;
      });
      // 4. Update RFIs referencing old project name
      (state.rfis || []).forEach(r => {
        if (r.projectId === id || r.projectName === oldProj.name) r.projectName = updates.name!;
      });
    }

    // Log Audit Trail for Project Update
    this.logAudit({
      action: "UPDATE",
      entityType: updatedProj.isSubProject ? "SUB_PROJECT" : "PROJECT",
      entityId: id,
      entityName: updatedProj.name,
      projectId: id,
      projectName: updatedProj.name,
      previousValue: oldProj,
      newValue: updatedProj,
      impactSummary: `Updated project parameters and synchronized foreign key references across transactions`,
      changedBy,
      reason,
      remarks: reason || `Updated parameters for ${updatedProj.name}`
    });

    this.notify();
    return state.projects[idx];
  }

  public static deleteProject(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    const state = this.getState();
    const proj = state.projects.find(p => p.id === id);
    const depReport = this.getEntityDependencies(proj?.isSubProject ? "SUB_PROJECT" : "PROJECT", id);

    // 1. Remove project & towers
    state.projects = state.projects.filter(p => p.id !== id);
    state.towers = state.towers.filter(t => t.projectId !== id);

    // 2. Untag from consultants
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

    // 3. Cascade cleanup orphaned matrix statuses, clearances, and look-aheads
    Object.keys(state.packageStatuses).forEach(k => {
      if (k.startsWith(`${id}__`)) delete state.packageStatuses[k];
    });
    Object.keys(state.statutoryClearances).forEach(k => {
      if (k.startsWith(`${id}__`)) delete state.statutoryClearances[k];
    });
    state.lookAheads = state.lookAheads.filter(la => la.projectId !== id);

    // 4. Clean up child sub-projects
    state.projects.forEach(p => {
      if (p.parentProjectId === id) {
        p.parentProjectId = undefined;
        p.parentProjectName = undefined;
      }
    });

    // 5. Log comprehensive CASCADE_DELETE Audit Trail
    this.logAudit({
      action: "CASCADE_DELETE",
      entityType: proj?.isSubProject ? "SUB_PROJECT" : "PROJECT",
      entityId: id,
      entityName: proj?.name || "Development Project",
      projectId: id,
      projectName: proj?.name || "Development Project",
      previousValue: proj,
      newValue: null,
      impactSummary: `Cascaded & removed ${depReport.totalDependentRecords} foreign key dependent records (${depReport.dependencies.map((d: ForeignKeyDependencyItem) => `${d.count} ${d.referencedEntityType}`).join(", ") || "No dependencies"})`,
      foreignKeyDependencies: depReport.dependencies,
      changedBy: deletedBy,
      reason,
      remarks: reason || `Deleted project "${proj?.name}" and cascaded all foreign key dependencies.`
    });

    this.notify();
    return depReport;
  }

  public static getTowers(projectId?: string): TowerMaster[] {
    const state = this.getState();
    if (!projectId || projectId === "ALL") return state.towers;
    return state.towers.filter(t => t.projectId === projectId);
  }

  public static addTower(tower: Omit<TowerMaster, "id">, createdBy = "Design Lead"): TowerMaster {
    const state = this.getState();
    const id = `twr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newTower: TowerMaster = { ...tower, id };
    state.towers.push(newTower);

    // Sync tagged consultants' active projects
    if (newTower.taggedConsultants && newTower.taggedConsultants.length > 0) {
      const parentProj = state.projects.find(p => p.id === newTower.projectId);
      const projLabel = parentProj ? `${parentProj.name} (${newTower.towerName})` : newTower.towerName;
      newTower.taggedConsultants.forEach(cName => {
        const c = state.consultants.find(cons => cons.name === cName || cons.id === cName);
        if (c) {
          if (!c.activeProjects) c.activeProjects = [];
          if (!c.activeProjects.includes(projLabel)) {
            c.activeProjects.push(projLabel);
          }
          c.onboardingStatus = "Onboard";
        }
      });
    }

    const parentProj = state.projects.find(p => p.id === newTower.projectId);
    this.logAudit({
      action: "CREATE",
      entityType: "TOWER",
      entityId: id,
      entityName: newTower.towerName,
      projectId: newTower.projectId,
      projectName: parentProj?.name,
      towerId: id,
      towerName: newTower.towerName,
      newValue: newTower,
      impactSummary: `Created Wing "${newTower.towerName}" (${newTower.towerType}) under ${parentProj?.name || "Project"}`,
      changedBy: createdBy
    });

    this.notify();
    return newTower;
  }

  public static updateTower(
    id: string,
    updates: Partial<Omit<TowerMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): TowerMaster | null {
    const state = this.getState();
    const idx = state.towers.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const oldTower = { ...state.towers[idx] };
    state.towers[idx] = { ...state.towers[idx], ...updates };
    const updatedTower = state.towers[idx];

    // Sync tagged consultants' active projects
    if (updates.taggedConsultants !== undefined) {
      const parentProj = state.projects.find(p => p.id === updatedTower.projectId);
      const projLabel = parentProj ? `${parentProj.name} (${updatedTower.towerName})` : updatedTower.towerName;
      (updatedTower.taggedConsultants || []).forEach(cName => {
        const c = state.consultants.find(cons => cons.name === cName || cons.id === cName);
        if (c) {
          if (!c.activeProjects) c.activeProjects = [];
          if (!c.activeProjects.includes(projLabel)) {
            c.activeProjects.push(projLabel);
          }
          c.onboardingStatus = "Onboard";
        }
      });
    }

    const parentProj = state.projects.find(p => p.id === updatedTower.projectId);
    this.logAudit({
      action: "UPDATE",
      entityType: "TOWER",
      entityId: id,
      entityName: updatedTower.towerName,
      projectId: updatedTower.projectId,
      projectName: parentProj?.name,
      towerId: id,
      towerName: updatedTower.towerName,
      previousValue: oldTower,
      newValue: updatedTower,
      impactSummary: `Updated Wing "${updatedTower.towerName}" parameters`,
      changedBy,
      reason
    });

    this.notify();
    return state.towers[idx];
  }

  public static deleteTower(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    const state = this.getState();
    const twr = state.towers.find(t => t.id === id);
    const depReport = this.getEntityDependencies("TOWER", id);
    const parentProj = twr ? state.projects.find(p => p.id === twr.projectId) : null;

    // 1. Remove tower
    state.towers = state.towers.filter(t => t.id !== id);

    // 2. Cascade cleanup matrix cells, look-aheads, statutory clearances referencing towerId
    Object.keys(state.packageStatuses).forEach(k => {
      if (k.includes(`__${id}__`)) delete state.packageStatuses[k];
    });
    Object.keys(state.statutoryClearances).forEach(k => {
      if (k.includes(`__${id}__`)) delete state.statutoryClearances[k];
    });
    state.lookAheads = state.lookAheads.filter(la => la.towerId !== id);

    // 3. Log Audit Trail
    this.logAudit({
      action: "CASCADE_DELETE",
      entityType: "TOWER",
      entityId: id,
      entityName: twr?.towerName || "Wing",
      projectId: twr?.projectId,
      projectName: parentProj?.name,
      towerId: id,
      towerName: twr?.towerName,
      previousValue: twr,
      newValue: null,
      impactSummary: `Cascaded & removed ${depReport.totalDependentRecords} records attached to Wing "${twr?.towerName}"`,
      foreignKeyDependencies: depReport.dependencies,
      changedBy: deletedBy,
      reason
    });

    this.notify();
    return depReport;
  }

  // ============================================================================
  // Master Management: Package Master (Parent Engineering Packages / Disciplines)
  // ============================================================================

  public static getPackagesMaster(): PackageMaster[] {
    const state = this.getState();
    if (!state.disciplines || state.disciplines.length === 0) {
      state.disciplines = [...DEFAULT_DESIGN_PACKAGES];
    }
    return state.disciplines;
  }

  public static getCategories(): CategoryMaster[] {
    return this.getPackagesMaster();
  }

  public static getDisciplines(): DisciplineMaster[] {
    return this.getPackagesMaster();
  }

  public static getPackageMaster(id: string): PackageMaster | undefined {
    return this.getPackagesMaster().find(p => p.id === id || p.name === id);
  }

  public static addPackageMaster(
    pkg: Omit<PackageMaster, "id" | "createdAt">,
    createdBy = "Design Lead"
  ): PackageMaster {
    const state = this.getState();
    const id = `pkg-mst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newPkg: PackageMaster = {
      ...pkg,
      id,
      code: pkg.code?.trim().toUpperCase() || pkg.name.slice(0, 4).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    if (!state.disciplines) state.disciplines = [];
    state.disciplines.push(newPkg);

    this.logAudit({
      action: "CREATE",
      entityType: "CATEGORY",
      entityId: id,
      entityName: newPkg.name,
      newValue: newPkg,
      impactSummary: `Created Package Master "${newPkg.name}" (${newPkg.code})`,
      changedBy: createdBy
    });

    this.notify();
    return newPkg;
  }

  public static addCategory(
    category: Omit<CategoryMaster, "id" | "createdAt">,
    createdBy = "Design Lead"
  ): CategoryMaster {
    return this.addPackageMaster(category, createdBy);
  }

  public static addDiscipline(name: string, code: string, icon = "📁", createdBy = "Design Lead"): DisciplineMaster {
    return this.addPackageMaster({ name, code, icon }, createdBy);
  }

  public static updatePackageMaster(
    id: string,
    updates: Partial<Omit<PackageMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): PackageMaster | null {
    const state = this.getState();
    const idx = state.disciplines.findIndex(d => d.id === id);
    if (idx === -1) return null;

    const oldPkg = { ...state.disciplines[idx] };
    state.disciplines[idx] = { ...state.disciplines[idx], ...updates };
    const updatedPkg = state.disciplines[idx];

    // If package/category name changed, propagate to sub packages, consultants, drawings, projects
    if (updates.name && updates.name !== oldPkg.name) {
      state.packages.forEach(p => {
        if (p.disciplineName === oldPkg.name || p.disciplineId === id || p.packageName === oldPkg.name) {
          p.disciplineName = updates.name!;
          p.packageName = updates.name!;
        }
      });
      state.consultants.forEach(c => {
        if (c.categories && c.categories.includes(oldPkg.name)) {
          c.categories = c.categories.map(cat => cat === oldPkg.name ? updates.name! : cat);
        }
        if (c.category === oldPkg.name) {
          c.category = updates.name!;
        }
      });
      state.projects.forEach(p => {
        if (p.taggedCategories?.includes(oldPkg.name)) {
          p.taggedCategories = p.taggedCategories.map(cat => cat === oldPkg.name ? updates.name! : cat);
        }
      });
      state.towers.forEach(t => {
        if (t.taggedCategories?.includes(oldPkg.name)) {
          t.taggedCategories = t.taggedCategories.map(cat => cat === oldPkg.name ? updates.name! : cat);
        }
      });
      (state.drawings || []).forEach(d => {
        if (d.discipline === oldPkg.name) {
          d.discipline = updates.name! as any;
        }
      });
    }

    this.logAudit({
      action: "UPDATE",
      entityType: "CATEGORY",
      entityId: id,
      entityName: updatedPkg.name,
      previousValue: oldPkg,
      newValue: updatedPkg,
      impactSummary: `Updated Package Master "${updatedPkg.name}" parameters`,
      changedBy,
      reason
    });

    this.notify();
    return state.disciplines[idx];
  }

  public static updateCategory(
    id: string,
    updates: Partial<Omit<CategoryMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): CategoryMaster | null {
    return this.updatePackageMaster(id, updates, changedBy, reason);
  }

  public static deletePackageMaster(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    const state = this.getState();
    const pkg = state.disciplines.find(d => d.id === id);
    const depReport = this.getEntityDependencies("CATEGORY", id);
    const pkgName = pkg?.name || id;

    // 1. Remove package from disciplines list
    state.disciplines = state.disciplines.filter(d => d.id !== id);

    // 2. Untag from consultants
    state.consultants.forEach(c => {
      if (c.categories) {
        c.categories = c.categories.filter(ct => ct !== pkgName && ct !== id);
      }
    });

    // 3. Untag from projects & towers
    state.projects.forEach(p => {
      if (p.taggedCategories) {
        p.taggedCategories = p.taggedCategories.filter(ct => ct !== pkgName && ct !== id);
      }
    });
    state.towers.forEach(t => {
      if (t.taggedCategories) {
        t.taggedCategories = t.taggedCategories.filter(ct => ct !== pkgName && ct !== id);
      }
    });

    // 4. Log Audit Trail
    this.logAudit({
      action: "CASCADE_DELETE",
      entityType: "CATEGORY",
      entityId: id,
      entityName: pkgName,
      previousValue: pkg,
      newValue: null,
      impactSummary: `Removed Package Master "${pkgName}" and untagged from ${depReport.totalDependentRecords} referencing records`,
      foreignKeyDependencies: depReport.dependencies,
      changedBy: deletedBy,
      reason
    });

    this.notify();
    return depReport;
  }

  public static deleteCategory(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    return this.deletePackageMaster(id, reason, deletedBy);
  }

  /**
   * Resolves all unique Package Master names associated with a list of consultant partner names
   */
  public static getPackagesForConsultants(consultantNamesOrIds: string[]): string[] {
    return this.getCategoriesForConsultants(consultantNamesOrIds);
  }

  public static getCategoriesForConsultants(consultantNamesOrIds: string[]): string[] {
    const state = this.getState();
    const categoriesSet = new Set<string>();

    if (!consultantNamesOrIds || consultantNamesOrIds.length === 0) return [];

    consultantNamesOrIds.forEach(cIdentifier => {
      const c = state.consultants.find(cons => cons.name === cIdentifier || cons.id === cIdentifier);
      if (c) {
        if (c.categories && Array.isArray(c.categories)) {
          c.categories.forEach(cat => { if (cat) categoriesSet.add(cat); });
        }
        if (c.category && typeof c.category === "string") {
          categoriesSet.add(c.category);
        }
      }
    });

    return Array.from(categoriesSet);
  }

  // ============================================================================
  // Sub-Project Master Methods (Clean Sub-Project / Tower Alias Methods)
  // ============================================================================

  public static getSubProjects(projectId?: string): SubProjectMaster[] {
    const state = this.getState();
    let twrs = state.towers || [];
    if (projectId && projectId !== "ALL") {
      twrs = twrs.filter(t => t.projectId === projectId);
    }
    return twrs.map(t => {
      const parent = state.projects.find(p => p.id === t.projectId);
      return {
        ...t,
        projectName: parent ? parent.name : undefined
      };
    });
  }

  public static addSubProject(subProject: Omit<SubProjectMaster, "id">, createdBy = "Design Lead"): SubProjectMaster {
    return this.addTower(subProject, createdBy);
  }

  public static updateSubProject(
    id: string,
    updates: Partial<Omit<SubProjectMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): SubProjectMaster | null {
    return this.updateTower(id, updates, changedBy, reason);
  }

  public static deleteSubProject(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    return this.deleteTower(id, reason, deletedBy);
  }

  // ============================================================================
  // Sub Package Master (Child Deliverables & Work Packages linked to Parent Package)
  // ============================================================================

  public static getSubPackages(parentPackageOrDisciplineName?: string): SubPackageMaster[] {
    const state = this.getState();
    const pkgs = state.packages || [];
    if (!parentPackageOrDisciplineName || parentPackageOrDisciplineName === "ALL") return pkgs;
    return pkgs.filter(p => p.disciplineName === parentPackageOrDisciplineName || p.packageName === parentPackageOrDisciplineName);
  }

  public static getPackages(disciplineName?: string): WorkPackageMaster[] {
    return this.getSubPackages(disciplineName);
  }

  public static getSubPackage(id: string): SubPackageMaster | undefined {
    return (this.getState().packages || []).find(p => p.id === id);
  }

  public static addSubPackage(pkg: Omit<SubPackageMaster, "id">, createdBy = "Design Lead"): SubPackageMaster {
    const state = this.getState();
    const id = `subpkg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const deliverableTitle = pkg.subPackageName || pkg.packageName;
    const parentPkg = pkg.packageName || pkg.disciplineName || "Architectural";
    const code = pkg.subPackageCode || pkg.packageCode || `PKG-${(state.packages.length + 1).toString().padStart(2, "0")}`;

    const newSubPkg: SubPackageMaster = {
      ...pkg,
      id,
      packageName: deliverableTitle,
      disciplineName: parentPkg,
      disciplineId: pkg.disciplineId || pkg.packageId || `pkg-mst-${parentPkg.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      packageId: pkg.packageId || pkg.disciplineId,
      subPackageName: deliverableTitle,
      subPackageCode: code,
      packageCode: code
    };

    if (!state.packages) state.packages = [];
    state.packages.push(newSubPkg);

    this.logAudit({
      action: "CREATE",
      entityType: "PACKAGE",
      entityId: id,
      entityName: deliverableTitle,
      packageId: id,
      packageName: deliverableTitle,
      disciplineName: parentPkg,
      newValue: newSubPkg,
      impactSummary: `Created Sub-Package "${deliverableTitle}" under Parent Package [${parentPkg}]`,
      changedBy: createdBy
    });

    this.notify();
    return newSubPkg;
  }

  public static addPackage(pkg: Omit<WorkPackageMaster, "id">, createdBy = "Design Lead"): WorkPackageMaster {
    return this.addSubPackage(pkg, createdBy);
  }

  public static updateSubPackage(
    id: string,
    updates: Partial<Omit<SubPackageMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): SubPackageMaster | null {
    const state = this.getState();
    const idx = state.packages.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const oldPkg = { ...state.packages[idx] };
    const deliverableTitle = updates.subPackageName || updates.packageName || oldPkg.packageName;
    const parentPkg = updates.disciplineName || updates.packageName || oldPkg.disciplineName;
    const code = updates.subPackageCode || updates.packageCode || oldPkg.packageCode;

    state.packages[idx] = {
      ...state.packages[idx],
      ...updates,
      packageName: deliverableTitle,
      subPackageName: deliverableTitle,
      disciplineName: parentPkg,
      packageCode: code,
      subPackageCode: code
    };
    const updatedPkg = state.packages[idx];

    this.logAudit({
      action: "UPDATE",
      entityType: "PACKAGE",
      entityId: id,
      entityName: deliverableTitle,
      packageId: id,
      packageName: deliverableTitle,
      disciplineName: parentPkg,
      previousValue: oldPkg,
      newValue: updatedPkg,
      impactSummary: `Updated Sub-Package "${deliverableTitle}" under Parent Package [${parentPkg}]`,
      changedBy,
      reason
    });

    this.notify();
    return state.packages[idx];
  }

  public static updatePackage(
    id: string,
    updates: Partial<Omit<WorkPackageMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): WorkPackageMaster | null {
    return this.updateSubPackage(id, updates, changedBy, reason);
  }

  public static deleteSubPackage(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    const state = this.getState();
    const pkg = state.packages.find(p => p.id === id);
    const depReport = this.getEntityDependencies("PACKAGE", id);
    const title = pkg?.subPackageName || pkg?.packageName || "Sub-Package";

    state.packages = state.packages.filter(p => p.id !== id);
    Object.keys(state.packageStatuses).forEach(k => {
      if (k.endsWith(`__${id}`)) delete state.packageStatuses[k];
    });

    this.logAudit({
      action: "CASCADE_DELETE",
      entityType: "PACKAGE",
      entityId: id,
      entityName: title,
      packageId: id,
      packageName: title,
      disciplineName: pkg?.disciplineName,
      previousValue: pkg,
      newValue: null,
      impactSummary: `Cascaded & removed ${depReport.totalDependentRecords} records referencing Sub-Package "${title}"`,
      foreignKeyDependencies: depReport.dependencies,
      changedBy: deletedBy,
      reason
    });

    this.notify();
    return depReport;
  }

  public static deletePackage(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    return this.deleteSubPackage(id, reason, deletedBy);
  }

  // ============================================================================
  // Master Management: Statutory Authorities (CRUD) with Audit Tracking
  // ============================================================================

  public static getAuthorities(): StatutoryAuthorityMaster[] {
    return this.getState().authorities;
  }

  public static addAuthority(auth: Omit<StatutoryAuthorityMaster, "id">, createdBy = "Design Lead"): StatutoryAuthorityMaster {
    const state = this.getState();
    const id = `auth-${Date.now().toString(36)}`;
    const newAuth: StatutoryAuthorityMaster = { ...auth, id };
    state.authorities.push(newAuth);

    this.logAudit({
      action: "CREATE",
      entityType: "AUTHORITY",
      entityId: id,
      entityName: newAuth.authorityName,
      newValue: newAuth,
      impactSummary: `Created Statutory Authority "${newAuth.authorityName}" (${newAuth.category})`,
      changedBy: createdBy
    });

    this.notify();
    return newAuth;
  }

  public static updateAuthority(
    id: string,
    updates: Partial<Omit<StatutoryAuthorityMaster, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): StatutoryAuthorityMaster | null {
    const state = this.getState();
    const idx = state.authorities.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const oldAuth = { ...state.authorities[idx] };
    state.authorities[idx] = { ...state.authorities[idx], ...updates };
    const updatedAuth = state.authorities[idx];

    this.logAudit({
      action: "UPDATE",
      entityType: "AUTHORITY",
      entityId: id,
      entityName: updatedAuth.authorityName,
      previousValue: oldAuth,
      newValue: updatedAuth,
      impactSummary: `Updated Statutory Authority "${updatedAuth.authorityName}"`,
      changedBy,
      reason
    });

    this.notify();
    return state.authorities[idx];
  }

  public static deleteAuthority(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    const state = this.getState();
    const auth = state.authorities.find(a => a.id === id);
    const depReport = this.getEntityDependencies("AUTHORITY", id);

    state.authorities = state.authorities.filter(a => a.id !== id);
    Object.keys(state.statutoryClearances).forEach(k => {
      if (k.endsWith(`__${id}`)) delete state.statutoryClearances[k];
    });

    this.logAudit({
      action: "CASCADE_DELETE",
      entityType: "AUTHORITY",
      entityId: id,
      entityName: auth?.authorityName || "Statutory Authority",
      previousValue: auth,
      newValue: null,
      impactSummary: `Cascaded & removed ${depReport.totalDependentRecords} clearances attached to "${auth?.authorityName}"`,
      foreignKeyDependencies: depReport.dependencies,
      changedBy: deletedBy,
      reason
    });

    this.notify();
    return depReport;
  }

  // ============================================================================
  // Master Management: Consultants Directory (CRUD) with Foreign Key Audit Tracking
  // ============================================================================

  public static getConsultants(): ConsultantPartner[] {
    const state = this.getState();
    if (!state.consultants) state.consultants = [];
    return state.consultants;
  }

  public static addConsultant(
    c: Omit<ConsultantPartner, "id" | "onboardingStatus"> & { onboardingStatus?: "Onboard" | "Not Onboard"; categories?: string[] },
    createdBy = "Design Lead"
  ): ConsultantPartner {
    const state = this.getState();
    const id = `cst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const activeProjects = c.activeProjects || [];
    const onboardingStatus: "Onboard" | "Not Onboard" = activeProjects.length > 0 ? "Onboard" : "Not Onboard";
    const categories = c.categories && c.categories.length > 0 
      ? c.categories 
      : (c.category ? [c.category as string] : ["Architectural"]);
    const primaryCategory = categories[0] || (c.category as string) || "Architectural";

    const newC: ConsultantPartner = {
      ...c,
      id,
      category: primaryCategory,
      categories,
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

    this.logAudit({
      action: "CREATE",
      entityType: "CONSULTANT",
      entityId: id,
      entityName: newC.name,
      consultantId: id,
      consultantName: newC.name,
      newValue: newC,
      impactSummary: `Registered Consultant Partner "${newC.name}" with ${categories.length} mapped categories and status "${onboardingStatus}"`,
      changedBy: createdBy
    });

    this.notify();
    return newC;
  }

  public static updateConsultant(
    id: string,
    updates: Partial<Omit<ConsultantPartner, "id">>,
    changedBy = "Design Lead",
    reason?: string
  ): ConsultantPartner | null {
    const state = this.getState();
    if (!state.consultants) return null;
    const idx = state.consultants.findIndex(c => c.id === id);
    if (idx === -1) return null;

    const current = state.consultants[idx];
    const oldConsultant = { ...current };
    const newActiveProjects = updates.activeProjects !== undefined ? updates.activeProjects : current.activeProjects;
    const newOnboardingStatus: "Onboard" | "Not Onboard" = (newActiveProjects && newActiveProjects.length > 0) ? "Onboard" : "Not Onboard";
    
    let newCategories = updates.categories !== undefined ? updates.categories : (current.categories || (current.category ? [current.category as string] : ["Architectural"]));
    let primaryCategory = updates.category !== undefined 
      ? updates.category 
      : (newCategories && newCategories.length > 0 ? newCategories[0] : current.category);

    state.consultants[idx] = {
      ...current,
      ...updates,
      category: primaryCategory,
      categories: newCategories,
      activeProjects: newActiveProjects,
      onboardingStatus: newOnboardingStatus
    };
    const updatedCons = state.consultants[idx];

    // Foreign Key propagation if Consultant Name changed
    if (updates.name && updates.name !== oldConsultant.name) {
      // 1. Projects taggedConsultants
      state.projects.forEach(p => {
        if (p.taggedConsultants?.includes(oldConsultant.name)) {
          p.taggedConsultants = p.taggedConsultants.map(cn => cn === oldConsultant.name ? updates.name! : cn);
        }
      });
      // 2. Towers taggedConsultants
      state.towers.forEach(t => {
        if (t.taggedConsultants?.includes(oldConsultant.name)) {
          t.taggedConsultants = t.taggedConsultants.map(cn => cn === oldConsultant.name ? updates.name! : cn);
        }
      });
      // 3. Matrix consultantName
      Object.values(state.packageStatuses).forEach(ps => {
        if (ps.consultantName === oldConsultant.name) {
          ps.consultantName = updates.name;
        }
      });
      // 4. Drawings consultant
      (state.drawings || []).forEach(d => {
        if (d.consultant === oldConsultant.name) d.consultant = updates.name!;
      });
    }

    this.logAudit({
      action: "UPDATE",
      entityType: "CONSULTANT",
      entityId: id,
      entityName: updatedCons.name,
      consultantId: id,
      consultantName: updatedCons.name,
      previousValue: oldConsultant,
      newValue: updatedCons,
      impactSummary: `Updated consultant profile and synchronized foreign key references across projects and drawings`,
      changedBy,
      reason
    });

    this.notify();
    return state.consultants[idx];
  }

  public static deleteConsultant(id: string, reason?: string, deletedBy = "Design Lead"): EntityDependencyReport {
    const state = this.getState();
    if (!state.consultants) return { entityType: "CONSULTANT", entityId: id, entityName: id, totalDependentRecords: 0, dependencies: [], isReferencedByOtherRecords: false };
    
    const cons = state.consultants.find(c => c.id === id);
    const depReport = this.getEntityDependencies("CONSULTANT", id);
    const consName = cons?.name || id;

    // 1. Untag from projects
    state.projects.forEach(p => {
      if (p.taggedConsultants) {
        p.taggedConsultants = p.taggedConsultants.filter(c => c !== consName && c !== id);
      }
    });

    // 2. Untag from towers
    state.towers.forEach(t => {
      if (t.taggedConsultants) {
        t.taggedConsultants = t.taggedConsultants.filter(c => c !== consName && c !== id);
      }
    });

    // 3. Remove consultant record
    state.consultants = state.consultants.filter(c => c.id !== id);

    // 4. Log Audit Trail
    this.logAudit({
      action: "CASCADE_DELETE",
      entityType: "CONSULTANT",
      entityId: id,
      entityName: consName,
      consultantId: id,
      consultantName: consName,
      previousValue: cons,
      newValue: null,
      impactSummary: `Untagged consultant from ${depReport.totalDependentRecords} referencing projects/towers and deleted profile`,
      foreignKeyDependencies: depReport.dependencies,
      changedBy: deletedBy,
      reason
    });

    this.notify();
    return depReport;
  }

  // ============================================================================
  // Bulk Import Engines for All Masters (Package, Sub-Package, Projects, Towers, Consultants)
  // ============================================================================

  public static bulkImportPackages(
    packages: Array<{ name: string; code?: string; description?: string; icon?: string; color?: string }>,
    duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP"
  ): { added: number; updated: number; skipped: number } {
    const state = this.getState();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    packages.forEach(pkg => {
      const cleanName = pkg.name.trim();
      if (!cleanName) return;
      const cleanCode = (pkg.code || cleanName.slice(0, 4)).trim().toUpperCase();

      const existingIdx = (state.disciplines || []).findIndex(
        p => p.name.toLowerCase() === cleanName.toLowerCase() || (cleanCode && p.code.toLowerCase() === cleanCode.toLowerCase())
      );

      if (existingIdx !== -1) {
        if (duplicateStrategy === "OVERWRITE") {
          const old = state.disciplines[existingIdx];
          state.disciplines[existingIdx] = {
            ...old,
            name: cleanName,
            code: cleanCode,
            description: pkg.description !== undefined ? pkg.description : old.description,
            icon: pkg.icon || old.icon,
            color: pkg.color || old.color
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newPkg: PackageMaster = {
          id: `disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: cleanName,
          code: cleanCode,
          description: pkg.description,
          icon: pkg.icon || "📁",
          color: pkg.color || "purple",
          createdAt: new Date().toISOString()
        };
        state.disciplines.push(newPkg);
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      this.notify();
    }
    return { added, updated, skipped };
  }

  public static bulkImportSubPackages(
    subPackages: Array<{
      parentPackageName: string;
      subPackageName: string;
      subPackageCode?: string;
      description?: string;
    }>,
    duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP"
  ): { added: number; updated: number; skipped: number } {
    const state = this.getState();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    const generatePackageCode = (name: string, idx: number): string => {
      const words = name.split(/[\s_\-]+/).filter(Boolean);
      if (words.length >= 2) {
        const code = words.slice(0, 3).map(w => w[0]).join("").toUpperCase();
        if (code.length >= 2) return `${code}-${(idx + 1).toString().padStart(2, "0")}`;
      }
      const clean = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const prefix = clean.slice(0, 4) || "PKG";
      return `${prefix}-${(idx + 1).toString().padStart(2, "0")}`;
    };

    const packageColors = ["purple", "blue", "teal", "amber", "emerald", "rose", "indigo"];

    subPackages.forEach(sp => {
      const rawParent = (sp.parentPackageName || "").trim();
      let subName = (sp.subPackageName || "").trim();

      // If deliverable name is empty but parent was provided, treat parent as the deliverable
      if (!subName && rawParent) {
        subName = rawParent;
      }

      if (!subName || subName.toLowerCase() === "total" || subName.toLowerCase() === "grand total") return;

      const hasNoParent = !rawParent || rawParent.toLowerCase() === subName.toLowerCase();

      // =========================================================================
      // RULE: When there is no parent, consider as Package and insert into Package Master
      // Check duplicate: if duplicate ignore / skip, if genuine then insert
      // =========================================================================
      if (hasNoParent) {
        const cleanPkgName = subName;
        const cleanPkgCode = (sp.subPackageCode || generatePackageCode(cleanPkgName, state.disciplines.length + added)).toUpperCase();

        const existingDiscIdx = (state.disciplines || []).findIndex(
          d => d.name.toLowerCase() === cleanPkgName.toLowerCase() || (cleanPkgCode && d.code.toLowerCase() === cleanPkgCode.toLowerCase())
        );

        if (existingDiscIdx !== -1) {
          if (duplicateStrategy === "OVERWRITE") {
            const old = state.disciplines[existingDiscIdx];
            state.disciplines[existingDiscIdx] = {
              ...old,
              name: cleanPkgName,
              code: cleanPkgCode || old.code,
              description: sp.description !== undefined ? sp.description : old.description
            };
            updated++;
          } else {
            // Duplicate: IGNORE / SKIP
            skipped++;
          }
        } else {
          // Genuine: INSERT into Package Master
          const newPkg: PackageMaster = {
            id: `disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            name: cleanPkgName,
            code: cleanPkgCode,
            description: sp.description || "Imported Package Master",
            icon: "📁",
            color: packageColors[(state.disciplines.length + added) % packageColors.length],
            createdAt: new Date().toISOString()
          };
          state.disciplines.push(newPkg);
          added++;
        }
        return;
      }

      // =========================================================================
      // HAS PARENT: Standard Sub-Package deliverable insertion under parent
      // =========================================================================
      let parent = state.disciplines.find(
        d => d.name.toLowerCase() === rawParent.toLowerCase() || d.code.toLowerCase() === rawParent.toLowerCase()
      );
      if (!parent) {
        parent = {
          id: `disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: rawParent,
          code: generatePackageCode(rawParent, state.disciplines.length),
          icon: "📁",
          color: packageColors[state.disciplines.length % packageColors.length],
          createdAt: new Date().toISOString()
        };
        state.disciplines.push(parent);
      }

      const generatedCode = (sp.subPackageCode || `${parent.code}-${(state.packages.length + added + 1).toString().padStart(2, "0")}`).trim().toUpperCase();

      const existingIdx = (state.packages || []).findIndex(
        p => (p.disciplineName.toLowerCase() === parent!.name.toLowerCase() && (p.subPackageName || p.packageName).toLowerCase() === subName.toLowerCase()) ||
             (generatedCode && (p.subPackageCode || p.packageCode || "").toLowerCase() === generatedCode.toLowerCase())
      );

      if (existingIdx !== -1) {
        if (duplicateStrategy === "OVERWRITE") {
          const old = state.packages[existingIdx];
          state.packages[existingIdx] = {
            ...old,
            disciplineId: parent.id,
            disciplineName: parent.name,
            packageName: subName,
            subPackageName: subName,
            packageCode: generatedCode,
            subPackageCode: generatedCode,
            description: sp.description !== undefined ? sp.description : old.description
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newSubPkg: SubPackageMaster = {
          id: `pkg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          disciplineId: parent.id,
          disciplineName: parent.name,
          packageName: subName,
          subPackageName: subName,
          packageCode: generatedCode,
          subPackageCode: generatedCode,
          description: sp.description,
          defaultDurationDays: 30
        };
        state.packages.push(newSubPkg);
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      this.notify();
    }
    return { added, updated, skipped };
  }

  public static bulkImportProjects(
    projects: Array<{
      name: string;
      code?: string;
      location?: string;
      projectType?: string;
      projectStatus?: string;
      plotArea?: string | number;
      builtUpArea?: string | number;
      estimatedBudget?: string | number;
      reraNumber?: string;
      targetDate?: string;
      leadManager?: string;
      leadManagerEmail?: string;
      taggedPackages?: string[];
      taggedConsultants?: string[];
      description?: string;
    }>,
    duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP"
  ): { added: number; updated: number; skipped: number } {
    const state = this.getState();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    projects.forEach(p => {
      const cleanName = p.name.trim();
      if (!cleanName) return;
      const cleanCode = (p.code || cleanName.slice(0, 4)).trim().toUpperCase();

      const existingIdx = (state.projects || []).findIndex(
        ep => ep.name.toLowerCase() === cleanName.toLowerCase() || (cleanCode && ep.code.toLowerCase() === cleanCode.toLowerCase())
      );

      const pkgs = p.taggedPackages || [];
      const conns = p.taggedConsultants || [];

      if (existingIdx !== -1) {
        if (duplicateStrategy === "OVERWRITE") {
          const old = state.projects[existingIdx];
          state.projects[existingIdx] = {
            ...old,
            name: cleanName,
            code: cleanCode,
            location: p.location || old.location,
            projectType: p.projectType || old.projectType,
            projectStatus: p.projectStatus || old.projectStatus,
            plotArea: p.plotArea !== undefined ? String(p.plotArea) : old.plotArea,
            builtUpArea: p.builtUpArea !== undefined ? String(p.builtUpArea) : old.builtUpArea,
            estimatedBudget: p.estimatedBudget !== undefined ? String(p.estimatedBudget) : old.estimatedBudget,
            reraNumber: p.reraNumber || old.reraNumber,
            targetCompletionDate: p.targetDate ? String(p.targetDate) : old.targetCompletionDate,
            leadManager: p.leadManager || old.leadManager,
            leadManagerEmail: p.leadManagerEmail || old.leadManagerEmail,
            taggedCategories: pkgs.length > 0 ? pkgs : old.taggedCategories,
            taggedPackages: pkgs.length > 0 ? pkgs : old.taggedPackages,
            taggedConsultants: conns.length > 0 ? conns : old.taggedConsultants,
            description: p.description !== undefined ? p.description : old.description
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newProjId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const newProj: ProjectMaster = {
          id: newProjId,
          name: cleanName,
          code: cleanCode,
          location: p.location || "Mumbai MMR",
          projectType: p.projectType || "Residential High-Rise",
          projectStatus: p.projectStatus || "Planning & Design",
          plotArea: p.plotArea ? String(p.plotArea) : undefined,
          builtUpArea: p.builtUpArea ? String(p.builtUpArea) : undefined,
          estimatedBudget: p.estimatedBudget ? String(p.estimatedBudget) : undefined,
          reraNumber: p.reraNumber,
          targetCompletionDate: p.targetDate ? String(p.targetDate) : undefined,
          leadManager: p.leadManager,
          leadManagerEmail: p.leadManagerEmail,
          taggedCategories: pkgs,
          taggedPackages: pkgs,
          subProjectCategories: { default: pkgs },
          taggedConsultants: conns,
          description: p.description,
          createdAt: new Date().toISOString(),
          isSubProject: false
        };
        state.projects.push(newProj);

        const twrId = `twr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        state.towers.push({
          id: twrId,
          projectId: newProjId,
          projectName: cleanName,
          towerName: "Wing A",
          subProjectCode: `${cleanCode}-WA`,
          towerType: "Sale",
          taggedCategories: pkgs,
          taggedPackages: pkgs,
          taggedConsultants: conns,
          createdAt: new Date().toISOString()
        });

        added++;
      }
    });

    if (added > 0 || updated > 0) {
      this.notify();
    }
    return { added, updated, skipped };
  }

  public static bulkImportSubProjects(
    subProjects: Array<{
      parentProjectNameOrId: string;
      towerName: string;
      subProjectCode?: string;
      towerType?: TowerMaster["towerType"];
      totalFloors?: number;
      heightMeters?: number;
      targetCompletionDate?: string;
      taggedPackages?: string[];
      taggedConsultants?: string[];
      description?: string;
    }>,
    duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP"
  ): { added: number; updated: number; skipped: number } {
    const state = this.getState();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    subProjects.forEach(sp => {
      const parentQuery = (sp.parentProjectNameOrId || "").trim().toLowerCase();
      const towerName = (sp.towerName || "").trim();
      if (!parentQuery || !towerName) return;

      const parent = state.projects.find(
        p => p.name.toLowerCase() === parentQuery || p.code.toLowerCase() === parentQuery || p.id.toLowerCase() === parentQuery
      );
      if (!parent) return;

      const existingIdx = (state.towers || []).findIndex(
        t => t.projectId === parent.id && t.towerName.toLowerCase() === towerName.toLowerCase()
      );

      const pkgs = sp.taggedPackages && sp.taggedPackages.length > 0
        ? sp.taggedPackages
        : (parent.taggedPackages || parent.taggedCategories || []);
      const conns = sp.taggedConsultants && sp.taggedConsultants.length > 0
        ? sp.taggedConsultants
        : (parent.taggedConsultants || []);

      if (existingIdx !== -1) {
        if (duplicateStrategy === "OVERWRITE") {
          const old = state.towers[existingIdx];
          state.towers[existingIdx] = {
            ...old,
            towerName,
            subProjectCode: sp.subProjectCode || old.subProjectCode,
            towerType: sp.towerType || old.towerType,
            totalFloors: sp.totalFloors !== undefined ? sp.totalFloors : old.totalFloors,
            heightMeters: sp.heightMeters !== undefined ? sp.heightMeters : old.heightMeters,
            targetCompletionDate: sp.targetCompletionDate || old.targetCompletionDate,
            taggedCategories: pkgs,
            taggedPackages: pkgs,
            taggedConsultants: conns,
            description: sp.description !== undefined ? sp.description : old.description
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newTwr: TowerMaster = {
          id: `twr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          projectId: parent.id,
          projectName: parent.name,
          towerName,
          subProjectCode: sp.subProjectCode || `${parent.code}-${towerName.slice(0, 3).toUpperCase()}`,
          towerType: sp.towerType || "Sale",
          totalFloors: sp.totalFloors,
          heightMeters: sp.heightMeters,
          targetCompletionDate: sp.targetCompletionDate,
          taggedCategories: pkgs,
          taggedPackages: pkgs,
          taggedConsultants: conns,
          description: sp.description,
          createdAt: new Date().toISOString()
        };
        state.towers.push(newTwr);
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      this.notify();
    }
    return { added, updated, skipped };
  }

  public static bulkImportConsultants(
    consultants: Array<{
      name: string;
      leadContact?: string;
      email?: string;
      phone?: string;
      categories?: string[];
      rating?: number;
      averageTatDays?: number;
      onboardingStatus?: "Onboard" | "Not Onboard";
    }>,
    duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP"
  ): { added: number; updated: number; skipped: number } {
    const state = this.getState();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    consultants.forEach(c => {
      const cleanName = (c.name || "").trim();
      const cleanEmail = (c.email || "").trim().toLowerCase();
      if (!cleanName) return;

      const existingIdx = (state.consultants || []).findIndex(
        ec => ec.name.toLowerCase() === cleanName.toLowerCase() || (cleanEmail !== "" && ec.email && ec.email.toLowerCase() === cleanEmail)
      );

      const cats = c.categories && c.categories.length > 0 ? c.categories : ["Architectural Design"];

      if (existingIdx !== -1) {
        if (duplicateStrategy === "OVERWRITE") {
          const old = state.consultants[existingIdx];
          state.consultants[existingIdx] = {
            ...old,
            name: cleanName,
            leadContact: c.leadContact || old.leadContact || cleanName,
            email: cleanEmail || old.email || "",
            phone: c.phone || old.phone || "",
            category: cats[0] || old.category,
            categories: cats.length > 0 ? cats : old.categories,
            expertise: cats.length > 0 ? cats : old.expertise,
            rating: c.rating !== undefined && !isNaN(c.rating) ? c.rating : old.rating,
            averageTatDays: c.averageTatDays !== undefined && !isNaN(c.averageTatDays) ? c.averageTatDays : old.averageTatDays,
            onboardingStatus: c.onboardingStatus || old.onboardingStatus
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newCons: ConsultantPartner = {
          id: `cons-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: cleanName,
          leadContact: c.leadContact || cleanName || "Main Office",
          email: cleanEmail || "",
          phone: c.phone || "",
          totalDrawingsSubmitted: 0,
          category: cats[0] || "Architectural Design",
          categories: cats,
          expertise: cats,
          activeProjects: [],
          onboardingStatus: c.onboardingStatus || "Onboard",
          rating: c.rating && !isNaN(c.rating) ? c.rating : 4.8,
          averageTatDays: c.averageTatDays && !isNaN(c.averageTatDays) ? c.averageTatDays : 3.0
        };
        state.consultants.push(newCons);
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      this.notify();
    }
    return { added, updated, skipped };
  }

  public static bulkImportAuthorities(
    authorities: Array<{
      authorityName: string;
      category?: string;
      scope?: string;
    }>,
    duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP"
  ): { added: number; updated: number; skipped: number } {
    const state = this.getState();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    const validCategories: StatutoryAuthorityMaster["category"][] = [
      "Municipal",
      "Fire & Safety",
      "Environment",
      "Aviation & Defence",
      "Legal & RERA",
      "Utilities"
    ];
    const parseCategory = (cat?: string): StatutoryAuthorityMaster["category"] => {
      const found = validCategories.find(c => c.toLowerCase() === (cat || "").trim().toLowerCase());
      return found || "Municipal";
    };

    authorities.forEach(a => {
      const cleanName = (a.authorityName || "").trim();
      if (!cleanName) return;

      const existingIdx = (state.authorities || []).findIndex(
        ea => ea.authorityName.toLowerCase() === cleanName.toLowerCase()
      );

      if (existingIdx !== -1) {
        if (duplicateStrategy === "OVERWRITE") {
          const old = state.authorities[existingIdx];
          state.authorities[existingIdx] = {
            ...old,
            authorityName: cleanName,
            category: a.category ? parseCategory(a.category) : old.category,
            scope: a.scope !== undefined ? a.scope : old.scope
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newAuth: StatutoryAuthorityMaster = {
          id: `auth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          authorityName: cleanName,
          category: parseCategory(a.category),
          scope: a.scope || "Statutory clearance"
        };
        state.authorities.push(newAuth);
        added++;
      }
    });

    if (added > 0 || updated > 0) {
      this.notify();
    }
    return { added, updated, skipped };
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
    action?: string;
    entityType?: string;
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
    if (filters?.action && filters.action !== "ALL") {
      logs = logs.filter(l => l.action === filters.action);
    }
    if (filters?.entityType && filters.entityType !== "ALL") {
      logs = logs.filter(l => l.entityType === filters.entityType);
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

  public static saveBulkUserAccess(records: DesignUserAccessRecord[]): void {
    if (!records || records.length === 0) return;
    const state = this.getState();
    if (!state.userAccessList) state.userAccessList = [];
    let changed = false;

    records.forEach(record => {
      if (!record || !record.userId) return;
      const idx = state.userAccessList.findIndex(u => u.userId === record.userId);
      if (idx >= 0) {
        state.userAccessList[idx] = {
          ...state.userAccessList[idx],
          ...record,
          updatedAt: new Date().toISOString()
        };
        changed = true;
      } else {
        state.userAccessList.push({
          ...record,
          id: record.id || `dua-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          updatedAt: new Date().toISOString()
        });
        changed = true;
      }
    });

    if (changed) {
      this.notify();
    }
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
      disciplines: [...DEFAULT_DESIGN_CATEGORIES],
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
