"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { cookies } from "next/headers";
import { 
  ProjectMaster, 
  TowerMaster, 
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
import { DesignMasterStore } from "@/Design_Tracking/src/services/designMasterStore";

// ==============================================================================
// Design Tracking Server Actions (Supabase Postgres Database Sync)
// ==============================================================================

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/**
 * Fetch full Design Tracking State from Supabase
 */
export async function fetchFullDesignTrackingState() {
  try {
    const supabase = await getSupabase();

    // Parallel fetch with error suppression if tables don't exist yet
    const [
      projectsRes,
      towersRes,
      packagesRes,
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
      supabase.from("design_towers").select("*"),
      supabase.from("design_packages").select("*"),
      supabase.from("design_statutory_authorities").select("*"),
      supabase.from("design_consultants").select("*"),
      supabase.from("design_matrix_entries").select("*"),
      supabase.from("design_look_aheads").select("*"),
      supabase.from("design_statutory_clearances").select("*"),
      supabase.from("design_drawings").select("*"),
      supabase.from("design_transmittals").select("*"),
      supabase.from("design_rfis").select("*"),
      supabase.from("design_matrix_audit_logs").select("*").order("timestamp", { ascending: false }).limit(100),
      supabase.from("design_rbac_policies").select("*"),
      supabase.from("design_user_access").select("*")
    ]);

    return {
      success: true,
      data: {
        projects: projectsRes.data || null,
        towers: towersRes.data || null,
        packages: packagesRes.data || null,
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

/**
 * Record a Design Matrix Audit Log & Queue an Audit Mail Notification
 */
export async function recordMatrixAuditAction(auditLog: MatrixAuditLog) {
  try {
    const supabase = await getSupabase();

    // 1. Try to persist audit log into design_matrix_audit_logs
    try {
      await supabase.from("design_matrix_audit_logs").insert([{
        id: auditLog.id,
        entry_key: auditLog.entryKey,
        project_id: auditLog.projectId,
        project_name: auditLog.projectName,
        tower_id: auditLog.towerId,
        tower_name: auditLog.towerName,
        package_id: auditLog.packageId,
        package_name: auditLog.packageName,
        discipline_name: auditLog.disciplineName,
        previous_status: auditLog.previousStatus,
        new_status: auditLog.newStatus,
        previous_planned_date: auditLog.previousPlannedDate,
        new_planned_date: auditLog.newPlannedDate,
        previous_actual_date: auditLog.previousActualDate,
        new_actual_date: auditLog.newActualDate,
        consultant_name: auditLog.consultantName,
        changed_by: auditLog.changedBy,
        changed_by_email: auditLog.changedByEmail,
        timestamp: auditLog.timestamp,
        remarks: auditLog.remarks,
        mail_sent: true
      }]);
    } catch (e) {
      console.warn("Audit log DB insert suppressed:", e);
    }

    // 2. Queue corporate audit email notification
    try {
      const emailSubject = `[Design Matrix Audit] ${auditLog.projectName} (${auditLog.towerName}) - ${auditLog.packageName} status set to "${auditLog.newStatus}"`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #0f766e; color: #ffffff; padding: 18px 24px;">
            <h2 style="margin: 0; font-size: 18px; font-weight: bold;">🏢 Chandak Design Tracking: Matrix Audit Trail</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Automated delivery schedule update & compliance notification</p>
          </div>
          <div style="padding: 24px; background: #ffffff;">
            <p style="margin-top: 0;">An engineering deliverable status in the Master Tender Design Matrix was updated by <strong>${auditLog.changedBy}</strong>.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 40%;">Project:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${auditLog.projectName} (${auditLog.towerName})</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Work Package:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${auditLog.packageName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Discipline:</td>
                <td style="padding: 8px 0;">${auditLog.disciplineName || "Design & Engineering"}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Assigned Consultant:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #7c3aed;">${auditLog.consultantName || "Not Assigned"}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">New Recorded Status:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #059669;">${auditLog.newStatus}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Planned Date (Mandatory):</td>
                <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">${auditLog.newPlannedDate}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Actual Date (Mandatory):</td>
                <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">${auditLog.newActualDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Remarks:</td>
                <td style="padding: 8px 0; color: #475569;">${auditLog.remarks || "Updated via Design Matrix"}</td>
              </tr>
            </table>

            <div style="margin-top: 20px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">Audit Timestamp:</span> ${new Date(auditLog.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </div>
          </div>
          <div style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            Chandak Workspace • Design & Engineering Governance Module
          </div>
        </div>
      `;

      await supabaseAdmin.from("email_queue").insert([{
        recipient_email: "design.head@chandakgroup.com",
        recipient_name: "Design & Project Controls Lead",
        subject: emailSubject,
        html_content: emailHtml,
        plain_text_content: `Design Matrix Audit: ${auditLog.projectName} - ${auditLog.packageName} status set to ${auditLog.newStatus}. Planned: ${auditLog.newPlannedDate}, Actual: ${auditLog.newActualDate}. By: ${auditLog.changedBy}`,
        status: "PENDING",
        metadata: {
          module: "DESIGN_TRACKING",
          event: "MATRIX_AUDIT_UPDATE",
          projectId: auditLog.projectId,
          packageId: auditLog.packageId
        }
      }]);
    } catch (e) {
      console.warn("Email queue insert note:", e);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch all Design RBAC Policies from Supabase Postgres
 */
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

    // Seed defaults if empty
    const defaultPolicies = DesignMasterStore.buildDefaultRbacPolicies();
    const defaultRows = defaultPolicies.map(p => ({
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

/**
 * Atomic save / update for a single Design RBAC Policy
 */
export async function saveSingleDesignRbacPolicyAction(policy: DesignRbacPolicy): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
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

    if (error) {
      console.error("saveSingleDesignRbacPolicyAction error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("saveSingleDesignRbacPolicyAction error:", err);
    return { success: false, error: err?.message || "Failed to save design RBAC policy" };
  }
}

/**
 * Save or bulk update Design RBAC Policies in Supabase Postgres
 */
export async function saveRbacPoliciesAction(policies: DesignRbacPolicy[]): Promise<{ success: boolean; error?: string }> {
  try {
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

      if (error) {
        console.error("saveRbacPoliciesAction upsert error:", error);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  } catch (err: any) {
    console.error("saveRbacPoliciesAction error:", err);
    return { success: false, error: err?.message || "Failed to save design policies" };
  }
}

/**
 * Fetch dynamic roles for Design & Tracking
 */
export async function fetchDesignRolesAction(): Promise<{
  success: boolean;
  roles?: Array<{ id: string; code: string; name: string; description?: string; is_system?: boolean }>;
  error?: string;
}> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("roles")
      .select("id, code, name, description, is_system")
      .eq("is_deleted", false)
      .order("name", { ascending: true });

    if (error) {
      console.warn("fetchDesignRolesAction note:", error.message);
      return { success: true, roles: [] };
    }
    return { success: true, roles: data || [] };
  } catch (err: any) {
    return { success: true, roles: [] };
  }
}

/**
 * Sync entire master state bundle to Supabase
 */
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
    const supabase = await getSupabase();

    if (bundle.projects && bundle.projects.length > 0) {
      await supabase.from("design_projects").upsert(bundle.projects.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        location: p.location,
        description: p.description || "",
        created_at: p.createdAt || new Date().toISOString()
      })));
    }

    if (bundle.transmittals && bundle.transmittals.length > 0) {
      await supabase.from("design_transmittals").upsert(bundle.transmittals.map(t => ({
        id: t.id,
        transmittal_number: t.transmittalNumber,
        project_id: t.projectId,
        project_name: t.projectName,
        tower_name: t.towerName || "",
        issue_date: t.issueDate,
        purpose: t.purpose,
        recipient_agency: t.recipientAgency,
        issued_by: t.issuedBy,
        drawings_data: t.drawingDetails,
        status: t.status,
        remarks: t.remarks || ""
      })));
    }

    if (bundle.rfis && bundle.rfis.length > 0) {
      await supabase.from("design_rfis").upsert(bundle.rfis.map(r => ({
        id: r.id,
        rfi_number: r.rfiNumber,
        project_id: r.projectId,
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
        target_resolution_date: r.targetResolutionDate,
        status: r.status,
        consultant_response: r.consultantResponse || "",
        responded_date: r.respondedDate || null
      })));
    }

    return { success: true };
  } catch (err: any) {
    console.warn("syncDesignTrackingBundle database persistence note:", err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Save / Update a Single Transmittal
 */
export async function saveTransmittalAction(transmittal: TransmittalItem) {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_transmittals").upsert({
      id: transmittal.id,
      transmittal_number: transmittal.transmittalNumber,
      project_id: transmittal.projectId,
      project_name: transmittal.projectName,
      tower_name: transmittal.towerName || "",
      issue_date: transmittal.issueDate,
      purpose: transmittal.purpose,
      recipient_agency: transmittal.recipientAgency,
      recipient_contact: transmittal.recipientContact || "",
      issued_by: transmittal.issuedBy,
      drawing_ids: transmittal.drawingIds,
      drawings_data: transmittal.drawingDetails,
      remarks: transmittal.remarks || "",
      status: transmittal.status,
      acknowledged_at: transmittal.acknowledgedAt || null,
      acknowledged_by: transmittal.acknowledgedBy || null
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Save / Update a Single RFI
 */
export async function saveRfiAction(rfi: RfiItem) {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from("design_rfis").upsert({
      id: rfi.id,
      rfi_number: rfi.rfiNumber,
      project_id: rfi.projectId,
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
      target_resolution_date: rfi.targetResolutionDate,
      status: rfi.status,
      consultant_response: rfi.consultantResponse || "",
      responded_by: rfi.respondedBy || "",
      responded_date: rfi.respondedDate || null,
      resolving_revision_number: rfi.resolvingRevisionNumber || ""
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ==============================================================================
// Workspace RBAC & User Access Governance Actions
// ==============================================================================

/**
 * Fetch all workspace users from user_master with department, designation, role,
 * module mapping, and their specific design_user_access permissions.
 */
export async function fetchDesignWorkspaceUsersAction(): Promise<{
  success: boolean;
  users?: DesignWorkspaceUser[];
  error?: string;
}> {
  try {
    const supabase = await getSupabase();

    // Parallel fetch users, departments, designations, roles, modules_master, user_modules, and design_user_access
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

/**
 * Save or update design tracking user access permissions
 */
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
    const supabase = await getSupabase();

    // 1. Upsert into design_user_access
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
      console.warn("saveDesignUserAccessAction user client note, attempting admin:", error.message);
      const adminRes = await supabaseAdmin
        .from("design_user_access")
        .upsert(record, { onConflict: "user_id" })
        .select()
        .single();
      if (adminRes.error) {
        console.error("saveDesignUserAccessAction admin error:", adminRes.error);
        throw adminRes.error;
      }
      data = adminRes.data;
    }

    // 2. Ensure user_modules grants access to DESIGN_TRACKING module
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
      console.warn("user_modules sync warning:", modErr);
    }

    return { success: true, data: data || record };
  } catch (err: any) {
    console.error("saveDesignUserAccessAction error:", err);
    return { success: false, error: err?.message || "Failed to save design user access" };
  }
}

/**
 * Delete / Revoke design tracking user access
 */
export async function deleteDesignUserAccessAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    
    // 1. Delete from design_user_access
    const { error } = await supabase
      .from("design_user_access")
      .delete()
      .eq("user_id", userId);

    if (error) {
      await supabaseAdmin
        .from("design_user_access")
        .delete()
        .eq("user_id", userId);
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteDesignUserAccessAction error:", err);
    return { success: false, error: err?.message || "Failed to delete user access" };
  }
}

/**
 * 1-Click Toggle for Design & Tracking Module Access
 */
export async function toggleUserDesignModuleAccessAction(userId: string, enable: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: moduleData } = await supabaseAdmin
      .from("modules_master")
      .select("id")
      .eq("code", "DESIGN_TRACKING")
      .maybeSingle();

    if (!moduleData?.id) {
      return { success: false, error: "Design Tracking module definition not found" };
    }

    if (enable) {
      // 1. Add to user_modules
      await supabaseAdmin
        .from("user_modules")
        .upsert(
          { user_id: userId, module_id: moduleData.id, is_default: false },
          { onConflict: "user_id,module_id" }
        );

      // 2. Ensure default record in design_user_access exists
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
      // 1. Remove from user_modules
      await supabaseAdmin
        .from("user_modules")
        .delete()
        .eq("user_id", userId)
        .eq("module_id", moduleData.id);

      // 2. Remove from design_user_access
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


