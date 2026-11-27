"use client";
import "./design-refresh.css";

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
  HelpCircle,
  BookOpen
} from "lucide-react";
import dynamic from "next/dynamic";
import { useFlashHighlight } from "@/components/ui/record";
import { AppTableSkeleton } from "@/components/ui/AppSkeleton";

const BuildingSectionMatrix = dynamic(() => import("../../Design_Tracking/src/components/BuildingSectionMatrix").then(m => m.BuildingSectionMatrix), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DmsFolderRepository = dynamic(() => import("../../Design_Tracking/src/components/DmsFolderRepository").then(m => m.DmsFolderRepository), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DmsApprovalsPage = dynamic(() => import("../../Design_Tracking/src/components/DmsApprovalsPage").then(m => m.DmsApprovalsPage), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DrawingCoordinationTracker = dynamic(() => import("../../Design_Tracking/src/components/DrawingCoordinationTracker").then(m => m.DrawingCoordinationTracker), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const ExpectedDeliverablesView = dynamic(() => import("../../Design_Tracking/src/components/ExpectedDeliverablesView").then(m => m.ExpectedDeliverablesView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DesignCockpitView = dynamic(() => import("../../Design_Tracking/src/components/DesignCockpitView").then(m => m.DesignCockpitView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const TenderDesignMatrix = dynamic(() => import("../../Design_Tracking/src/components/TenderDesignMatrix").then(m => m.TenderDesignMatrix), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const LookAheadDashboard = dynamic(() => import("../../Design_Tracking/src/components/LookAheadDashboard").then(m => m.LookAheadDashboard), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={6} />
});
const LiaisoningTracker = dynamic(() => import("../../Design_Tracking/src/components/LiaisoningTracker").then(m => m.LiaisoningTracker), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DesignStagesRoadmap = dynamic(() => import("../../Design_Tracking/src/components/DesignStagesRoadmap").then(m => m.DesignStagesRoadmap), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={6} />
});
const DrawingRegister = dynamic(() => import("../../Design_Tracking/src/components/DrawingRegister").then(m => m.DrawingRegister), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={10} />
});
const ApprovalsReviewQueue = dynamic(() => import("../../Design_Tracking/src/components/ApprovalsReviewQueue").then(m => m.ApprovalsReviewQueue), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const RevisionHistoryLogs = dynamic(() => import("../../Design_Tracking/src/components/RevisionHistoryLogs").then(m => m.RevisionHistoryLogs), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const GfcHandoverView = dynamic(() => import("../../Design_Tracking/src/components/GfcHandoverView").then(m => m.GfcHandoverView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const TransmittalManager = dynamic(() => import("../../Design_Tracking/src/components/TransmittalManager").then(m => m.TransmittalManager), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const LiveTransmittalHandoverView = dynamic(() => import("../../Design_Tracking/src/components/LiveTransmittalHandoverView").then(m => m.LiveTransmittalHandoverView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const SlaCalendarDashboardView = dynamic(() => import("../../Design_Tracking/src/components/SlaCalendarDashboardView").then(m => m.SlaCalendarDashboardView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DesignNotificationCenterView = dynamic(() => import("../../Design_Tracking/src/components/DesignNotificationCenterView").then(m => m.DesignNotificationCenterView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const ConsultantPerformanceView = dynamic(() => import("../../Design_Tracking/src/components/ConsultantPerformanceView").then(m => m.ConsultantPerformanceView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DesignIntelligenceView = dynamic(() => import("../../Design_Tracking/src/components/DesignIntelligenceView").then(m => m.DesignIntelligenceView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DesignRfiTracker = dynamic(() => import("../../Design_Tracking/src/components/DesignRfiTracker").then(m => m.DesignRfiTracker), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const ConsultantDirectory = dynamic(() => import("../../Design_Tracking/src/components/ConsultantDirectory").then(m => m.ConsultantDirectory), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DesignReportsAnalytics = dynamic(() => import("../../Design_Tracking/src/components/DesignReportsAnalytics").then(m => m.DesignReportsAnalytics), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={6} />
});
const UploadDrawingModal = dynamic(() => import("../../Design_Tracking/src/components/UploadDrawingModal").then(m => m.UploadDrawingModal), {
  ssr: false
});
const ReviewApprovalModal = dynamic(() => import("../../Design_Tracking/src/components/ReviewApprovalModal").then(m => m.ReviewApprovalModal), {
  ssr: false
});
const MastersSetupView = dynamic(() => import("../../Design_Tracking/src/components/MastersSetupView").then(m => m.MastersSetupView), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DesignRbacGovernance = dynamic(() => import("../../Design_Tracking/src/components/DesignRbacGovernance").then(m => m.DesignRbacGovernance), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
const DataEntryFormsModal = dynamic(() => import("../../Design_Tracking/src/components/DataEntryFormsModal").then(m => m.DataEntryFormsModal), {
  ssr: false
});
const DesignLearningGuide = dynamic(() => import("./DesignLearningGuide"), {
  ssr: false,
  loading: () => <AppTableSkeleton rows={8} />
});
import { DesignMasterStore } from "../../Design_Tracking/src/services/designMasterStore";
import { DrawingItem, DrawingStatus, ConsultantPartner, GfcRelease } from "../../Design_Tracking/src/types";

import { fetchDesignWorkspaceUsersAction, fetchRbacPoliciesAction, fetchFullDesignTrackingState } from "@/lib/actions/designTracking";

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
  | "BUILDING_MATRIX"
  | "DMS"
  | "DMS_APPROVALS"
  | "TRACKER"
  | "EXPECTED"
  | "COCKPIT"
  | "INTELLIGENCE"
  | "SLA_CALENDAR"
  | "NOTIFICATIONS"
  | "CONSULTANT_PERFORMANCE"
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
  | "SUB_PACKAGES"
  | "CATEGORIES"
  | "SUB_PROJECTS"
  | "PROJECTS"
  | "AUTHORITIES"
  | "TEMPLATES"
  | "REPORTS" 
  | "RBAC"
  | "MASTERS"
  | "LEARNING";

// In-memory cache timestamp to prevent redundant database hydration on tab switching
let lastDesignAccessHydratedTimestamp = 0;
const DESIGN_ACCESS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default function DesignTrackingHost({ initialSlug, currentUser }: DesignTrackingHostProps) {
  const pathname = usePathname() || "/design";
  const router = useRouter();

  // Set user context in master store and active_module cookie
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.cookie = "active_module=DESIGN_TRACKING; path=/; max-age=2592000; SameSite=Lax";
    }
    if (currentUser) {
      DesignMasterStore.setCurrentUser(
        currentUser.id,
        currentUser.roleCode || (currentUser.isAdmin ? "SUPER_ADMIN" : null)
      );
    }
  }, [currentUser]);

  // Force re-render when master store notifies of changes
  const [, setTick] = useState(0);
  useEffect(() => {
    return DesignMasterStore.subscribe(() => {
      setTick(t => t + 1);
    });
  }, []);

  // Hydrate full tracking state, user access list & policies from database
  useEffect(() => {
    const hydrateAccess = async () => {
      try {
        const [usersRes, policiesRes, fullStateRes] = await Promise.all([
          fetchDesignWorkspaceUsersAction(),
          fetchRbacPoliciesAction(),
          fetchFullDesignTrackingState()
        ]);

        if (fullStateRes.success && fullStateRes.data) {
          DesignMasterStore.hydrateFromDatabase(fullStateRes.data);
        }

        if (usersRes.success && usersRes.users) {
          const accessRecords = usersRes.users
            .filter(u => !!u.designAccess)
            .map(u => u.designAccess!);
          if (accessRecords.length > 0) {
            DesignMasterStore.saveBulkUserAccess(accessRecords);
          }
        }
        if (policiesRes.success && policiesRes.policies) {
          DesignMasterStore.bulkSaveRbacPolicies(policiesRes.policies);
        }
      } catch (err) {
        console.warn("Could not background hydrate design state/access/policies:", err);
      }
    };
    hydrateAccess();
  }, []);

  // Compute active tab seamlessly from URL path and initialSlug
  const activeTab = useMemo<ActiveTabType>(() => {
    const slugStr = (initialSlug || []).join("/").toLowerCase();
    const currentPath = (pathname || "/design").toLowerCase();
    const combined = `${currentPath}/${slugStr}`;

    if (combined.includes("/design/learning") || combined.includes("learning") || combined.includes("guide") || combined.includes("lifecycle") || combined.includes("flowchart") || combined.includes("playbook") || combined.includes("sop")) return "LEARNING";
    if (combined.includes("/design/dms-approvals") || combined.includes("dms-approval")) return "DMS_APPROVALS";
    if (combined.includes("/design/tracker") || combined.includes("drawing-tracker")) return "TRACKER";
    if (combined.includes("/design/expected") || combined.includes("expected-deliverables")) return "EXPECTED";
    if (combined.includes("/design/cockpit")) return "COCKPIT";
    if (combined.includes("/design/dms") || combined.includes("folder-repo") || combined.includes("doc-repo") || combined.includes("repository")) return "DMS";
    if (combined.includes("building-matrix") || combined.includes("section-matrix") || combined.includes("heat-matrix") || combined.includes("floor-matrix")) return "BUILDING_MATRIX";
    if (combined.includes("sub-package") || combined.includes("subpackage") || combined.includes("/design/sub-packages")) return "SUB_PACKAGES";
    if (combined.includes("category") || combined.includes("categories") || combined.includes("discipline")) return "PACKAGES";
    // "wing" must be a whole word: "/design/drawings" contains "wing" and used to open Sub-projects
    if (combined.includes("sub-project") || combined.includes("subproject") || /(^|[/_-])wings?($|[/_-])/.test(combined)) return "SUB_PROJECTS";
    if (combined.includes("project-master") || combined.includes("projects-master") || combined.includes("/design/projects") || combined.endsWith("/projects")) return "PROJECTS";
    if (combined.includes("authorit")) return "AUTHORITIES";
    if (combined.includes("template") || combined.includes("backup")) return "TEMPLATES";
    if (combined.includes("rbac") || combined.includes("access") || combined.includes("policy") || combined.includes("permission") || combined.includes("governance")) return "RBAC";
    if (combined.includes("package") || combined.includes("work-package") || combined.includes("workpackage")) return "PACKAGES";
    if (combined.includes("master") || combined.includes("setting")) return "MASTERS";
    if (combined.includes("sla-calendar") || combined.includes("sla_calendar")) return "SLA_CALENDAR";
    if (combined.includes("notifications") || combined.includes("notification")) return "NOTIFICATIONS";
    if (combined.includes("consultant-performance") || combined.includes("scorecard")) return "CONSULTANT_PERFORMANCE";
    if (combined.includes("intelligence")) return "INTELLIGENCE";
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

  // Page heading = the screen's name, worded as in the side menu (was "Design & engineering tracking" on every screen)
  const SCREEN_TITLE: Record<ActiveTabType, string> = {
    MATRIX: "Tender design matrix",
    BUILDING_MATRIX: "Building section matrix",
    DMS: "DMS folders",
    DMS_APPROVALS: "DMS & Drawing Approval",
    TRACKER: "Drawing register tracker",
    EXPECTED: "Expected drawing deliverables",
    COCKPIT: "Design management cockpit",
    INTELLIGENCE: "Design intelligence",
    SLA_CALENDAR: "SLA & holiday calendar",
    NOTIFICATIONS: "Design notifications",
    CONSULTANT_PERFORMANCE: "Consultant scorecard",
    LOOK_AHEAD: "Look-ahead forecast",
    LIAISONING: "Statutory liaisoning",
    STAGES: "Design stages roadmap",
    DRAWINGS: "Drawing register",
    APPROVALS: "Design approvals",
    REVISIONS: "Revision history",
    GFC_HANDOVER: "GFC site handover",
    TRANSMITTALS: "Transmittals and slips",
    RFIS: "RFIs and site queries",
    LEARNING: "Learning and lifecycle guide",
    CONSULTANTS: "Consultant directory",
    REPORTS: "Design analytics",
    RBAC: "Users & Access",
    MASTERS: "Masters setup",
    PROJECTS: "Projects",
    SUB_PROJECTS: "Sub-projects",
    PACKAGES: "Packages",
    SUB_PACKAGES: "Sub-packages",
    CATEGORIES: "Categories",
    AUTHORITIES: "Authorities",
    TEMPLATES: "Templates",
  };
  const screenTitle = SCREEN_TITLE[activeTab] ?? "Design and Drawing";

  const handleTabChange = (tab: ActiveTabType) => {
    const routeMap: Record<ActiveTabType, string> = {
      MATRIX: "/design/matrix",
      BUILDING_MATRIX: "/design/building-matrix",
      DMS: "/design/dms",
      DMS_APPROVALS: "/design/dms-approvals",
      TRACKER: "/design/tracker",
      EXPECTED: "/design/expected",
      COCKPIT: "/design/cockpit",
      INTELLIGENCE: "/design/intelligence",
      SLA_CALENDAR: "/design/sla-calendar",
      NOTIFICATIONS: "/design/notifications",
      CONSULTANT_PERFORMANCE: "/design/consultant-performance",
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
      SUB_PACKAGES: "/design/sub-packages",
      CATEGORIES: "/design/packages",
      SUB_PROJECTS: "/design/sub-projects",
      PROJECTS: "/design/projects",
      AUTHORITIES: "/design/authorities",
      TEMPLATES: "/design/templates",
      REPORTS: "/design/reports",
      RBAC: "/design/rbac",
      MASTERS: "/design/masters",
      LEARNING: "/design/learning"
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
        handoverDate: d.approvedDate || new Date().toISOString().slice(0, 10),
        status: "Active GFC" as const
      }));
  }, [accessibleDrawings]);

  // Record standard: the drawing just registered is highlighted in the register.
  const [newDrawingId, setNewDrawingId] = useFlashHighlight();
  // The drawing is saved on the server (register + R0 submission); reload the register and highlight it.
  const handleDrawingUploaded = async (drawingRef: string) => {
    await DesignMasterStore.refreshDrawings();
    setNewDrawingId(drawingRef);
  };

  // A review step was recorded on the server; reload so every screen shows the new state.
  const handleReviewRecorded = () => {
    void DesignMasterStore.refreshDrawings();
  };

  const isAnyHostTransactionOpen = isDataEntryOpen || isUploadOpen || Boolean(selectedDrawingForReview);

  return (
    <div className="design-desk w-full flex-1 flex flex-col space-y-5 min-w-0">
      {/* Quick Data Entry Transaction Canvas */}
      {isDataEntryOpen && (
        <DataEntryFormsModal
          isOpen={isDataEntryOpen}
          onClose={() => setIsDataEntryOpen(false)}
        />
      )}

      {/* Upload Drawing Transaction Canvas */}
      {isUploadOpen && (
        <UploadDrawingModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onDrawingUploaded={handleDrawingUploaded}
        />
      )}

      {/* Review & GFC Stamp Working Document Canvas */}
      {selectedDrawingForReview && (
        <ReviewApprovalModal
          drawing={selectedDrawingForReview}
          isOpen={!!selectedDrawingForReview}
          onClose={() => setSelectedDrawingForReview(null)}
          onReviewRecorded={handleReviewRecorded}
        />
      )}

      {/* Standard Module View (When No Host Transaction Canvas is Open) */}
      {!isAnyHostTransactionOpen && (
        <>
          {/* Top Header & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-accent-soft text-accent-soft-text flex items-center justify-center border border-border-active shrink-0">
                <Compass className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] text-muted mb-0.5">Design and Drawing</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">
                    {screenTitle}
                  </h1>
                  {isRestrictedProjectScope ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-sunken text-subtle">
                      <Building2 className="h-3 w-3" />
                      <span>Scoped: {accessibleProjects.map(p => p.name).join(", ")} ({accessibleProjects.length} Project{accessibleProjects.length > 1 ? "s" : ""})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-sunken text-subtle">
                      <ShieldCheck className="h-3 w-3" />
                      <span>All {accessibleProjects.length} projects</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons on Right */}
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={() => handleTabChange("LEARNING")}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-button)] border text-[13px] font-medium transition-colors cursor-pointer ${
                  activeTab === "LEARNING"
                    ? "bg-accent-soft border-transparent text-accent-soft-text"
                    : "border-border-active bg-surface hover:bg-surface-hover text-foreground"
                }`}
                title="View end-to-end workflow & lifecycle guide"
              >
                <BookOpen className="h-3.5 w-3.5 text-accent-soft-text" />
                <span>Learning & playbook</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDataEntryOpen(true)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-button)] border border-border-active bg-surface hover:bg-surface-hover text-foreground text-[13px] font-medium transition-colors cursor-pointer"
                title="Open quick data entry form"
              >
                <Plus className="h-3.5 w-3.5 text-accent-soft-text" />
                <span>Quick entry</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-button)] bg-primary hover:bg-primary-hover text-primary-foreground text-[13px] font-semibold transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload drawing</span>
              </button>
            </div>
          </div>

          {/* Tab 0: Building Section Heat Matrix */}
          {activeTab === "BUILDING_MATRIX" && (
            <BuildingSectionMatrix 
              onOpenReviewModal={(drawingId) => {
                const found = accessibleDrawings.find(d => d.id === drawingId || d.code === drawingId);
                if (found) setSelectedDrawingForReview(found);
              }}
              onOpenUploadModal={() => setIsUploadOpen(true)}
            />
          )}

          {/* Tab DMS: Enterprise DMS Folder Repository & Split Indexing */}
          {activeTab === "DMS" && (
            <DmsFolderRepository currentUser={currentUser} />
          )}

          {/* Dedicated DMS & Drawing Approval Page */}
          {activeTab === "DMS_APPROVALS" && (
            <DmsApprovalsPage
              drawings={accessibleDrawings}
              onOpenReviewModal={(drawing) => setSelectedDrawingForReview(drawing)}
            />
          )}

          {/* Drawing Register Tracker & Design Coordination */}
          {activeTab === "TRACKER" && (
            <DrawingCoordinationTracker />
          )}

          {/* Expected Drawing Deliverables Register */}
          {activeTab === "EXPECTED" && (
            <ExpectedDeliverablesView />
          )}

          {/* Design Management Cockpit */}
          {activeTab === "COCKPIT" && (
            <DesignCockpitView />
          )}

          {/* Design Intelligence (Release 4) */}
          {activeTab === "INTELLIGENCE" && (
            <DesignIntelligenceView />
          )}

          {/* SLA & Holiday Calendar (Release 3) */}
          {activeTab === "SLA_CALENDAR" && (
            <SlaCalendarDashboardView />
          )}

          {/* Design Notifications (Release 3) */}
          {activeTab === "NOTIFICATIONS" && (
            <DesignNotificationCenterView />
          )}

          {/* Consultant Performance Scorecard (Release 3) */}
          {activeTab === "CONSULTANT_PERFORMANCE" && (
            <ConsultantPerformanceView />
          )}

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
              highlightId={newDrawingId}
            />
          )}

          {/* Tab 6: Approvals & Review Queue */}
          {activeTab === "APPROVALS" && (
            <ApprovalsReviewQueue 
              drawings={accessibleDrawings}
              onOpenReviewModal={(drawing) => setSelectedDrawingForReview(drawing)}
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
            <TransmittalsTabShell />
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

          {/* Tab 12: Package Master Direct View */}
          {(activeTab === "PACKAGES" || activeTab === "CATEGORIES") && (
            <MastersSetupView initialSubTab="PACKAGES" />
          )}

          {/* Tab 12b: Sub Package Master Direct View */}
          {activeTab === "SUB_PACKAGES" && (
            <MastersSetupView initialSubTab="SUB_PACKAGES" />
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

          {/* Tab 16: Learning, Architecture & Lifecycle Guide */}
          {activeTab === "LEARNING" && (
            <DesignLearningGuide onNavigateTab={(tabRoute) => router.push(tabRoute)} />
          )}
        </>
      )}
    </div>
  );
}

function TransmittalsTabShell() {
  const [mode, setMode] = useState<"LIVE" | "LEGACY">("LIVE");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("LIVE")}
          className={`px-3 py-2 min-h-10 rounded-md text-sm font-medium border ${
            mode === "LIVE"
              ? "bg-theme-btn-primary text-theme-btn-primary-text border-transparent"
              : "border-border bg-surface hover:bg-elevated"
          }`}
        >
          Live Drawing Transmittals
        </button>
        <button
          type="button"
          onClick={() => setMode("LEGACY")}
          className={`px-3 py-2 min-h-10 rounded-md text-sm font-medium border ${
            mode === "LEGACY"
              ? "bg-theme-btn-primary text-theme-btn-primary-text border-transparent"
              : "border-border bg-surface hover:bg-elevated"
          }`}
        >
          Dispatch Slips Register
        </button>
      </div>
      {mode === "LIVE" ? <LiveTransmittalHandoverView /> : <TransmittalManager />}
    </div>
  );
}
