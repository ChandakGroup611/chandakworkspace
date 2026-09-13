"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { 
  ProjectMaster, 
  TowerMaster, 
  WorkPackageMaster, 
  StatutoryAuthorityMaster, 
  ConsultantMaster,
  PackageStatusEntry,
  LookAheadEntry,
  StatutoryClearanceEntry 
} from "@/Design_Tracking/src/types/masterTypes";
import { 
  DrawingItem, 
  DrawingRevision, 
  TransmittalItem, 
  RfiItem 
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
      rfisRes
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
      supabase.from("design_rfis").select("*")
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
        rfis: rfisRes.data || null
      }
    };
  } catch (error: any) {
    console.warn("Supabase fetchFullDesignTrackingState fallback to local store:", error?.message || error);
    return { success: false, error: error?.message || "Failed to fetch from Supabase" };
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
