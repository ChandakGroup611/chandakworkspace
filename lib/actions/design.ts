"use server";

import { getCachedUser } from "@/lib/auth/cached-user";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { 
  DrawingItem, 
  DrawingStatus, 
  DesignDiscipline, 
  GfcRelease, 
  ConsultantPartner 
} from "../../Design_Tracking/src/types";
import { DesignTrackingService } from "../../Design_Tracking/src/services/designService";

async function getAuthenticatedUser() {
  try {
    const { user } = await getCachedUser();
    return user || null;
  } catch {
    return null;
  }
}

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
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, drawings: [], error: "Unauthorized" };

    const drawings = await DesignTrackingService.getDrawings(filters);
    return { success: true, drawings };
  } catch (err: any) {
    return { success: false, drawings: [], error: err.message || "Failed to fetch drawings" };
  }
}

export async function createDrawingAction(payload: Omit<DrawingItem, "id">): Promise<{
  success: boolean;
  drawing?: DrawingItem;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const drawing = await DesignTrackingService.createDrawing(payload);
    return { success: true, drawing };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create drawing" };
  }
}

export async function updateDrawingStatusAction(
  drawingId: string, 
  status: DrawingStatus
): Promise<{
  success: boolean;
  drawing?: DrawingItem | null;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const drawing = await DesignTrackingService.updateDrawingStatus(drawingId, status);
    return { success: true, drawing };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update drawing status" };
  }
}

export async function fetchGfcReleasesAction(): Promise<{
  success: boolean;
  releases: GfcRelease[];
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, releases: [], error: "Unauthorized" };

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
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, consultants: [], error: "Unauthorized" };

    const consultants = await DesignTrackingService.getConsultants();
    return { success: true, consultants };
  } catch (err: any) {
    return { success: false, consultants: [], error: err.message || "Failed to fetch consultants" };
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Enterprise Drawing Storage Upload Pipeline
 * Directly uploads large engineering CAD, BIM, DWG, DXF, or PDF files to private Supabase Storage.
 * Stores lightweight `storage:<bucket>:<path>` URI in metadata, ensuring 0 Base64 strings in PostgreSQL.
 */
export async function uploadDesignDrawingFileAction(formData: FormData): Promise<{
  success: boolean;
  storageUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "No file provided" };

    const project = (formData.get("project") as string) || "General";
    const code = (formData.get("code") as string) || "DRW";

    const cleanProject = project.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanCode = code.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const storagePath = `drawings/${cleanProject}/${cleanCode}_${timestamp}_${cleanFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to design-drawings bucket with automatic fallback to ticket-attachments
    let bucket = "design-drawings";
    let { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true
      });

    if (upErr) {
      bucket = "ticket-attachments";
      const { error: fallbackErr } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true
        });
      if (fallbackErr) {
        return { success: false, error: fallbackErr.message || upErr.message };
      }
    }

    const storageUrl = `storage:${bucket}:${storagePath}`;

    return {
      success: true,
      storageUrl,
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      fileType: file.type || "application/octet-stream"
    };
  } catch (err: any) {
    console.error("uploadDesignDrawingFileAction error:", err);
    return { success: false, error: err?.message || "Failed to upload drawing file" };
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
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!storageUrlOrId) return { success: false, error: "Missing URL/ID" };

    if (storageUrlOrId.startsWith("storage:")) {
      const parts = storageUrlOrId.replace("storage:", "").split(":");
      const bucket = parts[0];
      const path = parts.slice(1).join(":");

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

