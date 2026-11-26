"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign, isDesignStoragePath } from "@/lib/permissions/design-guard";
import { 
  DrawingItem, 
  DrawingStatus, 
  DesignDiscipline, 
  GfcRelease, 
  ConsultantPartner 
} from "../../Design_Tracking/src/types";
import { DesignTrackingService } from "../../Design_Tracking/src/services/designService";

/**
 * Server Actions: Design & Engineering Tracking
 * Integrates the dedicated Design_Tracking module services with Supabase & Next.js
 */

export async function fetchDrawingsListAction(filters?: {
  discipline?: DesignDiscipline | "ALL";
  status?: DrawingStatus | "ALL";
  project?: string | "ALL";
  query?: string;
}): Promise<{
  success: boolean;
  drawings: DrawingItem[];
  error?: string;
}> {
  try {
    await requireDesign("any");

    // Dynamic fetch from Supabase design_drawings table
    let dbDrawings: any[] | null = null;
    try {
      let query = supabaseAdmin
        .from("design_drawings")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.discipline && filters.discipline !== "ALL") {
        query = query.eq("discipline", filters.discipline);
      }
      if (filters?.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }
      if (filters?.project && filters.project !== "ALL") {
        query = query.eq("project", filters.project);
      }

      const res = await query;
      dbDrawings = res.data;
    } catch (e) {
      console.warn("Direct query of design_drawings fallback:", e);
    }

    let list: DrawingItem[] = [];
    if (dbDrawings && dbDrawings.length > 0) {
      list = dbDrawings.map((d: any) => ({
        id: d.id,
        projectId: d.project_id || undefined,
        code: d.code,
        title: d.title,
        discipline: d.discipline,
        project: d.project,
        towerName: d.tower_name || undefined,
        subPackage: d.sub_package || undefined,
        revision: d.current_revision || "R0",
        currentRevision: d.current_revision || "R0",
        status: d.status || "Under Review",
        consultant: d.consultant_name || "",
        consultantName: d.consultant_name || undefined,
        fileUrl: d.file_url || undefined,
        fileSize: d.file_size || "2.4 MB",
        submittedDate: d.submitted_date || new Date().toISOString().split("T")[0],
        approvedDate: d.approved_date || undefined,
        tags: d.tags || [],
        isGfc: !!d.is_gfc,
        gfcReleasedDate: d.gfc_released_date || undefined,
        gfcRecipient: d.gfc_recipient || undefined
      }));
    } else {
      list = await DesignTrackingService.getDrawings(filters);
    }

    if (filters?.query?.trim()) {
      const q = filters.query.toLowerCase().trim();
      list = list.filter(d => 
        (d.title || "").toLowerCase().includes(q) ||
        (d.code || "").toLowerCase().includes(q) ||
        (d.consultant || "").toLowerCase().includes(q)
      );
    }

    return { success: true, drawings: list };
  } catch (err: any) {
    return { success: false, drawings: [], error: err.message || "Failed to fetch drawings" };
  }
}

export async function fetchGfcReleasesAction(): Promise<{
  success: boolean;
  releases: GfcRelease[];
  error?: string;
}> {
  try {
    await requireDesign("any");

    // Dynamic fetch from Supabase
    try {
      const { data: gfcDrawings } = await supabaseAdmin
        .from("design_drawings")
        .select("*")
        .or("is_gfc.eq.true,status.eq.Approved (GFC),status.eq.Site Handed Over")
        .order("gfc_released_date", { ascending: false });

      if (gfcDrawings && gfcDrawings.length > 0) {
        const mapped: GfcRelease[] = gfcDrawings.map((d: any) => ({
          id: `gfc-${d.id}`,
          drawingId: d.id,
          drawingCode: d.code,
          drawingTitle: d.title,
          revisionNumber: d.current_revision || "R0",
          siteEngineerName: d.gfc_recipient || "Site Engineer",
          contractorFirm: "General Execution Contractor",
          handoverDate: d.gfc_released_date || d.approved_date || new Date().toISOString().split("T")[0],
          physicalCopiesIssued: 3
        }));
        return { success: true, releases: mapped };
      }
    } catch (e) {
      console.warn("Fallback to local GFC releases:", e);
    }

    const releases = await DesignTrackingService.getGfcReleases();
    return { success: true, releases };
  } catch (err: any) {
    return { success: false, releases: [], error: err.message || "Failed to fetch GFC releases" };
  }
}

export async function fetchConsultantsAction(): Promise<{
  success: boolean;
  consultants: ConsultantPartner[];
  error?: string;
}> {
  try {
    await requireDesign("any");

    // Dynamic fetch from Supabase design_consultants table
    try {
      const { data: dbConsultants } = await supabaseAdmin
        .from("design_consultants")
        .select("*")
        .order("firm_name", { ascending: true });

      if (dbConsultants && dbConsultants.length > 0) {
        const mapped: ConsultantPartner[] = dbConsultants.map((c: any) => ({
          id: c.id,
          name: c.firm_name,
          category: c.discipline,
          firmName: c.firm_name,
          discipline: c.discipline,
          categories: c.categories || [],
          packages: c.packages || [],
          expertise: c.expertise || [],
          leadContact: c.contact_person || c.firm_name || "Lead Partner",
          email: c.email || "consultant@partner.com",
          phone: c.phone || "+91 98000 00000",
          activeProjects: c.active_projects || [],
          onboardingStatus: (c.onboarding_status === "Onboard" ? "Onboard" : "Not Onboard") as "Onboard" | "Not Onboard",
          rating: c.rating ? Number(c.rating) : 4.5,
          totalDrawingsSubmitted: c.total_drawings_submitted || 0,
          averageTatDays: c.average_tat_days || 5,
          createdAt: c.created_at || new Date().toISOString()
        }));
        return { success: true, consultants: mapped };
      }
    } catch (e) {
      console.warn("Fallback to local consultants list:", e);
    }

    const consultants = await DesignTrackingService.getConsultants();
    return { success: true, consultants };
  } catch (err: any) {
    return { success: false, consultants: [], error: err.message || "Failed to fetch consultants" };
  }
}


/**
 * Resolves short-lived (4 hours) authenticated signed URL for private drawing files.
 */
export async function fetchDesignDrawingSignedUrlAction(storageUrlOrId: string): Promise<{
  success: boolean;
  signedUrl?: string;
  error?: string;
}> {
  try {
    await requireDesign("any");

    if (!storageUrlOrId) return { success: false, error: "Missing URL/ID" };

    if (storageUrlOrId.startsWith("storage:")) {
      const parts = storageUrlOrId.replace("storage:", "").split(":");
      const bucket = parts[0];
      const path = parts.slice(1).join(":");
      // Only Design Tracking / DMS files: never sign links into other modules' buckets.
      if (!isDesignStoragePath(bucket, path)) {
        return { success: false, error: "This file is not a Design Tracking file." };
      }

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 4); // 4 hours

      if (error || !data?.signedUrl) {
        return { success: false, error: error?.message || "Failed to create signed URL" };
      }

      return { success: true, signedUrl: data.signedUrl };
    }

    return { success: true, signedUrl: storageUrlOrId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to resolve file URL" };
  }
}

