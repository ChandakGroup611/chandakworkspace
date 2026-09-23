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
  LineChart,
  Send,
  HelpCircle
} from "lucide-react";
import { TenderDesignMatrix } from "../../Design_Tracking/src/components/TenderDesignMatrix";
import { LookAheadDashboard } from "../../Design_Tracking/src/components/LookAheadDashboard";
import { LiaisoningTracker } from "../../Design_Tracking/src/components/LiaisoningTracker";
import { DesignStagesRoadmap } from "../../Design_Tracking/src/components/DesignStagesRoadmap";
import { DrawingRegister } from "../../Design_Tracking/src/components/DrawingRegister";
import { ApprovalsReviewQueue } from "../../Design_Tracking/src/components/ApprovalsReviewQueue";
import { RevisionHistoryLogs } from "../../Design_Tracking/src/components/RevisionHistoryLogs";
import { GfcHandoverView } from "../../Design_Tracking/src/components/GfcHandoverView";
import { TransmittalManager } from "../../Design_Tracking/src/components/TransmittalManager";
import { DesignRfiTracker } from "../../Design_Tracking/src/components/DesignRfiTracker";
import { ConsultantDirectory } from "../../Design_Tracking/src/components/ConsultantDirectory";
import { DesignReportsAnalytics } from "../../Design_Tracking/src/components/DesignReportsAnalytics";
import { UploadDrawingModal } from "../../Design_Tracking/src/components/UploadDrawingModal";
import { ReviewApprovalModal } from "../../Design_Tracking/src/components/ReviewApprovalModal";
import { MastersSetupView } from "../../Design_Tracking/src/components/MastersSetupView";
import { DesignRbacGovernance } from "../../Design_Tracking/src/components/DesignRbacGovernance";
import { DataEntryFormsModal } from "../../Design_Tracking/src/components/DataEntryFormsModal";
import { DesignMasterStore } from "../../Design_Tracking/src/services/designMasterStore";
import { DrawingItem, DrawingStatus, ConsultantPartner, GfcRelease } from "../../Design_Tracking/src/types";

import { fetchDesignWorkspaceUsersAction } from "@/lib/actions/designTracking";

interface DesignTrackingHostProps {
  initialSlug?: string[];
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    roleCode: string;
    isAdmin: boolean;
  };
}

type ActiveTabType = 
  | "MATRIX" 
  | "LOOK_AHEAD" 
  | "LIAISONING" 
  | "STAGES" 
  | "DRAWINGS" 
  | "APPROVALS" 
  | "REVISIONS" 
  | "GFC_HANDOVER" 
  | "TRANSMITTALS"
  | "RFIS"
  | "CONSULTANTS" 
  | "PACKAGES"
  | "CATEGORIES"
  | "SUB_PROJECTS"
  | "PROJECTS"
  | "AUTHORITIES"
  | "TEMPLATES"
  | "REPORTS" 
  | "RBAC"
  | "MASTERS";

export default function DesignTrackingHost({ initialSlug, currentUser }: DesignTrackingHostProps) {
  const pathname = usePathname() || "/design";
  const router = useRouter();

  // Set user context in master store
  useEffect(() => {
    if (currentUser) {
      DesignMasterStore.setCurrentUser(
        currentUser.id,
        currentUser.roleCode || (currentUser.isAdmin ? "SUPER_ADMIN" : null)
      );
    }
  }, [currentUser]);

  // Hydrate user access list from database in background
  useEffect(() => {
    const hydrateAccess = async () => {
      try {
        const res = await fetchDesignWorkspaceUsersAction();
        if (res.success && res.users) {
          const accessRecords = res.users
            .filter(u => !!u.designAccess)
            .map(u => u.designAccess!);
          if (accessRecords.length > 0) {
            DesignMasterStore.saveBulkUserAccess(accessRecords);
          }
        }
      } catch (err) {
        console.warn("Could not background hydrate design access:", err);
      }
    };
    hydrateAccess();
  }, []);

  // Compute active tab seamlessly from URL path and initialSlug
  const activeTab = useMemo<ActiveTabType>(() => {
    const slugStr = (initialSlug || []).join("/").toLowerCase();
    const currentPath = (pathname || "/design").toLowerCase();
    const combined = `${currentPath}/${slugStr}`;

    if (combined.includes("category") || combined.includes("categories") || combined.includes("discipline")) return "CATEGORIES";
    if (combined.includes("sub-project") || combined.includes("subproject") || combined.includes("wing")) return "SUB_PROJECTS";
    if (combined.includes("project-master") || combined.includes("projects-master") || combined.includes("/design/projects") || combined.endsWith("/projects")) return "PROJECTS";
    if (combined.includes("authorit")) return "AUTHORITIES";
    if (combined.includes("template") || combined.includes("backup")) return "TEMPLATES";
    if (combined.includes("rbac") || combined.includes("access") || combined.includes("policy") || combined.includes("permission") || combined.includes("governance")) return "RBAC";
    if (combined.includes("package") || combined.includes("work-package") || combined.includes("workpackage")) return "PACKAGES";
    if (combined.includes("master") || combined.includes("setting")) return "MASTERS";
    if (combined.includes("transmittal") || combined.includes("dispatch")) return "TRANSMITTALS";
    if (combined.includes("rfi") || combined.includes("query") || combined.includes("clash")) return "RFIS";
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
      TRANSMITTALS: "/design/transmittals",
      RFIS: "/design/rfis",
      CONSULTANTS: "/design/consultants",
      PACKAGES: "/design/packages",
      CATEGORIES: "/design/categories",
      SUB_PROJECTS: "/design/sub-projects",
      PROJECTS: "/design/projects",
      AUTHORITIES: "/design/authorities",
      TEMPLATES: "/design/templates",
      REPORTS: "/design/reports",
      RBAC: "/design/rbac",
      MASTERS: "/design/masters"
    };
    router.push(routeMap[tab]);
  };

  // Dynamic Master Store State
  const [storeState, setStoreState] = useState(() => DesignMasterStore.getState());
  const [isDataEntryOpen, setIsDataEntryOpen] = useState(false);

  // Subscribe to DesignMasterStore for real-time live synchronization
  useEffect(() => {
    const unsubscribe = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
    });
    return unsubscribe;
  }, []);

  // Accessible Projects Scoped to Active User
  const accessibleProjects = useMemo(() => {
    return DesignMasterStore.getUserAccessibleProjects(currentUser?.id);
  }, [storeState.projects, storeState.userAccessList, currentUser?.id]);

  const isRestrictedProjectScope = accessibleProjects.length < storeState.projects.length;

  // Drawings filtered to Accessible Projects
  const accessibleDrawings = useMemo(() => {
    const allDrawings = storeState.drawings || [];
    if (!isRestrictedProjectScope) return allDrawings;
    const allowedNames = new Set(accessibleProjects.map(p => p.name.toLowerCase()));
    const allowedIds = new Set(accessibleProjects.map(p => p.id.toLowerCase()));
    return allDrawings.filter(d => 
      allowedNames.has((d.project || "").toLowerCase()) ||
      allowedIds.has((d.project || "").toLowerCase())
    );
  }, [storeState.drawings, accessibleProjects, isRestrictedProjectScope]);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDrawingForReview, setSelectedDrawingForReview] = useState<DrawingItem | null>(null);

  const handleConsultantAdded = (newC: Omit<ConsultantPartner, "id">) => {
    DesignMasterStore.addConsultant(newC);
  };

  const handleConsultantUpdated = (id: string, updates: Partial<ConsultantPartner>) => {
    DesignMasterStore.updateConsultant(id, updates);
  };

  const handleConsultantDeleted = (id: string) => {
    DesignMasterStore.deleteConsultant(id);
  };

  // Dynamic KPI Metrics derived on the fly from accessible masters
  const totalProjects = accessibleProjects.length;
  const accessibleProjectIds = useMemo(() => new Set(accessibleProjects.map(p => p.id)), [accessibleProjects]);
  const totalTowers = useMemo(() => {
    return storeState.towers.filter(t => accessibleProjectIds.has(t.projectId)).length;
  }, [storeState.towers, accessibleProjectIds]);
  const totalWorkPackages = storeState.packages.length;

  const totalReceivedPackages = useMemo(() => {
    return Object.values(storeState.packageStatuses).filter(s => {
      if (!accessibleProjectIds.has(s.projectId)) return false;
      const lower = s.status.toLowerCase();
      return lower.includes("received") || lower.includes("cleared") || lower.includes("done");
    }).length;
  }, [storeState.packageStatuses, accessibleProjectIds]);

  const totalPossiblePackageCells = totalWorkPackages * totalTowers;
  const overallDeliveryRate = totalPossiblePackageCells > 0 
    ? Math.min(100, Math.round((totalReceivedPackages / totalPossiblePackageCells) * 100))
    : 0;

  const count30 = useMemo(() => {
    return storeState.lookAheads.filter(i => accessibleProjectIds.has(i.projectId) && i.timeframe === "30_DAYS").length;
  }, [storeState.lookAheads, accessibleProjectIds]);

  const count60 = useMemo(() => {
    return storeState.lookAheads.filter(i => accessibleProjectIds.has(i.projectId) && i.timeframe === "60_DAYS").length;
  }, [storeState.lookAheads, accessibleProjectIds]);

  // Derived GFC releases from accessible drawings
  const gfcReleases = useMemo<GfcRelease[]>(() => {
    return accessibleDrawings
      .filter(d => d.status === "Approved (GFC)" || d.status === "Site Handed Over")
      .map((d, i) => ({
        id: `GFC-${d.code}-${i + 1}`,
        drawingId: d.id,
        drawingCode: d.code,
        drawingTitle: d.title,
        revisionNumber: d.revision,
        certifiedDate: d.approvedDate || d.submittedDate,
        siteEngineerName: "Site Execution Team",
        contractorFirm: "General Civil Contractor",
        physicalCopiesIssued: 3,
        digitalStampVerified: true,
        handoverDate: d.approvedDate || new Date().toISOString().split("T")[0],
        status: "Active GFC" as const
      }));
  }, [accessibleDrawings]);

  const handleDrawingUploaded = (newDrawing: Omit<DrawingItem, "id">) => {
    const created: DrawingItem = {
      ...newDrawing,
      id: `drw-${Date.now().toString(36)}`
    };
    DesignMasterStore.saveDrawing(created);
  };

  const handleStatusUpdated = (drawingId: string, newStatus: DrawingStatus) => {
    const approvedDate = newStatus === "Approved (GFC)" ? new Date().toISOString().split("T")[0] : undefined;
    DesignMasterStore.updateDrawingStatus(drawingId, newStatus, approvedDate);
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Design & Engineering Tracking
              </h1>
              {isRestrictedProjectScope ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <Building2 className="h-3 w-3" />
                  <span>Scoped: {accessibleProjects.map(p => p.name).join(", ")} ({accessibleProjects.length} Project{accessibleProjects.length > 1 ? "s" : ""})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Global Scope ({accessibleProjects.length} Projects)</span>
                </span>
              )}
            </div>
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
          drawings={accessibleDrawings}
          onOpenReviewModal={(drawing) => setSelectedDrawingForReview(drawing)}
          onOpenUploadModal={() => setIsUploadOpen(true)}
        />
      )}

      {/* Tab 6: Approvals & Review Queue */}
      {activeTab === "APPROVALS" && (
        <ApprovalsReviewQueue 
          drawings={accessibleDrawings}
          onOpenReviewModal={(drawing) => setSelectedDrawingForReview(drawing)}
          onQuickStatusUpdate={handleStatusUpdated}
        />
      )}

      {/* Tab 7: Revision History Logs */}
      {activeTab === "REVISIONS" && (
        <RevisionHistoryLogs 
          drawings={accessibleDrawings}
        />
      )}

      {/* Tab 8: Site Handover & GFC View */}
      {activeTab === "GFC_HANDOVER" && (
        <GfcHandoverView releases={gfcReleases} />
      )}

      {/* Tab 9: Transmittals & GFC Dispatch Slips */}
      {activeTab === "TRANSMITTALS" && (
        <TransmittalManager />
      )}

      {/* Tab 10: RFI & Site Query Tracker */}
      {activeTab === "RFIS" && (
        <DesignRfiTracker />
      )}

      {/* Tab 11: Consultant Directory / Dictionary */}
      {activeTab === "CONSULTANTS" && (
        <ConsultantDirectory 
          consultants={storeState.consultants} 
          onAddConsultant={handleConsultantAdded}
          onUpdateConsultant={handleConsultantUpdated}
          onDeleteConsultant={handleConsultantDeleted}
          availableProjects={accessibleProjects.map(p => p.name)}
          availableWorkPackages={storeState.packages.map(p => p.packageName)}
        />
      )}

      {/* Tab 12: Work Packages Master Direct View */}
      {activeTab === "PACKAGES" && (
        <MastersSetupView initialSubTab="PACKAGES" />
      )}

      {/* Direct Project Master View */}
      {activeTab === "PROJECTS" && (
        <MastersSetupView initialSubTab="PROJECTS" />
      )}

      {/* Direct Sub-Project Master View */}
      {activeTab === "SUB_PROJECTS" && (
        <MastersSetupView initialSubTab="SUB_PROJECTS" />
      )}

      {/* Direct Category Master View */}
      {activeTab === "CATEGORIES" && (
        <MastersSetupView initialSubTab="CATEGORIES" />
      )}

      {/* Direct Statutory Authorities View */}
      {activeTab === "AUTHORITIES" && (
        <MastersSetupView initialSubTab="AUTHORITIES" />
      )}

      {/* Direct Backup & Templates View */}
      {activeTab === "TEMPLATES" && (
        <MastersSetupView initialSubTab="TEMPLATES" />
      )}

      {/* Tab 13: Design Reports & Analytics */}
      {activeTab === "REPORTS" && (
        <DesignReportsAnalytics 
          drawings={accessibleDrawings}
          consultants={storeState.consultants}
        />
      )}

      {/* Tab 14: RBAC & User Access Governance */}
      {activeTab === "RBAC" && (
        <DesignRbacGovernance />
      )}

      {/* Tab 15: Masters Setup View */}
      {activeTab === "MASTERS" && (
        <MastersSetupView initialSubTab="PROJECTS" />
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
