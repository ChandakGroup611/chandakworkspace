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
