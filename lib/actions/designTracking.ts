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
  DesignRbacPolicy
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
      rbacRes
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
      supabase.from("design_rbac_policies").select("*")
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
        rbacPolicies: rbacRes.data || null
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
 * Save / Update RBAC Policies
 */
export async function saveRbacPoliciesAction(policies: DesignRbacPolicy[]) {
  try {
    const supabase = await getSupabase();
    if (policies && policies.length > 0) {
      await supabase.from("design_rbac_policies").upsert(policies.map(p => ({
        id: p.id,
        role_code: p.roleCode,
        role_name: p.roleName,
        project_id: p.projectId,
        project_name: p.projectName,
        module: p.module,
        can_create: p.canCreate,
        can_read: p.canRead,
        can_update: p.canUpdate,
        can_delete: p.canDelete,
        updated_at: p.updatedAt || new Date().toISOString()
      })));
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
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
