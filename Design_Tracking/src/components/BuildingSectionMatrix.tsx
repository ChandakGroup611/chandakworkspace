"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { BuildingSectionCell, BuildingSectionMatrixResult, fetchDrawingDetailAction, fetchBuildingSectionMatrixAction } from "@/lib/actions/dmac-drawings";
import { DrawingMarkupViewer, DrawingCommentItem } from "./DrawingMarkupViewer";
import { DesignMasterStore } from "../services/designMasterStore";
import { formatDate } from "@/components/ui/data";

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

  // Dynamic Project & Tower Selection
  const projects = useMemo(() => DesignMasterStore.getUserAccessibleProjects(), []);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");

  const towers = useMemo(() => {
    if (!selectedProjectId) return [];
    return DesignMasterStore.getUserAccessibleTowers(undefined, selectedProjectId);
  }, [selectedProjectId]);
  const [selectedTowerId, setSelectedTowerId] = useState<string>("");

  useEffect(() => {
    if (towers.length > 0 && !towers.some(t => t.id === selectedTowerId)) {
      setSelectedTowerId(towers[0].id);
    }
  }, [towers, selectedTowerId]);

  // Live database data fetched from Supabase
  const [serverMatrixData, setServerMatrixData] = useState<BuildingSectionMatrixResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (selectedProjectId) {
      fetchBuildingSectionMatrixAction(selectedProjectId, selectedTowerId || undefined)
        .then(res => {
          if (isMounted && res.success && res.data && res.data.floors.length > 0) {
            setServerMatrixData(res.data);
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [selectedProjectId, selectedTowerId]);

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

  // Dynamic data resolution: Database -> Master Store -> Live Transaction Records
  const matrixData = useMemo<BuildingSectionMatrixResult>(() => {
    if (initialData && initialData.floors.length > 0) {
      return initialData;
    }
    if (serverMatrixData && serverMatrixData.floors.length > 0) {
      return serverMatrixData;
    }

    const state = DesignMasterStore.getState();
    const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];
    const currentTower = towers.find(t => t.id === selectedTowerId) || towers[0];

    // Real dynamic disciplines from Master Store
    const masterDisciplines = state.disciplines && state.disciplines.length > 0
      ? state.disciplines.map(d => ({ code: d.code, name: d.name }))
      : [
          { code: "ARCH", name: "Architectural" },
          { code: "STR", name: "Structural" },
          { code: "MEP", name: "MEP Services" },
          { code: "CIV", name: "Civil & RCC" },
          { code: "FACD", name: "Façade & Glazing" },
          { code: "FIRE", name: "Fire & Life Safety" }
        ];

    // Dynamic floors derived from tower floor count
    const totalFloors = Math.max(currentTower?.totalFloors || 10, 3);
    const floors: { id: string; code: string; name: string; floorOrder: number }[] = [
      { id: `fl-${currentTower?.id || "t"}-tr`, code: "TR", name: "Terrace", floorOrder: totalFloors + 2 }
    ];
    for (let f = totalFloors; f >= 1; f--) {
      const code = f < 10 ? `F0${f}` : `F${f}`;
      floors.push({
        id: `fl-${currentTower?.id || "t"}-${code.toLowerCase()}`,
        code,
        name: `Floor ${code.replace("F", "")}`,
        floorOrder: f + 1
      });
    }
    floors.push(
      { id: `fl-${currentTower?.id || "t"}-gf`, code: "GF", name: "Ground Floor", floorOrder: 1 },
      { id: `fl-${currentTower?.id || "t"}-b1`, code: "B1", name: "Basement 1", floorOrder: 0 }
    );

    // Filter real registered drawings for current project and tower
    const towerDrawings = (state.drawings || []).filter(d => {
      const dAny = d as any;
      const matchProj = !currentProject || 
        d.project === currentProject.name || 
        d.project === currentProject.id || 
        dAny.projectId === currentProject.id;
      const matchTower = !currentTower || 
        !dAny.towerName || 
        dAny.towerName === currentTower.towerName;
      return matchProj && matchTower;
    });

    const cells: BuildingSectionCell[] = [];
    floors.forEach((fl) => {
      masterDisciplines.forEach((dp) => {
        // Attempt to find actual uploaded drawing for this floor and discipline
        const matchedDrawing = towerDrawings.find(d => {
          const matchDisc = d.discipline?.toLowerCase().includes(dp.name.toLowerCase()) ||
                            dp.name?.toLowerCase().includes(d.discipline?.toLowerCase()) ||
                            d.discipline === dp.code;
          const matchFloor = (d.title || "").toLowerCase().includes(fl.name.toLowerCase()) ||
                             (d.code || "").toLowerCase().includes(fl.code.toLowerCase());
          return matchDisc && matchFloor;
        }) || towerDrawings.find(d => {
          return d.discipline?.toLowerCase().includes(dp.name.toLowerCase()) ||
                 dp.name?.toLowerCase().includes(d.discipline?.toLowerCase()) ||
                 d.discipline === dp.code;
        });

        if (matchedDrawing) {
          let status: BuildingSectionCell["currentStatus"] = "UNDER_REVIEW";
          let holder: BuildingSectionCell["currentHolder"] = "ENGINEERING";
          const rawStatus = String(matchedDrawing.status);
          if (rawStatus === "Approved (GFC)" || rawStatus === "Site Handed Over") {
            status = "GFC";
            holder = "NONE";
          } else if (rawStatus === "Approved") {
            status = "APPROVED";
            holder = "NONE";
          } else if (rawStatus === "Revision Requested") {
            status = "RETURNED";
            holder = "DESIGN";
          } else if (rawStatus === "Pending") {
            status = "NOT_SUBMITTED";
            holder = "DESIGN";
          }

          const revNum = matchedDrawing.revision ? parseInt(matchedDrawing.revision.replace(/\D/g, "") || "0", 10) : 0;
          const submittedTime = matchedDrawing.submittedDate ? new Date(matchedDrawing.submittedDate).getTime() : Date.now();
          const daysElapsed = Math.max(0, Math.floor((Date.now() - submittedTime) / (1000 * 60 * 60 * 24)));
          const isOverdue = holder === "ENGINEERING" ? daysElapsed > 5 : holder === "DESIGN" ? daysElapsed > 7 : false;

          cells.push({
            drawingId: matchedDrawing.id,
            drawingNumber: matchedDrawing.code,
            title: matchedDrawing.title,
            disciplineCode: dp.code,
            departmentName: dp.name,
            floorId: fl.id,
            floorCode: fl.code,
            floorName: fl.name,
            floorOrder: fl.floorOrder,
            currentStatus: status,
            currentHolder: holder,
            latestRevNo: revNum,
            displayRev: matchedDrawing.revision || `R${revNum}`,
            daysInCurrentState: daysElapsed,
            isOverdue
          });
        } else {
          // Dynamic placeholder cell for planned drawing register
          const towerCode = currentTower?.subProjectCode || "TWR";
          cells.push({
            drawingId: `cell-${currentTower?.id || "t"}-${fl.code}-${dp.code}`,
            drawingNumber: `${towerCode}-${dp.code}-${fl.code}-01`,
            title: `${dp.name} Layout, ${fl.name}`,
            disciplineCode: dp.code,
            departmentName: dp.name,
            floorId: fl.id,
            floorCode: fl.code,
            floorName: fl.name,
            floorOrder: fl.floorOrder,
            currentStatus: "NOT_SUBMITTED",
            currentHolder: "DESIGN",
            latestRevNo: null,
            displayRev: "–",
            daysInCurrentState: 0,
            isOverdue: false
          });
        }
      });
    });

    const approvedCount = cells.filter(c => c.currentStatus === "APPROVED" || c.currentStatus === "GFC").length;
    const underReview = cells.filter(c => c.currentStatus === "UNDER_REVIEW");
    const returned = cells.filter(c => c.currentStatus === "RETURNED");

    return {
      floors,
      disciplines: masterDisciplines,
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
        avgRoundsToApproval: approvedCount > 0 ? 1.5 : 0
      }
    };
  }, [initialData, serverMatrixData, selectedProjectId, selectedTowerId, projects, towers]);

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
          bg: "bg-info-soft text-info-text border-info-border",
          label: "With Engg",
          fullLabel: "Under Review"
        };
      case "RETURNED":
        return {
          bg: "bg-warning-soft text-warning-text border-warning-border",
          label: "With Design",
          fullLabel: "Returned for Revision"
        };
      case "APPROVED":
        return {
          bg: "bg-success-soft text-success-text border-success-border",
          label: "Approved",
          fullLabel: "Approved (Code A/B)"
        };
      case "GFC":
        return {
          bg: "bg-success text-white",
          label: "GFC",
          fullLabel: "Issued for Construction"
        };
      default:
        return {
          bg: "bg-sunken text-muted-foreground border-border",
          label: "Not sent",
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
          <div className="flex items-center gap-2 text-xs font-mono text-primary font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            DMAC · {projects.find(p => p.id === selectedProjectId)?.name || "Live Project"} · {towers.find(t => t.id === selectedTowerId)?.towerName || "All Wings"}
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading mt-1">
            Building section heat matrix
          </h2>
          <p className="text-sm text-muted-foreground">
            Floor × Discipline operational grid, 2-sided SLA queues & real-time revision tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Project Selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-border bg-surface text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Dynamic Tower / Wing Selector */}
          {towers.length > 0 && (
            <select
              value={selectedTowerId}
              onChange={(e) => setSelectedTowerId(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-border bg-surface text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {towers.map(t => (
                <option key={t.id} value={t.id}>{t.towerName}</option>
              ))}
            </select>
          )}

          <button type="button"
            onClick={() => setActiveTab("DASHBOARD")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "DASHBOARD"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            Dashboard
          </button>
          <button type="button"
            onClick={() => setActiveTab("WORKFLOW_GUIDE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "WORKFLOW_GUIDE"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-surface text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            How it works
          </button>
        </div>
      </div>

      {activeTab === "DASHBOARD" ? (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button type="button"
              onClick={() => setActiveFilter(null)}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === null
                  ? "border-primary ring-1 ring-primary bg-surface shadow-sm"
                  : "border-border bg-surface hover:border-border"
              }`}
            >
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {matrixData.summary.totalDrawings}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Drawings in register</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">All disciplines</div>
            </button>

            <button type="button"
              onClick={() => setActiveFilter(activeFilter === "UNDER_REVIEW" ? null : "UNDER_REVIEW")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "UNDER_REVIEW"
                  ? "border-info-border ring-1 ring-info-border bg-info-soft"
                  : "border-border bg-surface hover:border-info-border"
              }`}
            >
              <div className="text-2xl font-semibold tabular-nums text-info-text">
                {matrixData.summary.underReview}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">With engineering</div>
              <div className="text-[11px] font-mono font-semibold text-danger-text mt-1">
                {matrixData.summary.underReviewOverdue > 0
                  ? `${matrixData.summary.underReviewOverdue} overdue (>5d)`
                  : "On Target"}
              </div>
            </button>

            <button type="button"
              onClick={() => setActiveFilter(activeFilter === "RETURNED" ? null : "RETURNED")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "RETURNED"
                  ? "border-warning-border ring-1 ring-warning-border bg-warning-soft"
                  : "border-border bg-surface hover:border-warning-border"
              }`}
            >
              <div className="text-2xl font-semibold tabular-nums text-warning-text">
                {matrixData.summary.returnedForRevision}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">With design (revision)</div>
              <div className="text-[11px] font-mono font-semibold text-danger-text mt-1">
                {matrixData.summary.returnedOverdue > 0
                  ? `${matrixData.summary.returnedOverdue} overdue (>7d)`
                  : "On Target"}
              </div>
            </button>

            <button type="button"
              onClick={() => setActiveFilter(activeFilter === "APPROVED" ? null : "APPROVED")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "APPROVED"
                  ? "border-success-border ring-1 ring-success-border bg-success-soft"
                  : "border-border bg-surface hover:border-success-border"
              }`}
            >
              <div className="text-2xl font-semibold tabular-nums text-success-text">
                {matrixData.summary.approved + matrixData.summary.gfc}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Approved ({Math.round(((matrixData.summary.approved + matrixData.summary.gfc) / (matrixData.summary.totalDrawings || 1)) * 100)}%)
              </div>
              <div className="text-[11px] font-mono text-success-text mt-1">
                {matrixData.summary.gfc} GFC released
              </div>
            </button>

            <button type="button"
              onClick={() => setActiveFilter(activeFilter === "NOT_SUBMITTED" ? null : "NOT_SUBMITTED")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                activeFilter === "NOT_SUBMITTED"
                  ? "border-muted-foreground ring-1 ring-muted-foreground bg-muted/20"
                  : "border-border bg-surface hover:border-muted-foreground/40"
              }`}
            >
              <div className="text-2xl font-semibold tabular-nums text-muted-foreground">
                {matrixData.summary.notSubmitted}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Not yet submitted</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">Planned register</div>
            </button>

            <div className="p-3.5 rounded-lg border border-border bg-surface">
              <div className="text-2xl font-semibold tabular-nums text-foreground">
                {matrixData.summary.avgRoundsToApproval}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Avg rounds to approval</div>
              <div className="text-[11px] font-mono text-success-text mt-1">
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
                    <AppCardTitle className="text-base font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Building grid: floor × discipline
                    </AppCardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Terrace to Basement section. Click any drawing cell to inspect full timeline & comment history.
                    </p>
                  </div>
                  {activeFilter && (
                    <button type="button"
                      onClick={() => setActiveFilter(null)}
                      className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear filter ({activeFilter})
                    </button>
                  )}
                </AppCardHeader>
                <AppCardContent className="p-4 overflow-x-auto">
                  <table className="w-full border-separate border-spacing-1.5 min-w-[620px]">
                    <thead>
                      <tr>
                        <th className="text-right pr-3 text-[11px] font-mono font-semibold text-muted-foreground w-24">
                          Floor
                        </th>
                        {matrixData.disciplines.map(d => (
                          <th key={d.code} className="text-center text-[11px] font-mono font-semibold text-muted-foreground pb-1">
                            {d.name}
                          </th>
                        ))}
                        <th className="text-center text-[11px] font-mono font-semibold text-muted-foreground w-28">
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
                            <th scope="row" className="text-right pr-3 text-xs font-mono font-semibold text-muted-foreground whitespace-nowrap">
                              {fl.name}
                            </th>
                            {matrixData.disciplines.map(dp => {
                              const cell = floorCells.find(c => c.disciplineCode === dp.code);
                              if (!cell) {
                                return (
                                  <td key={dp.code}>
                                    <div className="h-11 rounded border border-border bg-muted/10 flex items-center justify-center text-[11px] text-muted-foreground font-mono">
                                      –
                                    </div>
                                  </td>
                                );
                              }

                              const badge = getStatusBadge(cell.currentStatus);
                              const matches = isCellMatch(cell);

                              return (
                                <td key={dp.code}>
                                  <button type="button"
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
                                        className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-solid animate-pulse ring-2 ring-background"
                                      />
                                    )}
                                    <span className="text-[11px] font-mono font-semibold leading-tight">
                                      {cell.displayRev}
                                    </span>
                                    <span className="text-[11px] font-semibold leading-tight mt-0.5 truncate max-w-[80px]">
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
                                    className="h-full bg-success transition-all duration-300"
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
                    <span className="font-semibold text-foreground text-[11px] font-mono">Legend:</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-sunken border border-border" /> Not submitted
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-info-soft text-info-text border border-info-border" /> Under review
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-warning-soft text-warning-text border border-warning-border" /> Returned (Revision)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-success-soft text-success-text border border-success-border" /> Approved
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-success text-white" /> GFC released
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-danger-text">
                      <span className="w-2 h-2 rounded-full bg-danger-solid animate-pulse" /> Past SLA target
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
                  <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warning-text" />
                    Waiting longest (ball-in-court)
                  </AppCardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Engg SLA: 5 working days · design SLA: 7 working days
                  </p>
                </AppCardHeader>
                <AppCardContent className="p-2 space-y-1 max-h-[320px] overflow-y-auto">
                  {waitingLongestList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No pending items in queue.
                    </div>
                  ) : (
                    waitingLongestList.map(item => (
                      <button type="button"
                        key={item.drawingId}
                        onClick={() => setSelectedCell(item)}
                        className="w-full text-left p-2.5 rounded-md hover:bg-surface-hover transition-all flex items-center justify-between gap-3 border border-transparent hover:border-border"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-semibold text-foreground truncate">
                            {item.drawingNumber} · {item.displayRev}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.title}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-mono font-semibold tabular-nums ${
                              item.isOverdue ? "text-danger-text" : "text-foreground"
                            }`}
                          >
                            {item.daysInCurrentState}d
                          </div>
                          <div className="text-[11px] text-muted-foreground font-semibold">
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
                  <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Latest activity stream
                  </AppCardTitle>
                </AppCardHeader>
                <AppCardContent className="p-3 space-y-3 max-h-[300px] overflow-y-auto text-xs">
                  {DesignMasterStore.getState().auditLogs && DesignMasterStore.getState().auditLogs.length > 0 ? (
                    DesignMasterStore.getState().auditLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="flex gap-2.5">
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                          log.action?.includes("GFC") || log.newStatus === "Approved (GFC)"
                            ? "bg-success"
                            : log.action?.includes("REVISION") || log.newStatus === "Revision Requested"
                            ? "bg-warning"
                            : "bg-info"
                        }`} />
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {log.entityName || log.entryKey || "Drawing Review"} · {log.action || log.newStatus}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {log.changedBy || "System User"} · {log.timestamp ? formatDate(log.timestamp) : "Just now"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-xs py-4 text-center">
                      No operational logs recorded yet.
                    </div>
                  )}
                </AppCardContent>
              </AppCard>
            </div>
          </div>
        </>
      ) : (
        /* How It Works Tab (BRD Architecture Guide) */
        <AppCard className="max-w-4xl mx-auto">
          <AppCardHeader className="border-b border-border">
            <AppCardTitle className="text-lg font-semibold">The drawing review & approval cycle</AppCardTitle>
            <p className="text-sm text-muted-foreground">
              Every drawing pass between Design and Engineering is recorded as a numbered revision with complete comment resolution traceability.
            </p>
          </AppCardHeader>
          <AppCardContent className="p-6 space-y-6 text-sm leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[11px] font-mono font-semibold text-primary block mb-1">Step 1 · design</span>
                <div className="font-semibold text-foreground">Submit R0</div>
                <p className="text-xs text-muted-foreground mt-1">Upload floor drawings with drawing number & CAD/PDF sets.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[11px] font-mono font-semibold text-info-text block mb-1">Step 2 · engg</span>
                <div className="font-semibold text-foreground">Review & markup</div>
                <p className="text-xs text-muted-foreground mt-1">Engineer marks up PDF canvas with numbered issues.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[11px] font-mono font-semibold text-warning-text block mb-1">Step 3 · decision</span>
                <div className="font-semibold text-foreground">Code A/B/C/D</div>
                <p className="text-xs text-muted-foreground mt-1">Code c/d returns drawing to design for revision.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <span className="text-[11px] font-mono font-semibold text-primary block mb-1">Step 4 · design</span>
                <div className="font-semibold text-foreground">Resolve & resubmit</div>
                <p className="text-xs text-muted-foreground mt-1">Design answers all open comments & submits R1.</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-success-soft">
                <span className="text-[11px] font-mono font-semibold text-success-text block mb-1">Step 5 · site</span>
                <div className="font-semibold text-foreground">GFC release</div>
                <p className="text-xs text-muted-foreground mt-1">Official IFC stamp & site QR verification token issued.</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-warning-soft border-l-4 border-warning-border text-xs text-warning-text">
              <strong>Mandatory comment clearance gate:</strong> Design cannot resubmit a revised drawing until every single open reviewer comment has been answered and verified.
            </div>
          </AppCardContent>
        </AppCard>
      )}

      {/* Dual-Lane Slide-Over Detail Drawer */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[var(--overlay)] animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-surface border-l border-border h-full overflow-y-auto p-6 shadow-lg space-y-5">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="text-xs font-mono font-semibold text-primary">
                  {selectedCell.departmentName} · {selectedCell.floorName}
                </div>
                <h2 className="text-xl font-semibold text-foreground mt-1">
                  {selectedCell.drawingNumber}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedCell.title}</p>
              </div>
              <button aria-label="Close" type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Revision</div>
                <div className="text-base font-semibold text-foreground mt-0.5">{selectedCell.displayRev}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Ball-in-Court</div>
                <div className="text-xs font-semibold text-foreground mt-1">
                  {selectedCell.currentHolder === "ENGINEERING" ? "Engineering" : "Design Team"}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground">Days elapsed</div>
                <div
                  className={`text-base font-semibold tabular-nums mt-0.5 ${
                    selectedCell.isOverdue ? "text-danger-text" : "text-foreground"
                  }`}
                >
                  {selectedCell.daysInCurrentState}d
                </div>
              </div>
            </div>

            {/* Dual-Lane Split Timeline */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-muted-foreground border-b border-border pb-2 mb-4">
                <span>Design lane</span>
                <span>Engineering lane</span>
              </div>

              <div className="space-y-4 relative before:absolute before:left-1/2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border before:-translate-x-1/2">
                {/* R0 Submission */}
                <div className="flex items-center justify-between w-full">
                  <div className="w-[45%] p-3 rounded-lg bg-info-soft border border-info-border text-xs space-y-1">
                    <div className="font-semibold text-foreground">R0 submitted</div>
                    <div className="text-[11px] text-muted-foreground">Design team uploaded CAD + PDF sets</div>
                    <div className="text-[11px] font-mono text-primary">07 Oct 2026</div>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-info ring-4 ring-background z-10" />
                  <div className="w-[45%]" />
                </div>

                {/* Review Return */}
                {selectedCell.currentStatus === "RETURNED" && (
                  <div className="flex items-center justify-between w-full">
                    <div className="w-[45%]" />
                    <span className="w-3 h-3 rounded-full bg-warning ring-4 ring-background z-10" />
                    <div className="w-[45%] p-3 rounded-lg bg-warning-soft border border-warning-border text-xs space-y-1">
                      <div className="font-semibold text-warning-text">Returned (Code C)</div>
                      <div className="text-[11px] text-muted-foreground">3 coordination comments logged</div>
                      <div className="text-[11px] font-mono text-muted-foreground">Review took 3 working days</div>
                    </div>
                  </div>
                )}

                {/* Approved */}
                {(selectedCell.currentStatus === "APPROVED" || selectedCell.currentStatus === "GFC") && (
                  <div className="flex items-center justify-between w-full">
                    <div className="w-[45%]" />
                    <span className="w-3 h-3 rounded-full bg-success ring-4 ring-background z-10" />
                    <div className="w-[45%] p-3 rounded-lg bg-success-soft border border-success-border text-xs space-y-1">
                      <div className="font-semibold text-success-text">Approved (Code A)</div>
                      <div className="text-[11px] text-muted-foreground">All structural comments closed</div>
                      <div className="text-[11px] font-mono text-muted-foreground">Review took 2 working days</div>
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
                <PenTool className="w-4 h-4 mr-1.5 text-primary" />
                {isLoadingDrawingDetail ? "Loading Studio..." : "Canvas Markup Studio"}
              </AppButton>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onOpenReviewModal) onOpenReviewModal(selectedCell.drawingId);
                }}
              >
                <Eye className="w-4 h-4 mr-1.5" /> Stage-gate modal
              </AppButton>
              {selectedCell.currentStatus === "RETURNED" && (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (onOpenUploadModal) onOpenUploadModal(selectedCell.drawingId);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Resubmit revision
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

