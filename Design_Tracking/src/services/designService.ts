import { DrawingItem, DrawingStatus, ConsultantPartner, GfcRelease, DesignDiscipline } from "../types";
import { mockDrawings, mockConsultants, mockGfcReleases, mockProjects } from "../mock/designMockData";

/**
 * Design Tracking Module Service Client
 * Provides localized data fetching and mutation methods for drawings, revisions, and GFC handovers.
 */
export class DesignTrackingService {
  private static drawings: DrawingItem[] = [...mockDrawings];
  private static consultants: ConsultantPartner[] = [...mockConsultants];
  private static gfcReleases: GfcRelease[] = [...mockGfcReleases];

  static async getDrawings(filters?: {
    discipline?: DesignDiscipline | "ALL";
    status?: DrawingStatus | "ALL";
    project?: string | "ALL";
    query?: string;
  }): Promise<DrawingItem[]> {
    let list = [...this.drawings];

    if (filters?.discipline && filters.discipline !== "ALL") {
      list = list.filter(d => d.discipline === filters.discipline);
    }
    if (filters?.status && filters.status !== "ALL") {
      list = list.filter(d => d.status === filters.status);
    }
    if (filters?.project && filters.project !== "ALL") {
      list = list.filter(d => d.project === filters.project);
    }
    if (filters?.query?.trim()) {
      const q = filters.query.toLowerCase();
      list = list.filter(d => 
        d.title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.consultant.toLowerCase().includes(q)
      );
    }

    return list;
  }

  static async createDrawing(payload: Omit<DrawingItem, "id">): Promise<DrawingItem> {
    const newDrawing: DrawingItem = {
      ...payload,
      id: `drw-${Date.now().toString(36)}`
    };
    this.drawings = [newDrawing, ...this.drawings];
    return newDrawing;
  }

  static async updateDrawingStatus(
    drawingId: string, 
    newStatus: DrawingStatus,
    approvedDate?: string
  ): Promise<DrawingItem | null> {
    const idx = this.drawings.findIndex(d => d.id === drawingId);
    if (idx === -1) return null;

    this.drawings[idx] = {
      ...this.drawings[idx],
      status: newStatus,
      approvedDate: newStatus === "Approved (GFC)" ? (approvedDate || new Date().toISOString().split("T")[0]) : this.drawings[idx].approvedDate
    };

    return this.drawings[idx];
  }

  static async getConsultants(): Promise<ConsultantPartner[]> {
    return [...this.consultants];
  }

  static async getGfcReleases(): Promise<GfcRelease[]> {
    return [...this.gfcReleases];
  }

  static async recordGfcHandover(payload: Omit<GfcRelease, "id">): Promise<GfcRelease> {
    const release: GfcRelease = {
      ...payload,
      id: `gfc-${Date.now().toString(36)}`
    };
    this.gfcReleases = [release, ...this.gfcReleases];
    
    // Update parent drawing status to "Site Handed Over"
    await this.updateDrawingStatus(payload.drawingId, "Site Handed Over");

    return release;
  }

  static async getProjectsSummary() {
    return [...mockProjects];
  }
}
