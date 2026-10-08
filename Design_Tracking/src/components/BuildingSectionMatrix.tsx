"use client";

import React, { useState, useMemo } from "react";
import { 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Building2, 
  Layers, 
  X, 
  Filter,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Calendar,
  User,
  ExternalLink,
  MessageSquare,
  PenTool
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { BuildingSectionCell, BuildingSectionMatrixResult, fetchDrawingDetailAction } from "@/lib/actions/dmac-drawings";
import { DrawingMarkupViewer, DrawingCommentItem } from "./DrawingMarkupViewer";

interface BuildingSectionMatrixProps {
  initialData?: BuildingSectionMatrixResult;
  onOpenReviewModal?: (drawingId: string) => void;
  onOpenUploadModal?: (drawingId?: string) => void;
}

export const BuildingSectionMatrix: React.FC<BuildingSectionMatrixProps> = ({
  initialData,
  onOpenReviewModal,
  onOpenUploadModal
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<BuildingSectionCell | null>(null);
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "WORKFLOW_GUIDE">("DASHBOARD");

  // In-Browser PDF Vector Markup State
  const [isMarkupViewerOpen, setIsMarkupViewerOpen] = useState(false);
  const [markupDrawing, setMarkupDrawing] = useState<any>(null);
  const [markupRevisions, setMarkupRevisions] = useState<any[]>([]);
  const [markupComments, setMarkupComments] = useState<DrawingCommentItem[]>([]);
  const [isLoadingDrawingDetail, setIsLoadingDrawingDetail] = useState(false);

  const handleOpenMarkupStudio = async (cell: BuildingSectionCell) => {
    setIsLoadingDrawingDetail(true);
    try {
      const res = await fetchDrawingDetailAction(cell.drawingId);
      if (res.success && res.data) {
        setMarkupDrawing({
          id: cell.drawingId,
          drawingNumber: cell.drawingNumber,
          title: cell.title,
          discipline: cell.departmentName || cell.disciplineCode,
          currentStatus: cell.currentStatus,
          currentHolder: cell.currentHolder,
          latestRevNo: cell.latestRevNo,
        });
        setMarkupRevisions(res.data.revisions || []);
        setMarkupComments(res.data.comments || []);
        setIsMarkupViewerOpen(true);
      } else {
        // Fallback with current cell
        setMarkupDrawing({
          id: cell.drawingId,
          drawingNumber: cell.drawingNumber,
          title: cell.title,
          discipline: cell.departmentName || cell.disciplineCode,
          currentStatus: cell.currentStatus,
          currentHolder: cell.currentHolder,
          latestRevNo: cell.latestRevNo,
        });
        setMarkupRevisions([
          {
            id: `rev-${cell.drawingId}`,
            rev_no: cell.latestRevNo ?? 0,
            is_superseded: false,
            is_gfc: cell.currentStatus === "GFC",
            dmac_revision_files: [],
          },
        ]);
        setMarkupComments([]);
        setIsMarkupViewerOpen(true);
      }
    } catch (err) {
      console.warn("Could not fetch full drawing detail, opening markup studio with fallback:", err);
      setMarkupDrawing({
        id: cell.drawingId,
        drawingNumber: cell.drawingNumber,
        title: cell.title,
        discipline: cell.departmentName || cell.disciplineCode,
        currentStatus: cell.currentStatus,
        currentHolder: cell.currentHolder,
        latestRevNo: cell.latestRevNo,
      });
      setMarkupRevisions([
        {
          id: `rev-${cell.drawingId}`,
          rev_no: cell.latestRevNo ?? 0,
          is_superseded: false,
          is_gfc: cell.currentStatus === "GFC",
          dmac_revision_files: [],
        },
      ]);
      setMarkupComments([]);
      setIsMarkupViewerOpen(true);
    } finally {
      setIsLoadingDrawingDetail(false);
    }
  };

  // Sample data fallback for demo / standalone testing
  const matrixData = useMemo<BuildingSectionMatrixResult>(() => {
    if (initialData && initialData.floors.length > 0) {
      return initialData;
    }

    // Default Tower A (G+10) mockup hierarchy matching BRD specification
    const floors = [
      { id: "f-tr", code: "TR", name: "Terrace", floorOrder: 13 },
      { id: "f-10", code: "F10", name: "Floor 10", floorOrder: 12 },
      { id: "f-09", code: "F09", name: "Floor 09", floorOrder: 11 },
      { id: "f-08", code: "F08", name: "Floor 08", floorOrder: 10 },
      { id: "f-07", code: "F07", name: "Floor 07", floorOrder: 9 },
      { id: "f-06", code: "F06", name: "Floor 06", floorOrder: 8 },
      { id: "f-05", code: "F05", name: "Floor 05", floorOrder: 7 },
      { id: "f-04", code: "F04", name: "Floor 04", floorOrder: 6 },
      { id: "f-03", code: "F03", name: "Floor 03", floorOrder: 5 },
      { id: "f-02", code: "F02", name: "Floor 02", floorOrder: 4 },
      { id: "f-01", code: "F01", name: "Floor 01", floorOrder: 3 },
      { id: "f-gf", code: "GF", name: "Ground Floor", floorOrder: 2 },
      { id: "f-b1", code: "B1", name: "Basement 1", floorOrder: 1 }
    ];

    const disciplines = [
      { code: "ARC", name: "Architecture" },
      { code: "STR", name: "Structural" },
      { code: "PLB", name: "Plumbing" },
      { code: "ELE", name: "Electrical" },
      { code: "HVAC", name: "HVAC" },
      { code: "FIRE", name: "Fire Fighting" }
    ];

    const cells: BuildingSectionCell[] = [];
    floors.forEach((fl, fIdx) => {
      disciplines.forEach((dp, dIdx) => {
        const seed = (fIdx * 6 + dIdx) % 5;
        let status: BuildingSectionCell["currentStatus"] = "NOT_SUBMITTED";
        let holder: BuildingSectionCell["currentHolder"] = "DESIGN";
        let revNo: number | null = null;
        let days = 0;
        let isOverdue = false;

        if (seed === 0) {
          status = "APPROVED";
          holder = "NONE";
          revNo = 1;
          days = 0;
        } else if (seed === 1) {
          status = "GFC";
          holder = "NONE";
          revNo = 2;
          days = 0;
        } else if (seed === 2) {
          status = "UNDER_REVIEW";
          holder = "ENGINEERING";
          revNo = 0;
          days = 6;
          isOverdue = true; // > 5 days Engg target
        } else if (seed === 3) {
          status = "RETURNED";
          holder = "DESIGN";
          revNo = 1;
          days = 9;
          isOverdue = true; // > 7 days Design target
        } else {
          status = "NOT_SUBMITTED";
          holder = "DESIGN";
          revNo = null;
          days = 0;
        }

        cells.push({
          drawingId: `mock-${fl.code}-${dp.code}`,
          drawingNumber: `TA-${dp.code}-${fl.code}-01`,
          title: `${dp.name} Layout, ${fl.name}`,
          disciplineCode: dp.code,
          departmentName: dp.name,
          floorId: fl.id,
          floorCode: fl.code,
          floorName: fl.name,
          floorOrder: fl.floorOrder,
          currentStatus: status,
          currentHolder: holder,
          latestRevNo: revNo,
          displayRev: revNo !== null ? `R${revNo}` : "–",
          daysInCurrentState: days,
          isOverdue
        });
      });
    });

    const approvedCount = cells.filter(c => c.currentStatus === "APPROVED" || c.currentStatus === "GFC").length;
    const underReview = cells.filter(c => c.currentStatus === "UNDER_REVIEW");
    const returned = cells.filter(c => c.currentStatus === "RETURNED");

    return {
      floors,
      disciplines,
      cells,
      summary: {
        totalDrawings: cells.length,
        underReview: underReview.length,
        underReviewOverdue: underReview.filter(c => c.isOverdue).length,
        returnedForRevision: returned.length,
        returnedOverdue: returned.filter(c => c.isOverdue).length,
        approved: cells.filter(c => c.currentStatus === "APPROVED").length,
        gfc: cells.filter(c => c.currentStatus === "GFC").length,
        notSubmitted: cells.filter(c => c.currentStatus === "NOT_SUBMITTED").length,
        avgRoundsToApproval: 1.8
      }
    };
  }, [initialData]);

  // Filtered cells check
  const isCellMatch = (cell: BuildingSectionCell) => {
    if (!activeFilter) return true;
    if (activeFilter === "APPROVED") {
      return cell.currentStatus === "APPROVED" || cell.currentStatus === "GFC";
    }
    return cell.currentStatus === activeFilter;
  };

  // Status visual configurations matching BRD §9.2
  const getStatusBadge = (status: BuildingSectionCell["currentStatus"]) => {
    switch (status) {
      case "UNDER_REVIEW":
        return {
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          label: "With Engg",
          fullLabel: "Under Review"
        };
      case "RETURNED":
        return {
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          label: "With Design",
          fullLabel: "Returned for Revision"
        };
      case "APPROVED":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          label: "Approved",
          fullLabel: "Approved (Code A/B)"
        };
      case "GFC":
        return {
          bg: "bg-emerald-600 text-white dark:bg-emerald-700",
          label: "GFC",
          fullLabel: "Issued for Construction"
        };
      default:
        return {
          bg: "bg-muted text-muted-foreground border-border",
          label: "Not Sent",
          fullLabel: "Not Submitted"
        };
    }
  };

  // Waiting Longest Queue
  const waitingLongestList = useMemo(() => {
    return matrixData.cells
      .filter(c => c.currentStatus === "UNDER_REVIEW" || c.currentStatus === "RETURNED")
      .sort((a, b) => b.daysInCurrentState - a.daysInCurrentState)
      .slice(0, 8);
  }, [matrixData.cells]);

  return (
    <div className="space-y-6">
      {/* Top Header & View Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            DMAC · Tower A (G+10) Drawing Review Status
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Building Section Heat Matrix
          </h1>
          <p className="text-sm text-muted-foreground">
            Floor × Discipline operational grid, 2-sided SLA queues & real-time revision tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("DASHBOARD")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "DASHBOARD"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("WORKFLOW_GUIDE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "WORKFLOW_GUIDE"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            How it Works
          </button>
        </div>
      </div>

      {activeTab === "DASHBOARD" ? (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setActiveFilter(null)}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === null
                  ? "border-primary ring-1 ring-primary bg-surface shadow-sm"
                  : "border-border bg-surface hover:border-border/80"
              }`}
            >
              <div className="text-2xl font-black tabular-nums text-foreground">
                {matrixData.summary.totalDrawings}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Drawings in Register</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">All Disciplines</div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === "UNDER_REVIEW" ? null : "UNDER_REVIEW")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "UNDER_REVIEW"
                  ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                  : "border-border bg-surface hover:border-blue-500/40"
              }`}
            >
              <div className="text-2xl font-black tabular-nums text-blue-600 dark:text-blue-400">
                {matrixData.summary.underReview}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">With Engineering</div>
              <div className="text-[11px] font-mono font-semibold text-rose-500 mt-1">
                {matrixData.summary.underReviewOverdue > 0
                  ? `${matrixData.summary.underReviewOverdue} overdue (>5d)`
                  : "On Target"}
              </div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === "RETURNED" ? null : "RETURNED")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "RETURNED"
                  ? "border-amber-500 ring-1 ring-amber-500 bg-amber-50/10"
                  : "border-border bg-surface hover:border-amber-500/40"
              }`}
            >
              <div className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">
                {matrixData.summary.returnedForRevision}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">With Design (Revision)</div>
              <div className="text-[11px] font-mono font-semibold text-rose-500 mt-1">
                {matrixData.summary.returnedOverdue > 0
                  ? `${matrixData.summary.returnedOverdue} overdue (>7d)`
                  : "On Target"}
              </div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === "APPROVED" ? null : "APPROVED")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "APPROVED"
                  ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/10"
                  : "border-border bg-surface hover:border-emerald-500/40"
              }`}
            >
              <div className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {matrixData.summary.approved + matrixData.summary.gfc}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Approved ({Math.round(((matrixData.summary.approved + matrixData.summary.gfc) / (matrixData.summary.totalDrawings || 1)) * 100)}%)
              </div>
              <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {matrixData.summary.gfc} GFC Released
              </div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === "NOT_SUBMITTED" ? null : "NOT_SUBMITTED")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "NOT_SUBMITTED"
                  ? "border-muted-foreground ring-1 ring-muted-foreground bg-muted/20"
                  : "border-border bg-surface hover:border-muted-foreground/40"
              }`}
            >
              <div className="text-2xl font-black tabular-nums text-muted-foreground">
                {matrixData.summary.notSubmitted}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Not Yet Submitted</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">Planned Register</div>
            </button>

            <div className="p-3.5 rounded-lg border border-border bg-surface">
              <div className="text-2xl font-black tabular-nums text-foreground">
                {matrixData.summary.avgRoundsToApproval}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Avg Rounds to Approval</div>
              <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                Target &lt; 2.0
              </div>
            </div>
          </div>

          {/* Main Grid + Work Queue Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Building Section Matrix Table */}
            <div className="lg:col-span-8 space-y-3">
              <AppCard>
                <AppCardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                  <div>
                    <AppCardTitle className="text-base font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Building Grid: Floor × Discipline
                    </AppCardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Terrace to Basement section. Click any drawing cell to inspect full timeline & comment history.
                    </p>
                  </div>
                  {activeFilter && (
                    <button
                      onClick={() => setActiveFilter(null)}
                      className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear Filter ({activeFilter})
                    </button>
                  )}
                </AppCardHeader>
                <AppCardContent className="p-4 overflow-x-auto">
                  <table className="w-full border-separate border-spacing-1.5 min-w-[620px]">
                    <thead>
                      <tr>
                        <th className="text-right pr-3 text-[11px] font-mono font-semibold uppercase text-muted-foreground w-24">
                          Floor
                        </th>
                        {matrixData.disciplines.map(d => (
                          <th key={d.code} className="text-center text-[11px] font-mono font-semibold uppercase text-muted-foreground pb-1">
                            {d.name}
                          </th>
                        ))}
                        <th className="text-center text-[11px] font-mono font-semibold uppercase text-muted-foreground w-28">
                          Approved
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.floors.map(fl => {
                        const floorCells = matrixData.cells.filter(c => c.floorId === fl.id);
                        const approvedInFloor = floorCells.filter(c => c.currentStatus === "APPROVED" || c.currentStatus === "GFC").length;
                        const totalInFloor = floorCells.length || 6;
                        const pct = Math.round((approvedInFloor / totalInFloor) * 100);

                        return (
                          <tr key={fl.id}>
                            <th scope="row" className="text-right pr-3 text-xs font-mono font-bold text-muted-foreground whitespace-nowrap">
                              {fl.name}
                            </th>
                            {matrixData.disciplines.map(dp => {
                              const cell = floorCells.find(c => c.disciplineCode === dp.code);
                              if (!cell) {
                                return (
                                  <td key={dp.code}>
                                    <div className="h-11 rounded border border-dashed border-border bg-muted/10 flex items-center justify-center text-[11px] text-muted-foreground font-mono">
                                      –
                                    </div>
                                  </td>
                                );
                              }

                              const badge = getStatusBadge(cell.currentStatus);
                              const matches = isCellMatch(cell);

                              return (
                                <td key={dp.code}>
                                  <button
                                    onClick={() => setSelectedCell(cell)}
                                    className={`relative w-full min-h-[44px] py-1 px-1.5 rounded border flex flex-col items-center justify-center transition-all ${
                                      badge.bg
                                    } ${
                                      matches ? "opacity-100 ring-0 hover:ring-2 hover:ring-primary shadow-sm" : "opacity-20 hover:opacity-50"
                                    }`}
                                  >
                                    {cell.isOverdue && (
                                      <span
                                        title={`Overdue (${cell.daysInCurrentState} days in ${cell.currentHolder})`}
                                        className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-background"
                                      />
                                    )}
                                    <span className="text-[11px] font-mono font-bold leading-tight">
                                      {cell.displayRev}
                                    </span>
                                    <span className="text-[10px] font-semibold leading-tight mt-0.5 truncate max-w-[80px]">
                                      {badge.label}
                                    </span>
                                  </button>
                                </td>
                              );
                            })}
                            <td className="pl-3 whitespace-nowrap font-mono text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                  {approvedInFloor}/{totalInFloor}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Legend */}
                  <div className="mt-5 pt-3 border-t border-border flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground text-[11px] uppercase font-mono">Legend:</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-muted border border-border" /> Not Submitted
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-500/20 text-blue-600 border border-blue-500/30" /> Under Review
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500/20 text-amber-600 border border-amber-500/30" /> Returned (Revision)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30" /> Approved
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-600 text-white" /> GFC Released
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-500">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Past SLA Target
                    </span>
                  </div>
                </AppCardContent>
              </AppCard>
            </div>

            {/* Right: SLA Work Queues */}
            <div className="lg:col-span-4 space-y-4">
              {/* Waiting Longest Queue */}
              <AppCard>
                <AppCardHeader className="pb-3 border-b border-border">
                  <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Waiting Longest (Ball-in-Court)
                  </AppCardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Engg SLA: 5 working days · Design SLA: 7 working days
                  </p>
                </AppCardHeader>
                <AppCardContent className="p-2 space-y-1 max-h-[320px] overflow-y-auto">
                  {waitingLongestList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No pending items in queue.
                    </div>
                  ) : (
                    waitingLongestList.map(item => (
                      <button
                        key={item.drawingId}
                        onClick={() => setSelectedCell(item)}
                        className="w-full text-left p-2.5 rounded-md hover:bg-muted/40 transition-all flex items-center justify-between gap-3 border border-transparent hover:border-border"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold text-foreground truncate">
                            {item.drawingNumber} · {item.displayRev}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.title}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-mono font-black tabular-nums ${
                              item.isOverdue ? "text-rose-500" : "text-foreground"
                            }`}
                          >
                            {item.daysInCurrentState}d
                          </div>
                          <div className="text-[10px] text-muted-foreground font-semibold">
                            {item.currentHolder === "ENGINEERING" ? "With Engg" : "With Design"}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </AppCardContent>
              </AppCard>

              {/* Latest Operational Activity */}
              <AppCard>
                <AppCardHeader className="pb-3 border-b border-border">
                  <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Latest Activity Stream
                  </AppCardTitle>
                </AppCardHeader>
                <AppCardContent className="p-3 space-y-3 max-h-[300px] overflow-y-auto text-xs">
                  <div className="flex gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">TA-STR-F08-01 · R1 Approved</div>
                      <div className="text-[11px] text-muted-foreground">Lead Structural Engineer · 2h ago</div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">TA-PLB-F05-01 · R0 Returned (4 comments)</div>
                      <div className="text-[11px] text-muted-foreground">MEP Reviewer · 5h ago</div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">TA-ARC-F10-01 · R0 Submitted</div>
                      <div className="text-[11px] text-muted-foreground">Architecture Team · Yesterday</div>
                    </div>
                  </div>
                </AppCardContent>
              </AppCard>
            </div>
          </div>
        </>
      ) : (
        /* How It Works Tab (BRD Architecture Guide) */
        <AppCard className="max-w-4xl mx-auto">
          <AppCardHeader className="border-b border-border">
            <AppCardTitle className="text-lg font-bold">The Drawing Review & Approval Cycle</AppCardTitle>
            <p className="text-sm text-muted-foreground">
              Every drawing pass between Design and Engineering is recorded as a numbered revision with complete comment resolution traceability.
            </p>
          </AppCardHeader>
          <AppCardContent className="p-6 space-y-6 text-sm leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[10px] font-mono uppercase font-bold text-primary block mb-1">Step 1 · Design</span>
                <div className="font-bold text-foreground">Submit R0</div>
                <p className="text-xs text-muted-foreground mt-1">Upload floor drawings with drawing number & CAD/PDF sets.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[10px] font-mono uppercase font-bold text-blue-500 block mb-1">Step 2 · Engg</span>
                <div className="font-bold text-foreground">Review & Markup</div>
                <p className="text-xs text-muted-foreground mt-1">Engineer marks up PDF canvas with numbered issues.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-500 block mb-1">Step 3 · Decision</span>
                <div className="font-bold text-foreground">Code A/B/C/D</div>
                <p className="text-xs text-muted-foreground mt-1">Code C/D returns drawing to Design for revision.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[10px] font-mono uppercase font-bold text-primary block mb-1">Step 4 · Design</span>
                <div className="font-bold text-foreground">Resolve & Resubmit</div>
                <p className="text-xs text-muted-foreground mt-1">Design answers all open comments & submits R1.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-emerald-500/10">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-600 block mb-1">Step 5 · Site</span>
                <div className="font-bold text-foreground">GFC Release</div>
                <p className="text-xs text-muted-foreground mt-1">Official IFC stamp & site QR verification token issued.</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/10 border-l-4 border-amber-500 text-xs text-amber-800 dark:text-amber-300">
              <strong>Mandatory Comment Clearance Gate:</strong> Design cannot resubmit a revised drawing until every single open reviewer comment has been answered and verified.
            </div>
          </AppCardContent>
        </AppCard>
      )}

      {/* Dual-Lane Slide-Over Detail Drawer */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-surface border-l border-border h-full overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="text-xs font-mono font-semibold uppercase text-primary">
                  {selectedCell.departmentName} · {selectedCell.floorName}
                </div>
                <h2 className="text-xl font-black text-foreground mt-1">
                  {selectedCell.drawingNumber}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedCell.title}</p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Revision</div>
                <div className="text-base font-bold text-foreground mt-0.5">{selectedCell.displayRev}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Ball-in-Court</div>
                <div className="text-xs font-bold text-foreground mt-1">
                  {selectedCell.currentHolder === "ENGINEERING" ? "Engineering" : "Design Team"}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Days Elapsed</div>
                <div
                  className={`text-base font-bold tabular-nums mt-0.5 ${
                    selectedCell.isOverdue ? "text-rose-500" : "text-foreground"
                  }`}
                >
                  {selectedCell.daysInCurrentState}d
                </div>
              </div>
            </div>

            {/* Dual-Lane Split Timeline */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono uppercase font-bold text-muted-foreground border-b border-border pb-2 mb-4">
                <span>Design Lane</span>
                <span>Engineering Lane</span>
              </div>

              <div className="space-y-4 relative before:absolute before:left-1/2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border before:-translate-x-1/2">
                {/* R0 Submission */}
                <div className="flex items-center justify-between w-full">
                  <div className="w-[45%] p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                    <div className="font-bold text-foreground">R0 Submitted</div>
                    <div className="text-[11px] text-muted-foreground">Design team uploaded CAD + PDF sets</div>
                    <div className="text-[10px] font-mono text-primary">07 Oct 2026</div>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-background z-10" />
                  <div className="w-[45%]" />
                </div>

                {/* Review Return */}
                {selectedCell.currentStatus === "RETURNED" && (
                  <div className="flex items-center justify-between w-full">
                    <div className="w-[45%]" />
                    <span className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-background z-10" />
                    <div className="w-[45%] p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <div className="font-bold text-amber-600 dark:text-amber-400">Returned (Code C)</div>
                      <div className="text-[11px] text-muted-foreground">3 coordination comments logged</div>
                      <div className="text-[10px] font-mono text-muted-foreground">Review took 3 working days</div>
                    </div>
                  </div>
                )}

                {/* Approved */}
                {(selectedCell.currentStatus === "APPROVED" || selectedCell.currentStatus === "GFC") && (
                  <div className="flex items-center justify-between w-full">
                    <div className="w-[45%]" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-background z-10" />
                    <div className="w-[45%] p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">Approved (Code A)</div>
                      <div className="text-[11px] text-muted-foreground">All structural comments closed</div>
                      <div className="text-[10px] font-mono text-muted-foreground">Review took 2 working days</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => handleOpenMarkupStudio(selectedCell)}
                disabled={isLoadingDrawingDetail}
              >
                <PenTool className="w-4 h-4 mr-1.5 text-theme-btn-primary" />
                {isLoadingDrawingDetail ? "Loading Studio..." : "Canvas Markup Studio"}
              </AppButton>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onOpenReviewModal) onOpenReviewModal(selectedCell.drawingId);
                }}
              >
                <Eye className="w-4 h-4 mr-1.5" /> Stage-Gate Modal
              </AppButton>
              {selectedCell.currentStatus === "RETURNED" && (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (onOpenUploadModal) onOpenUploadModal(selectedCell.drawingId);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Resubmit Revision
                </AppButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-Browser PDF Vector Markup Studio */}
      {markupDrawing && (
        <DrawingMarkupViewer
          isOpen={isMarkupViewerOpen}
          onClose={() => setIsMarkupViewerOpen(false)}
          drawing={markupDrawing}
          revisions={markupRevisions}
          initialComments={markupComments}
          onDecisionCommitted={() => {
            // refresh or close drawer
            setSelectedCell(null);
          }}
        />
      )}
    </div>
  );
};

