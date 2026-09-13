"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Compass, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Building2, 
  ShieldCheck, 
  FileText, 
  Users, 
  Calendar,
  Sparkles,
  Search,
  ArrowUpRight,
  TrendingUp, 
  FileSpreadsheet, 
  Activity, 
  Plus, 
  Settings2, 
  Database,
  RotateCcw,
  LineChart
} from "lucide-react";
import { TenderDesignMatrix } from "../../Design_Tracking/src/components/TenderDesignMatrix";
import { LookAheadDashboard } from "../../Design_Tracking/src/components/LookAheadDashboard";
import { LiaisoningTracker } from "../../Design_Tracking/src/components/LiaisoningTracker";
import { DesignStagesRoadmap } from "../../Design_Tracking/src/components/DesignStagesRoadmap";
import { DrawingRegister } from "../../Design_Tracking/src/components/DrawingRegister";
import { ApprovalsReviewQueue } from "../../Design_Tracking/src/components/ApprovalsReviewQueue";
import { RevisionHistoryLogs } from "../../Design_Tracking/src/components/RevisionHistoryLogs";
import { GfcHandoverView } from "../../Design_Tracking/src/components/GfcHandoverView";
import { ConsultantDirectory } from "../../Design_Tracking/src/components/ConsultantDirectory";
import { DesignReportsAnalytics } from "../../Design_Tracking/src/components/DesignReportsAnalytics";
import { UploadDrawingModal } from "../../Design_Tracking/src/components/UploadDrawingModal";
import { ReviewApprovalModal } from "../../Design_Tracking/src/components/ReviewApprovalModal";
import { MastersSetupView } from "../../Design_Tracking/src/components/MastersSetupView";
import { DataEntryFormsModal } from "../../Design_Tracking/src/components/DataEntryFormsModal";
import { DesignMasterStore } from "../../Design_Tracking/src/services/designMasterStore";
import { mockDrawings, mockGfcReleases, mockConsultants } from "../../Design_Tracking/src/mock/designMockData";
import { DrawingItem, DrawingStatus } from "../../Design_Tracking/src/types";

type ActiveTabType = 
  | "MATRIX" 
  | "LOOK_AHEAD" 
  | "LIAISONING" 
  | "STAGES" 
  | "DRAWINGS" 
  | "APPROVALS" 
  | "REVISIONS" 
  | "GFC_HANDOVER" 
  | "CONSULTANTS" 
  | "REPORTS" 
  | "MASTERS";

export default function DesignTrackingHost({ initialSlug }: { initialSlug?: string[] }) {
  const pathname = usePathname() || "/design";
  const router = useRouter();

  // Compute active tab seamlessly from URL path and initialSlug
  const activeTab = useMemo<ActiveTabType>(() => {
    const slugStr = (initialSlug || []).join("/").toLowerCase();
    const currentPath = (pathname || "/design").toLowerCase();
    const combined = `${currentPath}/${slugStr}`;

    if (combined.includes("master") || combined.includes("setting")) return "MASTERS";
    if (combined.includes("look-ahead") || combined.includes("forecast")) return "LOOK_AHEAD";
    if (combined.includes("liaison") || combined.includes("clearance") || combined.includes("noc")) return "LIAISONING";
    if (combined.includes("stage") || combined.includes("roadmap")) return "STAGES";
    if (combined.includes("approval") || combined.includes("review")) return "APPROVALS";
    if (combined.includes("revision") || combined.includes("history")) return "REVISIONS";
    if (combined.includes("drawing") || combined.includes("sheet") || combined.includes("register") || combined.includes("blueprint")) return "DRAWINGS";
    if (combined.includes("handover") || combined.includes("gfc") || combined.includes("site-release")) return "GFC_HANDOVER";
    if (combined.includes("consultant") || combined.includes("directory") || combined.includes("dictionary")) return "CONSULTANTS";
    if (combined.includes("report") || combined.includes("analytic")) return "REPORTS";
    return "MATRIX";
  }, [pathname, initialSlug]);

  const handleTabChange = (tab: ActiveTabType) => {
    const routeMap: Record<ActiveTabType, string> = {
      MATRIX: "/design/matrix",
      LOOK_AHEAD: "/design/look-ahead",
      LIAISONING: "/design/liaisoning",
      STAGES: "/design/stages",
      DRAWINGS: "/design/drawings",
      APPROVALS: "/design/approvals",
      REVISIONS: "/design/revisions",
      GFC_HANDOVER: "/design/handover",
      CONSULTANTS: "/design/consultants",
      REPORTS: "/design/reports",
      MASTERS: "/design/masters"
    };
    router.push(routeMap[tab]);
  };

  // Dynamic Master Store State
  const [storeState, setStoreState] = useState(() => DesignMasterStore.getState());
  const [isDataEntryOpen, setIsDataEntryOpen] = useState(false);

  // Drawings & Modals state
  const [drawings, setDrawings] = useState<DrawingItem[]>(mockDrawings);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDrawingForReview, setSelectedDrawingForReview] = useState<DrawingItem | null>(null);

  // Subscribe to DesignMasterStore for real-time live synchronization
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState(DesignMasterStore.getState());
    });
    return unsubscribe;
  }, []);

  // Dynamic KPI Metrics derived on the fly from active masters
  const totalProjects = storeState.projects.length;
  const totalTowers = storeState.towers.length;
  const totalWorkPackages = storeState.packages.length;

  const totalReceivedPackages = useMemo(() => {
    return Object.values(storeState.packageStatuses).filter(s => {
      const lower = s.status.toLowerCase();
      return lower.includes("received") || lower.includes("cleared") || lower.includes("done");
    }).length;
  }, [storeState.packageStatuses]);

  const totalPossiblePackageCells = totalWorkPackages * totalTowers;
  const overallDeliveryRate = totalPossiblePackageCells > 0 
    ? Math.min(100, Math.round((totalReceivedPackages / totalPossiblePackageCells) * 100))
    : 0;

  const count30 = useMemo(() => {
    return storeState.lookAheads.filter(i => i.timeframe === "30_DAYS").length;
  }, [storeState.lookAheads]);

  const count60 = useMemo(() => {
    return storeState.lookAheads.filter(i => i.timeframe === "60_DAYS").length;
  }, [storeState.lookAheads]);

  const handleDrawingUploaded = (newDrawing: Omit<DrawingItem, "id">) => {
    const created: DrawingItem = {
      ...newDrawing,
      id: `drw-${Date.now().toString(36)}`
    };
    setDrawings(prev => [created, ...prev]);
  };

  const handleStatusUpdated = (drawingId: string, newStatus: DrawingStatus) => {
    setDrawings(prev => prev.map(d => {
      if (d.id === drawingId) {
        return {
          ...d,
          status: newStatus,
          approvedDate: newStatus === "Approved (GFC)" ? new Date().toISOString().split("T")[0] : d.approvedDate
        };
      }
      return d;
    }));
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 min-w-0 animate-in fade-in duration-200">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Design & Engineering Tracking
            </h1>
            <p className="text-xs text-muted-foreground">
              Tender package matrices, statutory liaisoning, drawing revisions & GFC site releases
            </p>
          </div>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsDataEntryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-semibold transition-colors cursor-pointer"
            title="Open quick data entry form"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Quick Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Drawing</span>
          </button>
        </div>
      </div>

      {/* Main Module Segmented Tabs Navigation */}
      <div className="border-b border-border flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max pb-0.5">
          <button
            type="button"
            onClick={() => handleTabChange("MATRIX")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "MATRIX"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className={`h-3.5 w-3.5 ${activeTab === "MATRIX" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span>Tender Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("LOOK_AHEAD")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "LOOK_AHEAD"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${activeTab === "LOOK_AHEAD" ? "text-amber-500" : "text-muted-foreground"}`} />
            <span>Look-Ahead</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("LIAISONING")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "LIAISONING"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className={`h-3.5 w-3.5 ${activeTab === "LIAISONING" ? "text-purple-500" : "text-muted-foreground"}`} />
            <span>Statutory Liaisoning</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("STAGES")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "STAGES"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className={`h-3.5 w-3.5 ${activeTab === "STAGES" ? "text-blue-500" : "text-muted-foreground"}`} />
            <span>Design Stages</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("DRAWINGS")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "DRAWINGS"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className={`h-3.5 w-3.5 ${activeTab === "DRAWINGS" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span>Drawing Register</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("APPROVALS")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "APPROVALS"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className={`h-3.5 w-3.5 ${activeTab === "APPROVALS" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span>Approvals</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("REVISIONS")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "REVISIONS"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <RotateCcw className={`h-3.5 w-3.5 ${activeTab === "REVISIONS" ? "text-blue-500" : "text-muted-foreground"}`} />
            <span>Revision History</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("GFC_HANDOVER")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "GFC_HANDOVER"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className={`h-3.5 w-3.5 ${activeTab === "GFC_HANDOVER" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span>GFC Handover</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("CONSULTANTS")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "CONSULTANTS"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className={`h-3.5 w-3.5 ${activeTab === "CONSULTANTS" ? "text-purple-500" : "text-muted-foreground"}`} />
            <span>Consultants</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("REPORTS")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "REPORTS"
                ? "border-emerald-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <LineChart className={`h-3.5 w-3.5 ${activeTab === "REPORTS" ? "text-teal-500" : "text-muted-foreground"}`} />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("MASTERS")}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "MASTERS"
                ? "border-teal-500 text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className={`h-3.5 w-3.5 ${activeTab === "MASTERS" ? "text-teal-500" : "text-muted-foreground"}`} />
            <span>Masters Setup</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Master Tender Design Matrix */}
      {activeTab === "MATRIX" && (
        <TenderDesignMatrix />
      )}

      {/* Tab 2: 30 / 60 Day Look Ahead */}
      {activeTab === "LOOK_AHEAD" && (
        <LookAheadDashboard />
      )}

      {/* Tab 3: Liaisoning Tracker */}
      {activeTab === "LIAISONING" && (
        <LiaisoningTracker />
      )}

      {/* Tab 4: Design Stages Roadmap */}
      {activeTab === "STAGES" && (
        <DesignStagesRoadmap />
      )}

      {/* Tab 5: Drawing Sheet Register */}
      {activeTab === "DRAWINGS" && (
        <DrawingRegister 
          drawings={drawings}
          onOpenReviewModal={(drawing) => setSelectedDrawingForReview(drawing)}
          onOpenUploadModal={() => setIsUploadOpen(true)}
        />
      )}

      {/* Tab 6: Approvals & Review Queue */}
      {activeTab === "APPROVALS" && (
        <ApprovalsReviewQueue 
          drawings={drawings}
          onOpenReviewModal={(drawing) => setSelectedDrawingForReview(drawing)}
          onQuickStatusUpdate={handleStatusUpdated}
        />
      )}

      {/* Tab 7: Revision History Logs */}
      {activeTab === "REVISIONS" && (
        <RevisionHistoryLogs 
          drawings={drawings}
        />
      )}

      {/* Tab 8: Site Handover & GFC View */}
      {activeTab === "GFC_HANDOVER" && (
        <GfcHandoverView releases={mockGfcReleases} />
      )}

      {/* Tab 9: Consultant Directory / Dictionary */}
      {activeTab === "CONSULTANTS" && (
        <ConsultantDirectory consultants={mockConsultants} />
      )}

      {/* Tab 10: Design Reports & Analytics */}
      {activeTab === "REPORTS" && (
        <DesignReportsAnalytics 
          drawings={drawings}
          consultants={mockConsultants}
        />
      )}

      {/* Tab 11: Masters Setup View */}
      {activeTab === "MASTERS" && (
        <MastersSetupView />
      )}

      {/* Quick Data Entry Modal */}
      <DataEntryFormsModal
        isOpen={isDataEntryOpen}
        onClose={() => setIsDataEntryOpen(false)}
      />

      {/* Upload Drawing Modal */}
      <UploadDrawingModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDrawingUploaded={handleDrawingUploaded}
      />

      {/* Review & GFC Stamp Modal */}
      <ReviewApprovalModal
        drawing={selectedDrawingForReview}
        isOpen={!!selectedDrawingForReview}
        onClose={() => setSelectedDrawingForReview(null)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
