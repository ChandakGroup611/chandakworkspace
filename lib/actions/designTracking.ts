"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { cookies } from "next/headers";
import { 
  ProjectMaster, 
  TowerMaster, 
  PackageMaster,
  SubPackageMaster,
  WorkPackageMaster, 
  StatutoryAuthorityMaster, 
  ConsultantMaster,
  PackageStatusEntry,
  LookAheadEntry,
  StatutoryClearanceEntry,
  MatrixAuditLog,
  DesignRbacPolicy,
  DesignRoleCode,
  DesignProjectAccessType,
  DesignUserAccessRecord,
  DesignWorkspaceUser
} from "@/Design_Tracking/src/types/masterTypes";
import { 
  DrawingItem, 
  DrawingRevision, 
  TransmittalItem, 
  RfiItem,
  ConsultantPartner
} from "@/Design_Tracking/src/types";

// ==============================================================================
// Design Tracking Server Actions (Supabase Postgres Database Sync)
// ==============================================================================


// ---------- server-side access guard ----------
// Every save / delete below runs with full database access, so this guard is what enforces the
// Design access set on Design → Access & roles (design_user_access): the person's Design role, their
// project scope (all projects or the assigned ones) and the capability switches. Super Admin passes.
type DesignCap = "any" | "admin" | "masters" | "matrix" | "drawings" | "gfc" | "transmittals" | "rfis";
const CAP_COLUMN: Record<Exclude<DesignCap, "any" | "admin">, string> = {
  masters: "can_masters_manage", matrix: "can_matrix_edit", drawings: "can_drawings_upload",
  gfc: "can_drawings_approve_gfc", transmittals: "can_transmittals_create", rfis: "can_rfis_manage",
};
const CAP_LABEL: Record<DesignCap, string> = {
  any: "use Design Tracking", admin: "manage Design access and policies", masters: "manage Design masters",
  matrix: "edit the design matrix", drawings: "upload or change drawings", gfc: "approve drawings for GFC",
  transmittals: "create transmittals", rfis: "manage RFIs",
};

async function requireDesign(cap: DesignCap, projectIds?: (string | null | undefined)[] | string | null) {
  const { getCachedUser } = await import("@/lib/auth/cached-user");
  const { user } = await getCachedUser();
  if (!user) throw new Error("Please sign in again.");
  const { hasPermission } = await import("@/lib/permissions");
  if (await hasPermission(user.id, "SUPER_ADMIN")) return user;

  const { data: access } = await supabaseAdmin.from("design_user_access").select("*").eq("user_id", user.id).maybeSingle();
  if (!access) throw new Error("You don't have access to Design Tracking. Ask a Design administrator to add you.");
  const isDesignAdmin = String(access.design_role || "").toUpperCase() === "DESIGN_ADMIN";
  if (cap === "admin" && !isDesignAdmin) throw new Error(`Only a Design administrator can ${CAP_LABEL.admin}.`);
  if (!isDesignAdmin && cap !== "any" && cap !== "admin" && !access[CAP_COLUMN[cap]]) {
    throw new Error(`Your Design access doesn't allow you to ${CAP_LABEL[cap]}.`);
  }
  const ids = (Array.isArray(projectIds) ? projectIds : [projectIds]).filter((x): x is string => !!x && x !== "ALL");
  if (!isDesignAdmin && ids.length && String(access.project_access_type || "ALL").toUpperCase() === "SPECIFIC") {
    const allowed: string[] = access.assigned_project_ids || [];
    if (ids.some((id) => !allowed.includes(id))) throw new Error("This project is outside your assigned Design projects.");
  }
  return user;
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/**
 * Fetch full Design Tracking State from Supabase Postgres
 */
export async function fetchFullDesignTrackingState() {
  try {
    const supabase = await getSupabase();

    // Parallel fetch with error suppression if tables don't exist yet
    const [
      projectsRes,
      towersRes,
      packagesRes,
      subPackagesRes,
      authoritiesRes,
      consultantsRes,
      matrixRes,
      lookAheadsRes,
      clearancesRes,
      drawingsRes,
      transmittalsRes,
      rfisRes,
      auditRes,
      rbacRes,
      userAccessRes
    ] = await Promise.all([
      supabase.from("design_projects").select("*").order("name"),
      supabase.from("design_towers").select("*").order("tower_name"),
      supabase.from("design_packages").select("*").order("name"),
      supabase.from("design_sub_packages").select("*").order("package_name"),
      supabase.from("design_statutory_authorities").select("*").order("authority_name"),
      supabase.from("design_consultants").select("*").order("firm_name"),
      supabase.from("design_matrix_entries").select("*"),
      supabase.from("design_look_aheads").select("*").order("planned_date"),
      supabase.from("design_statutory_clearances").select("*"),
      supabase.from("design_drawings").select("*").order("created_at", { ascending: false }),
      supabase.from("design_transmittals").select("*").order("issue_date", { ascending: false }),
      supabase.from("design_rfis").select("*").order("raised_date", { ascending: false }),
      supabase.from("design_matrix_audit_logs").select("*").order("timestamp", { ascending: false }).limit(150),
      supabase.from("design_rbac_policies").select("*"),
      supabase.from("design_user_access").select("*")
    ]);

    return {
      success: true,
      data: {
        projects: projectsRes.data || null,
        towers: towersRes.data || null,
        packages: packagesRes.data || null,
        subPackages: subPackagesRes.data || null,
        authorities: authoritiesRes.data || null,
        consultants: consultantsRes.data || null,
        packageStatuses: matrixRes.data || null,
        lookAheads: lookAheadsRes.data || null,
        statutoryClearances: clearancesRes.data || null,
        drawings: drawingsRes.data || null,
        transmittals: transmittalsRes.data || null,
        rfis: rfisRes.data || null,
        auditLogs: auditRes.data || null,
        rbacPolicies: rbacRes.data || null,
        userAccessList: userAccessRes.data || null
      }
    };
  } catch (error: any) {
    console.warn("Supabase fetchFullDesignTrackingState fallback to local store:", error?.message || error);
    return { success: false, error: error?.message || "Failed to fetch from Supabase" };
  }
}

// ==============================================================================
// 1. Projects Master CRUD Server Actions
// ==============================================================================

export async function saveProjectAction(project: ProjectMaster): Promise<{
  success: boolean;
  data?: ProjectMaster;
  error?: string;
}> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const row = {
      id: project.id,
      code: project.code,
      name: project.name,
      location: project.location,
      is_sub_project: !!project.isSubProject,
      parent_project_id: project.parentProjectId || null,
      parent_project_name: project.parentProjectName || null,
      sub_project_name: project.subProjectName || null,
      project_type: project.projectType || "Residential High-Rise",
      plot_area: project.plotArea || null,
      built_up_area: project.builtUpArea || null,
      estimated_budget: project.estimatedBudget || null,
      rera_number: project.reraNumber || null,
      project_status: project.projectStatus || "Planning & Design",
      target_completion_date: project.targetCompletionDate || null,
      lead_manager: project.leadManager || null,
      lead_manager_email: project.leadManagerEmail || null,
      tagged_consultants: project.taggedConsultants || [],
      tagged_categories: project.taggedCategories || [],
      tagged_packages: project.taggedPackages || [],
      sub_project_consultants: project.subProjectConsultants || {},
      sub_project_categories: project.subProjectCategories || {},
      sub_project_packages: project.subProjectPackages || {},
      description: project.description || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("design_projects")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.warn("saveProjectAction client error, falling back to admin:", error.message);
      const adminRes = await supabaseAdmin.from("design_projects").upsert(row, { onConflict: "id" }).select().single();
      if (adminRes.error) throw adminRes.error;
    }

    return { success: true, data: project };
  } catch (err: any) {
    console.error("saveProjectAction error:", err);
    return { success: false, error: err?.message || "Failed to save project" };
  }
}

export async function deleteProjectAction(projectId: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_projects").delete().eq("id", projectId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_projects").delete().eq("id", projectId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteProjectAction error:", err);
    return { success: false, error: err?.message || "Failed to delete project" };
  }
}

// ==============================================================================
// 2. Towers / Wings (Sub-Projects) Master CRUD Server Actions
// ==============================================================================

export async function saveTowerAction(tower: TowerMaster): Promise<{
  success: boolean;
  data?: TowerMaster;
  error?: string;
}> {
  try {
    await requireDesign("masters", tower.projectId);
    const supabase = await getSupabase();
    const row = {
      id: tower.id,
      project_id: tower.projectId,
      project_name: tower.projectName || null,
      tower_name: tower.towerName,
      sub_project_code: tower.subProjectCode || null,
      tower_type: tower.towerType || "Sale",
      total_floors: tower.totalFloors || 0,
      height_meters: tower.heightMeters || 0,
      target_completion_date: tower.targetCompletionDate || null,
      tagged_consultants: tower.taggedConsultants || [],
      tagged_categories: tower.taggedCategories || [],
      tagged_packages: tower.taggedPackages || [],
      description: tower.description || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_towers").upsert(row, { onConflict: "id" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_towers").upsert(row, { onConflict: "id" });
      if (adminRes.error) throw adminRes.error;
    }

    return { success: true, data: tower };
  } catch (err: any) {
    console.error("saveTowerAction error:", err);
    return { success: false, error: err?.message || "Failed to save tower/wing" };
  }
}

export async function deleteTowerAction(towerId: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_towers").delete().eq("id", towerId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_towers").delete().eq("id", towerId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteTowerAction error:", err);
    return { success: false, error: err?.message || "Failed to delete tower/wing" };
  }
}

// ==============================================================================
// 3. Packages & Disciplines (Category Master) Server Actions
// ==============================================================================

export async function savePackageAction(pkg: PackageMaster): Promise<{
  success: boolean;
  data?: PackageMaster;
  error?: string;
}> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const row = {
      id: pkg.id,
      name: pkg.name,
      code: pkg.code,
      icon: pkg.icon || "📁",
      color: pkg.color || "blue",
      description: pkg.description || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_packages").upsert(row, { onConflict: "id" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_packages").upsert(row, { onConflict: "id" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: pkg };
  } catch (err: any) {
    console.error("savePackageAction error:", err);
    return { success: false, error: err?.message || "Failed to save package" };
  }
}

export async function deletePackageAction(pkgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_packages").delete().eq("id", pkgId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_packages").delete().eq("id", pkgId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deletePackageAction error:", err);
    return { success: false, error: err?.message || "Failed to delete package" };
  }
}

// ==============================================================================
// 4. Sub-Packages (Work Packages) Server Actions
// ==============================================================================

export async function saveSubPackageAction(subPkg: SubPackageMaster): Promise<{
  success: boolean;
  data?: SubPackageMaster;
  error?: string;
}> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const row = {
      id: subPkg.id,
      discipline_id: subPkg.disciplineId,
      discipline_name: subPkg.disciplineName,
      package_name: subPkg.packageName,
      package_code: subPkg.packageCode,
      sub_package_name: subPkg.subPackageName || subPkg.packageName,
      sub_package_code: subPkg.subPackageCode || subPkg.packageCode,
      default_consultant: subPkg.defaultConsultant || null,
      default_duration_days: subPkg.defaultDurationDays || 14,
      description: subPkg.description || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_sub_packages").upsert(row, { onConflict: "id" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_sub_packages").upsert(row, { onConflict: "id" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: subPkg };
  } catch (err: any) {
    console.error("saveSubPackageAction error:", err);
    return { success: false, error: err?.message || "Failed to save sub-package" };
  }
}

export async function deleteSubPackageAction(subPkgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_sub_packages").delete().eq("id", subPkgId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_sub_packages").delete().eq("id", subPkgId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteSubPackageAction error:", err);
    return { success: false, error: err?.message || "Failed to delete sub-package" };
  }
}

// ==============================================================================
// 5. Consultants Master Server Actions
// ==============================================================================

export async function saveConsultantAction(consultant: ConsultantMaster | ConsultantPartner): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const row = {
      id: consultant.id,
      firm_name: (consultant as ConsultantMaster).firmName || (consultant as ConsultantPartner).name,
      discipline: (consultant as ConsultantMaster).discipline || (consultant as ConsultantPartner).category || "Multi-Disciplinary",
      categories: (consultant as ConsultantMaster).categories || [],
      packages: (consultant as ConsultantMaster).packages || [],
      expertise: (consultant as ConsultantMaster).expertise || (consultant as ConsultantPartner).expertise || [],
      sub_packages: (consultant as ConsultantMaster).subPackages || [],
      contact_person: (consultant as ConsultantMaster).contactPerson || (consultant as any).contactPerson || (consultant as any).leadContact || null,
      email: consultant.email || null,
      phone: consultant.phone || null,
      active_projects: consultant.activeProjects || [],
      onboarding_status: (consultant as ConsultantMaster).onboardingStatus || "Onboard",
      rating: consultant.rating || 4.5,
      total_drawings_submitted: (consultant as ConsultantMaster).totalDrawingsSubmitted || 0,
      average_tat_days: (consultant as ConsultantMaster).averageTatDays || 5,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_consultants").upsert(row, { onConflict: "id" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_consultants").upsert(row, { onConflict: "id" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: consultant };
  } catch (err: any) {
    console.error("saveConsultantAction error:", err);
    return { success: false, error: err?.message || "Failed to save consultant" };
  }
}

export async function deleteConsultantAction(consultantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_consultants").delete().eq("id", consultantId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_consultants").delete().eq("id", consultantId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteConsultantAction error:", err);
    return { success: false, error: err?.message || "Failed to delete consultant" };
  }
}

// ==============================================================================
// 6. Statutory Authorities & Clearances Server Actions
// ==============================================================================

export async function saveStatutoryAuthorityAction(authority: StatutoryAuthorityMaster): Promise<{
  success: boolean;
  data?: StatutoryAuthorityMaster;
  error?: string;
}> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const row = {
      id: authority.id,
      authority_name: authority.authorityName,
      scope: authority.scope || null,
      category: authority.category || "Municipal",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_statutory_authorities").upsert(row, { onConflict: "id" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_statutory_authorities").upsert(row, { onConflict: "id" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: authority };
  } catch (err: any) {
    console.error("saveStatutoryAuthorityAction error:", err);
    return { success: false, error: err?.message || "Failed to save statutory authority" };
  }
}

export async function deleteStatutoryAuthorityAction(authorityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_statutory_authorities").delete().eq("id", authorityId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_statutory_authorities").delete().eq("id", authorityId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteStatutoryAuthorityAction error:", err);
    return { success: false, error: err?.message || "Failed to delete statutory authority" };
  }
}

export async function saveStatutoryClearanceAction(clearance: StatutoryClearanceEntry): Promise<{
  success: boolean;
  data?: StatutoryClearanceEntry;
  error?: string;
}> {
  try {
    await requireDesign("matrix", clearance.projectId);
    const supabase = await getSupabase();
    const entryKey = (clearance as any).entryKey || `${clearance.projectId}__${clearance.towerId || "all"}__${clearance.authorityId}`;
    const row = {
      id: clearance.id || `clr-${entryKey}`,
      entry_key: entryKey,
      project_id: clearance.projectId,
      tower_id: clearance.towerId || null,
      authority_id: clearance.authorityId,
      authority_name: clearance.authorityName || null,
      status: (clearance as any).status || clearance.onboardingStatus || "Not Applied",
      planned_date: (clearance as any).plannedDate || clearance.applicationDate || null,
      actual_date: (clearance as any).actualDate || clearance.nocApprovalDate || null,
      target_date: (clearance as any).targetDate || clearance.targetApprovalDate || null,
      document_ref: (clearance as any).documentRef || clearance.fileReferenceNumber || null,
      remarks: clearance.remarks || null,
      updated_by: (clearance as any).updatedBy || "Design Lead",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_statutory_clearances").upsert(row, { onConflict: "entry_key" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_statutory_clearances").upsert(row, { onConflict: "entry_key" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: clearance };
  } catch (err: any) {
    console.error("saveStatutoryClearanceAction error:", err);
    return { success: false, error: err?.message || "Failed to save statutory clearance" };
  }
}

// ==============================================================================
// 7. Master Matrix Status & Look-Ahead Milestones Server Actions
// ==============================================================================

export async function saveMatrixEntryAction(
  entry: PackageStatusEntry,
  changedBy = "Design Lead",
  changedByEmail = "design.lead@chandakgroup.com"
): Promise<{ success: boolean; data?: PackageStatusEntry; error?: string }> {
  try {
    await requireDesign("matrix", entry.projectId);
    const supabase = await getSupabase();
    const entryKey = entry.entryKey || `${entry.projectId}__${entry.towerId}__${entry.packageId}`;
    const row = {
      id: entry.id || `mtx-${entryKey}`,
      entry_key: entryKey,
      project_id: entry.projectId,
      project_name: entry.projectName || null,
      tower_id: entry.towerId,
      tower_name: entry.towerName || null,
      package_id: entry.packageId,
      package_name: entry.packageName || null,
      discipline_name: entry.disciplineName || null,
      current_stage: entry.currentStage || null,
      status: entry.status || "Pending",
      planned_date: entry.plannedDate || null,
      actual_date: entry.actualDate || null,
      target_date: entry.targetDate || null,
      consultant_id: entry.consultantId || null,
      consultant_name: entry.consultantName || null,
      remarks: entry.remarks || null,
      updated_by: changedBy,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_matrix_entries").upsert(row, { onConflict: "entry_key" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_matrix_entries").upsert(row, { onConflict: "entry_key" });
      if (adminRes.error) throw adminRes.error;
    }

    return { success: true, data: entry };
  } catch (err: any) {
    console.error("saveMatrixEntryAction error:", err);
    return { success: false, error: err?.message || "Failed to save matrix status entry" };
  }
}

export async function saveBatchMatrixEntriesAction(
  entries: PackageStatusEntry[],
  changedBy = "Design Lead"
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireDesign("matrix", (entries || []).map((e) => e.projectId));
    if (!entries || entries.length === 0) return { success: true, count: 0 };
    const supabase = await getSupabase();

    const rows = entries.map(entry => {
      const entryKey = entry.entryKey || `${entry.projectId}__${entry.towerId}__${entry.packageId}`;
      return {
        id: entry.id || `mtx-${entryKey}`,
        entry_key: entryKey,
        project_id: entry.projectId,
        project_name: entry.projectName || null,
        tower_id: entry.towerId,
        tower_name: entry.towerName || null,
        package_id: entry.packageId,
        package_name: entry.packageName || null,
        discipline_name: entry.disciplineName || null,
        current_stage: entry.currentStage || null,
        status: entry.status || "Pending",
        planned_date: entry.plannedDate || null,
        actual_date: entry.actualDate || null,
        target_date: entry.targetDate || null,
        consultant_id: entry.consultantId || null,
        consultant_name: entry.consultantName || null,
        remarks: entry.remarks || null,
        updated_by: changedBy,
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase.from("design_matrix_entries").upsert(rows, { onConflict: "entry_key" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_matrix_entries").upsert(rows, { onConflict: "entry_key" });
      if (adminRes.error) throw adminRes.error;
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error("saveBatchMatrixEntriesAction error:", err);
    return { success: false, error: err?.message || "Failed to batch save matrix entries" };
  }
}

export async function saveLookAheadAction(lookAhead: LookAheadEntry): Promise<{
  success: boolean;
  data?: LookAheadEntry;
  error?: string;
}> {
  try {
    await requireDesign("matrix", (lookAhead as any).projectId);
    const supabase = await getSupabase();
    const row = {
      id: lookAhead.id,
      project_id: lookAhead.projectId,
      tower_id: lookAhead.towerId || null,
      package_id: (lookAhead as any).packageId || null,
      deliverable_description: lookAhead.deliverableDescription,
      milestone_type: (lookAhead as any).milestoneType || lookAhead.timeframe || "30_DAYS",
      planned_date: (lookAhead as any).plannedDate || lookAhead.targetDate,
      forecast_date: (lookAhead as any).forecastDate || lookAhead.targetDate || null,
      actual_date: (lookAhead as any).actualDate || null,
      status: lookAhead.status || "PENDING",
      lead_discipline: (lookAhead as any).leadDiscipline || null,
      consultant_responsible: (lookAhead as any).consultantResponsible || lookAhead.contractorOrConsultant || null,
      is_critical_path: (lookAhead as any).isCriticalPath !== undefined ? !!(lookAhead as any).isCriticalPath : (lookAhead.priority === "CRITICAL"),
      remarks: (lookAhead as any).remarks || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_look_aheads").upsert(row, { onConflict: "id" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_look_aheads").upsert(row, { onConflict: "id" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: lookAhead };
  } catch (err: any) {
    console.error("saveLookAheadAction error:", err);
    return { success: false, error: err?.message || "Failed to save look-ahead milestone" };
  }
}

export async function deleteLookAheadAction(lookAheadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("matrix");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_look_aheads").delete().eq("id", lookAheadId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_look_aheads").delete().eq("id", lookAheadId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteLookAheadAction error:", err);
    return { success: false, error: err?.message || "Failed to delete look-ahead milestone" };
  }
}

// ==============================================================================
// 8. Drawings, Revisions & GFC Approvals Server Actions
// ==============================================================================

export async function saveDrawingAction(drawing: DrawingItem): Promise<{
  success: boolean;
  data?: DrawingItem;
  error?: string;
}> {
  try {
    await requireDesign("drawings", (drawing as any).projectId);
    const supabase = await getSupabase();
    const row = {
      id: drawing.id,
      project_id: (drawing as any).projectId || null,
      project: drawing.project,
      tower_name: (drawing as any).towerName || null,
      code: drawing.code,
      title: drawing.title,
      discipline: drawing.discipline,
      sub_package: (drawing as any).subPackage || null,
      current_revision: (drawing as any).currentRevision || drawing.revision || "R0",
      status: drawing.status || "Under Review",
      consultant_name: (drawing as any).consultantName || drawing.consultant || null,
      file_url: drawing.fileUrl || null,
      file_size: drawing.fileSize || null,
      submitted_date: drawing.submittedDate || new Date().toISOString().split("T")[0],
      approved_date: drawing.approvedDate || null,
      tags: (drawing as any).tags || [],
      is_gfc: (drawing as any).isGfc !== undefined ? !!(drawing as any).isGfc : (drawing.status === "Approved (GFC)"),
      gfc_released_date: (drawing as any).gfcReleasedDate || null,
      gfc_recipient: (drawing as any).gfcRecipient || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_drawings").upsert(row, { onConflict: "code" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_drawings").upsert(row, { onConflict: "code" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: drawing };
  } catch (err: any) {
    console.error("saveDrawingAction error:", err);
    return { success: false, error: err?.message || "Failed to save drawing" };
  }
}

export async function deleteDrawingAction(drawingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("drawings");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_drawings").delete().eq("id", drawingId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_drawings").delete().eq("id", drawingId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteDrawingAction error:", err);
    return { success: false, error: err?.message || "Failed to delete drawing" };
  }
}

export async function saveDrawingRevisionAction(revision: DrawingRevision): Promise<{
  success: boolean;
  data?: DrawingRevision;
  error?: string;
}> {
  try {
    await requireDesign("drawings", (revision as any).projectId);
    const supabase = await getSupabase();
    const row = {
      id: revision.id,
      drawing_id: revision.drawingId,
      revision_number: revision.revisionNumber,
      file_url: (revision as any).fileUrl || null,
      file_size: revision.fileSize || null,
      changes_summary: revision.changesSummary || null,
      submitted_by: revision.submittedBy || "Consultant",
      approved_by: (revision as any).approvedBy || null,
      created_at: (revision as any).createdAt || (revision as any).date || new Date().toISOString()
    };

    const { error } = await supabase.from("design_drawing_revisions").upsert(row, { onConflict: "id" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_drawing_revisions").upsert(row, { onConflict: "id" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: revision };
  } catch (err: any) {
    console.error("saveDrawingRevisionAction error:", err);
    return { success: false, error: err?.message || "Failed to save revision" };
  }
}

// ==============================================================================
// 9. Transmittals & RFIs Server Actions
// ==============================================================================

export async function saveTransmittalAction(transmittal: TransmittalItem): Promise<{
  success: boolean;
  data?: TransmittalItem;
  error?: string;
}> {
  try {
    await requireDesign("transmittals", (transmittal as any).projectId);
    const supabase = await getSupabase();
    const row = {
      id: transmittal.id,
      transmittal_number: transmittal.transmittalNumber,
      project_id: transmittal.projectId || null,
      project_name: transmittal.projectName,
      tower_name: transmittal.towerName || "",
      issue_date: transmittal.issueDate,
      purpose: transmittal.purpose,
      recipient_agency: transmittal.recipientAgency,
      recipient_contact: transmittal.recipientContact || "",
      issued_by: transmittal.issuedBy,
      drawing_ids: transmittal.drawingIds || [],
      drawings_data: transmittal.drawingDetails || [],
      remarks: transmittal.remarks || "",
      status: transmittal.status,
      acknowledged_at: transmittal.acknowledgedAt || null,
      acknowledged_by: transmittal.acknowledgedBy || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_transmittals").upsert(row, { onConflict: "transmittal_number" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_transmittals").upsert(row, { onConflict: "transmittal_number" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: transmittal };
  } catch (err: any) {
    console.error("saveTransmittalAction error:", err);
    return { success: false, error: err?.message || "Failed to save transmittal" };
  }
}

export async function deleteTransmittalAction(transmittalId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("transmittals");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_transmittals").delete().eq("id", transmittalId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_transmittals").delete().eq("id", transmittalId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteTransmittalAction error:", err);
    return { success: false, error: err?.message || "Failed to delete transmittal" };
  }
}

export async function saveRfiAction(rfi: RfiItem): Promise<{
  success: boolean;
  data?: RfiItem;
  error?: string;
}> {
  try {
    await requireDesign("rfis", (rfi as any).projectId);
    const supabase = await getSupabase();
    const row = {
      id: rfi.id,
      rfi_number: rfi.rfiNumber,
      project_id: rfi.projectId || null,
      project_name: rfi.projectName,
      tower_name: rfi.towerName || "",
      discipline: rfi.discipline,
      drawing_code: rfi.drawingCode || "",
      drawing_title: rfi.drawingTitle || "",
      subject: rfi.subject,
      query_description: rfi.queryDescription,
      raised_by: rfi.raisedBy,
      raised_date: rfi.raisedDate,
      assigned_consultant: rfi.assignedConsultant,
      priority: rfi.priority,
      target_resolution_date: rfi.targetResolutionDate || null,
      status: rfi.status,
      consultant_response: rfi.consultantResponse || "",
      responded_by: rfi.respondedBy || "",
      responded_date: rfi.respondedDate || null,
      resolving_revision_number: rfi.resolvingRevisionNumber || "",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("design_rfis").upsert(row, { onConflict: "rfi_number" });
    if (error) {
      const adminRes = await supabaseAdmin.from("design_rfis").upsert(row, { onConflict: "rfi_number" });
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true, data: rfi };
  } catch (err: any) {
    console.error("saveRfiAction error:", err);
    return { success: false, error: err?.message || "Failed to save RFI" };
  }
}

export async function deleteRfiAction(rfiId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("rfis");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_rfis").delete().eq("id", rfiId);
    if (error) {
      const adminRes = await supabaseAdmin.from("design_rfis").delete().eq("id", rfiId);
      if (adminRes.error) throw adminRes.error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteRfiAction error:", err);
    return { success: false, error: err?.message || "Failed to delete RFI" };
  }
}

// ==============================================================================
// 10. Audit Trail & Notifications Server Actions
// ==============================================================================

export async function recordMatrixAuditAction(auditLog: MatrixAuditLog): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();
    const row = {
      id: auditLog.id,
      entry_key: auditLog.entryKey || null,
      action: auditLog.action || "STATUS_CHANGE",
      entity_type: auditLog.entityType || null,
      entity_id: auditLog.entityId || null,
      entity_name: auditLog.entityName || null,
      project_id: auditLog.projectId || null,
      project_name: auditLog.projectName || null,
      tower_id: auditLog.towerId || null,
      tower_name: auditLog.towerName || null,
      package_id: auditLog.packageId || null,
      package_name: auditLog.packageName || null,
      discipline_name: auditLog.disciplineName || null,
      previous_status: auditLog.previousStatus || null,
      new_status: auditLog.newStatus || null,
      previous_planned_date: auditLog.previousPlannedDate || null,
      new_planned_date: auditLog.newPlannedDate || null,
      previous_actual_date: auditLog.previousActualDate || null,
      new_actual_date: auditLog.newActualDate || null,
      consultant_name: auditLog.consultantName || null,
      changed_by: auditLog.changedBy || "Design Administrator",
      changed_by_email: auditLog.changedByEmail || null,
      timestamp: auditLog.timestamp || new Date().toISOString(),
      remarks: auditLog.remarks || null,
      impact_summary: auditLog.impactSummary || null,
      mail_sent: true
    };

    const { error } = await supabase.from("design_matrix_audit_logs").insert([row]);
    if (error) {
      await supabaseAdmin.from("design_matrix_audit_logs").insert([row]);
    }

    return { success: true };
  } catch (err: any) {
    console.error("recordMatrixAuditAction error:", err);
    return { success: false, error: err?.message };
  }
}

function buildDefaultServerRbacPolicies(): DesignRbacPolicy[] {
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

  // 1. Super Admin
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

  // 2. Design Administrator
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

  // 3. Design Lead
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

  // 4. Design Coordinator
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

  // 5. Site Engineer
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

  // 6. Consultant External
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

  // 8. Viewer
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

export async function fetchRbacPoliciesAction(): Promise<{
  success: boolean;
  policies?: DesignRbacPolicy[];
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("design_rbac_policies")
      .select("*")
      .order("module", { ascending: true });

    if (error) {
      console.error("fetchRbacPoliciesAction error:", error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      const mapped: DesignRbacPolicy[] = data.map((row: any) => ({
        id: row.id,
        roleCode: row.role_code,
        roleName: row.role_name || row.role_code,
        projectId: row.project_id || "ALL",
        projectName: row.project_name || "All Development Projects",
        module: row.module,
        canCreate: !!row.can_create,
        canRead: !!row.can_read,
        canUpdate: !!row.can_update,
        canDelete: !!row.can_delete,
        canApprove: !!row.can_approve,
        canExport: !!row.can_export,
        ticketAccessScope: row.ticket_access_scope || "ALL",
        updatedAt: row.updated_at
      }));
      return { success: true, policies: mapped };
    }

    const defaultPolicies = buildDefaultServerRbacPolicies();
    const defaultRows = defaultPolicies.map((p: DesignRbacPolicy) => ({
      id: p.id,
      role_code: p.roleCode,
      role_name: p.roleName,
      project_id: p.projectId || "ALL",
      project_name: p.projectName || "All Development Projects",
      module: p.module,
      can_create: !!p.canCreate,
      can_read: !!p.canRead,
      can_update: !!p.canUpdate,
      can_delete: !!p.canDelete,
      can_approve: !!p.canApprove,
      can_export: !!p.canExport,
      ticket_access_scope: p.ticketAccessScope || "ALL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    await supabaseAdmin
      .from("design_rbac_policies")
      .upsert(defaultRows, { onConflict: "role_code,project_id,module" });

    return { success: true, policies: defaultPolicies };
  } catch (err: any) {
    console.error("fetchRbacPoliciesAction error:", err);
    return { success: false, error: err?.message || "Failed to fetch design RBAC policies" };
  }
}

export async function saveSingleDesignRbacPolicyAction(policy: DesignRbacPolicy): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await requireDesign("admin");
    const row = {
      id: policy.id || `rbac-${policy.roleCode.toLowerCase()}-${(policy.projectId || "all").toLowerCase()}-${policy.module.toLowerCase()}`,
      role_code: policy.roleCode,
      role_name: policy.roleName || policy.roleCode,
      project_id: policy.projectId || "ALL",
      project_name: policy.projectName || "All Development Projects",
      module: policy.module,
      can_create: !!policy.canCreate,
      can_read: !!policy.canRead,
      can_update: !!policy.canUpdate,
      can_delete: !!policy.canDelete,
      can_approve: !!policy.canApprove,
      can_export: !!policy.canExport,
      ticket_access_scope: policy.ticketAccessScope || "ALL",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin
      .from("design_rbac_policies")
      .upsert(row, { onConflict: "role_code,project_id,module" });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("saveSingleDesignRbacPolicyAction error:", err);
    return { success: false, error: err?.message || "Failed to save design RBAC policy" };
  }
}

export async function saveRbacPoliciesAction(policies: DesignRbacPolicy[]): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("admin");
    if (policies && policies.length > 0) {
      const rows = policies.map(p => ({
        id: p.id || `rbac-${p.roleCode.toLowerCase()}-${(p.projectId || "all").toLowerCase()}-${p.module.toLowerCase()}`,
        role_code: p.roleCode,
        role_name: p.roleName || p.roleCode,
        project_id: p.projectId || "ALL",
        project_name: p.projectName || "All Development Projects",
        module: p.module,
        can_create: !!p.canCreate,
        can_read: !!p.canRead,
        can_update: !!p.canUpdate,
        can_delete: !!p.canDelete,
        can_approve: !!p.canApprove,
        can_export: !!p.canExport,
        ticket_access_scope: p.ticketAccessScope || "ALL",
        updated_at: p.updatedAt || new Date().toISOString()
      }));

      const { error } = await supabaseAdmin
        .from("design_rbac_policies")
        .upsert(rows, { onConflict: "role_code,project_id,module" });

      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    console.error("saveRbacPoliciesAction error:", err);
    return { success: false, error: err?.message || "Failed to save design policies" };
  }
}

export async function fetchDesignWorkspaceUsersAction(): Promise<{
  success: boolean;
  users?: DesignWorkspaceUser[];
  error?: string;
}> {
  try {
    const supabase = await getSupabase();

    const [
      usersRes,
      deptRes,
      desigRes,
      rolesRes,
      modulesRes,
      userModulesRes,
      designAccessRes
    ] = await Promise.all([
      supabase
        .from("user_master")
        .select("id, full_name, email, user_code, profile_photo, is_active, role_id, department_id, designation_id")
        .eq("is_deleted", false)
        .order("full_name", { ascending: true }),
      supabase.from("departments").select("id, code, name").eq("is_deleted", false),
      supabase.from("designations").select("id, code, name").eq("is_deleted", false),
      supabase.from("roles").select("id, code, name").eq("is_deleted", false),
      supabase.from("modules_master").select("id, code").eq("code", "DESIGN_TRACKING").maybeSingle(),
      supabase.from("user_modules").select("user_id, module_id"),
      supabase.from("design_user_access").select("*")
    ]);

    const usersData = usersRes.data || [];
    const deptMap = new Map((deptRes.data || []).map(d => [d.id, d.name]));
    const desigMap = new Map((desigRes.data || []).map(d => [d.id, d.name]));
    const roleMap = new Map((rolesRes.data || []).map(r => [r.id, { name: r.name, code: r.code }]));
    
    const designModuleId = modulesRes.data?.id;
    const usersWithModuleAccess = new Set(
      (userModulesRes.data || [])
        .filter(um => designModuleId && um.module_id === designModuleId)
        .map(um => um.user_id)
    );

    const accessMap = new Map<string, DesignUserAccessRecord>();
    if (designAccessRes.data) {
      for (const row of designAccessRes.data) {
        accessMap.set(row.user_id, {
          id: row.id,
          userId: row.user_id,
          designRole: row.design_role as DesignRoleCode,
          projectAccessType: (row.project_access_type || "ALL") as DesignProjectAccessType,
          assignedProjectIds: row.assigned_project_ids || [],
          canMatrixEdit: !!row.can_matrix_edit,
          canDrawingsUpload: !!row.can_drawings_upload,
          canDrawingsApproveGfc: !!row.can_drawings_approve_gfc,
          canTransmittalsCreate: !!row.can_transmittals_create,
          canRfisManage: !!row.can_rfis_manage,
          canMastersManage: !!row.can_masters_manage,
          updatedAt: row.updated_at,
          updatedBy: row.updated_by
        });
      }
    }

    const mergedUsers: DesignWorkspaceUser[] = usersData.map(u => {
      const role = u.role_id ? roleMap.get(u.role_id) : undefined;
      const hasModule = usersWithModuleAccess.has(u.id);
      const access = accessMap.get(u.id) || null;

      return {
        id: u.id,
        fullName: u.full_name || "Unnamed User",
        email: u.email || "",
        userCode: u.user_code || "",
        profilePhoto: u.profile_photo || null,
        isActive: u.is_active !== false,
        roleId: u.role_id || undefined,
        roleName: role?.name,
        roleCode: role?.code,
        departmentId: u.department_id || undefined,
        departmentName: u.department_id ? deptMap.get(u.department_id) : undefined,
        designationId: u.designation_id || undefined,
        designationName: u.designation_id ? desigMap.get(u.designation_id) : undefined,
        hasModuleAccess: hasModule || !!access,
        designAccess: access
      };
    });

    return { success: true, users: mergedUsers };
  } catch (err: any) {
    console.error("fetchDesignWorkspaceUsersAction error:", err);
    return { success: false, error: err?.message || "Failed to fetch workspace users" };
  }
}

export async function saveDesignUserAccessAction(payload: {
  userId: string;
  designRole: DesignRoleCode;
  projectAccessType: DesignProjectAccessType;
  assignedProjectIds: string[];
  canMatrixEdit: boolean;
  canDrawingsUpload: boolean;
  canDrawingsApproveGfc: boolean;
  canTransmittalsCreate: boolean;
  canRfisManage: boolean;
  canMastersManage: boolean;
  ticketAccessScope?: string;
  updatedBy?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    await requireDesign("admin");
    const supabase = await getSupabase();

    const record = {
      user_id: payload.userId,
      design_role: payload.designRole,
      project_access_type: payload.projectAccessType,
      assigned_project_ids: payload.assignedProjectIds || [],
      can_matrix_edit: payload.canMatrixEdit,
      can_drawings_upload: payload.canDrawingsUpload,
      can_drawings_approve_gfc: payload.canDrawingsApproveGfc,
      can_transmittals_create: payload.canTransmittalsCreate,
      can_rfis_manage: payload.canRfisManage,
      can_masters_manage: payload.canMastersManage,
      updated_at: new Date().toISOString(),
      updated_by: payload.updatedBy || "Design Administrator"
    };

    let { data, error } = await supabase
      .from("design_user_access")
      .upsert(record, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      const adminRes = await supabaseAdmin
        .from("design_user_access")
        .upsert(record, { onConflict: "user_id" })
        .select()
        .single();
      if (adminRes.error) throw adminRes.error;
      data = adminRes.data;
    }

    try {
      const { data: moduleData } = await supabaseAdmin
        .from("modules_master")
        .select("id")
        .eq("code", "DESIGN_TRACKING")
        .maybeSingle();

      if (moduleData?.id) {
        await supabaseAdmin
          .from("user_modules")
          .upsert(
            { user_id: payload.userId, module_id: moduleData.id, is_default: false },
            { onConflict: "user_id,module_id" }
          );
      }
    } catch (modErr) {
      console.warn("user_modules sync note:", modErr);
    }

    return { success: true, data: data || record };
  } catch (err: any) {
    console.error("saveDesignUserAccessAction error:", err);
    return { success: false, error: err?.message || "Failed to save design user access" };
  }
}

export async function deleteDesignUserAccessAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("admin");
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_user_access").delete().eq("user_id", userId);
    if (error) {
      await supabaseAdmin.from("design_user_access").delete().eq("user_id", userId);
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteDesignUserAccessAction error:", err);
    return { success: false, error: err?.message || "Failed to delete user access" };
  }
}

export async function toggleUserDesignModuleAccessAction(userId: string, enable: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("admin");
    const { data: moduleData } = await supabaseAdmin
      .from("modules_master")
      .select("id")
      .eq("code", "DESIGN_TRACKING")
      .maybeSingle();

    if (!moduleData?.id) {
      return { success: false, error: "Design Tracking module definition not found" };
    }

    if (enable) {
      await supabaseAdmin
        .from("user_modules")
        .upsert(
          { user_id: userId, module_id: moduleData.id, is_default: false },
          { onConflict: "user_id,module_id" }
        );

      const { data: existingAccess } = await supabaseAdmin
        .from("design_user_access")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingAccess) {
        await supabaseAdmin
          .from("design_user_access")
          .insert({
            user_id: userId,
            design_role: "DESIGN_COORDINATOR",
            project_access_type: "ALL",
            assigned_project_ids: [],
            can_matrix_edit: true,
            can_drawings_upload: true,
            can_drawings_approve_gfc: false,
            can_transmittals_create: true,
            can_rfis_manage: true,
            can_masters_manage: false,
            updated_at: new Date().toISOString(),
            updated_by: "Admin Quick Toggle"
          });
      }
    } else {
      await supabaseAdmin
        .from("user_modules")
        .delete()
        .eq("user_id", userId)
        .eq("module_id", moduleData.id);

      await supabaseAdmin
        .from("design_user_access")
        .delete()
        .eq("user_id", userId);
    }

    return { success: true };
  } catch (err: any) {
    console.error("toggleUserDesignModuleAccessAction error:", err);
    return { success: false, error: err?.message || "Failed to toggle user design module access" };
  }
}

export async function syncDesignTrackingBundle(bundle: {
  projects?: ProjectMaster[];
  towers?: TowerMaster[];
  packages?: WorkPackageMaster[];
  consultants?: any[];
  matrixEntries?: PackageStatusEntry[];
  lookAheads?: LookAheadEntry[];
  clearances?: StatutoryClearanceEntry[];
  drawings?: DrawingItem[];
  transmittals?: TransmittalItem[];
  rfis?: RfiItem[];
}) {
  try {
    await requireDesign("masters");
    const supabase = await getSupabase();

    if (bundle.projects && bundle.projects.length > 0) {
      await supabase.from("design_projects").upsert(bundle.projects.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        location: p.location,
        is_sub_project: !!p.isSubProject,
        parent_project_id: p.parentProjectId || null,
        parent_project_name: p.parentProjectName || null,
        sub_project_name: p.subProjectName || null,
        project_type: p.projectType || "Residential High-Rise",
        plot_area: p.plotArea || null,
        built_up_area: p.builtUpArea || null,
        estimated_budget: p.estimatedBudget || null,
        rera_number: p.reraNumber || null,
        project_status: p.projectStatus || "Planning & Design",
        target_completion_date: p.targetCompletionDate || null,
        lead_manager: p.leadManager || null,
        lead_manager_email: p.leadManagerEmail || null,
        tagged_consultants: p.taggedConsultants || [],
        tagged_categories: p.taggedCategories || [],
        tagged_packages: p.taggedPackages || [],
        sub_project_consultants: p.subProjectConsultants || {},
        sub_project_categories: p.subProjectCategories || {},
        sub_project_packages: p.subProjectPackages || {},
        description: p.description || "",
        created_at: p.createdAt || new Date().toISOString()
      })));
    }

    if (bundle.towers && bundle.towers.length > 0) {
      await supabase.from("design_towers").upsert(bundle.towers.map(t => ({
        id: t.id,
        project_id: t.projectId,
        project_name: t.projectName || null,
        tower_name: t.towerName,
        sub_project_code: t.subProjectCode || null,
        tower_type: t.towerType || "Sale",
        total_floors: t.totalFloors || 0,
        height_meters: t.heightMeters || 0,
        target_completion_date: t.targetCompletionDate || null,
        tagged_consultants: t.taggedConsultants || [],
        tagged_categories: t.taggedCategories || [],
        tagged_packages: t.taggedPackages || [],
        description: t.description || "",
        created_at: t.createdAt || new Date().toISOString()
      })));
    }

    if (bundle.transmittals && bundle.transmittals.length > 0) {
      await supabase.from("design_transmittals").upsert(bundle.transmittals.map(t => ({
        id: t.id,
        transmittal_number: t.transmittalNumber,
        project_id: t.projectId || null,
        project_name: t.projectName,
        tower_name: t.towerName || "",
        issue_date: t.issueDate,
        purpose: t.purpose,
        recipient_agency: t.recipientAgency,
        recipient_contact: t.recipientContact || "",
        issued_by: t.issuedBy,
        drawing_ids: t.drawingIds || [],
        drawings_data: t.drawingDetails || [],
        remarks: t.remarks || "",
        status: t.status,
        acknowledged_at: t.acknowledgedAt || null,
        acknowledged_by: t.acknowledgedBy || null
      })));
    }

    if (bundle.rfis && bundle.rfis.length > 0) {
      await supabase.from("design_rfis").upsert(bundle.rfis.map(r => ({
        id: r.id,
        rfi_number: r.rfiNumber,
        project_id: r.projectId || null,
        project_name: r.projectName,
        tower_name: r.towerName || "",
        discipline: r.discipline,
        drawing_code: r.drawingCode || "",
        drawing_title: r.drawingTitle || "",
        subject: r.subject,
        query_description: r.queryDescription,
        raised_by: r.raisedBy,
        raised_date: r.raisedDate,
        assigned_consultant: r.assignedConsultant,
        priority: r.priority,
        target_resolution_date: r.targetResolutionDate || null,
        status: r.status,
        consultant_response: r.consultantResponse || "",
        responded_by: r.respondedBy || "",
        responded_date: r.respondedDate || null,
        resolving_revision_number: r.resolvingRevisionNumber || ""
      })));
    }

    return { success: true };
  } catch (err: any) {
    console.warn("syncDesignTrackingBundle database persistence note:", err?.message);
    return { success: false, error: err?.message };
  }
}
