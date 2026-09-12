"use client";

import React, { useState, useMemo } from "react";
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
  Activity
} from "lucide-react";
import { TenderDesignMatrix } from "../../Design_Tracking/src/components/TenderDesignMatrix";
import { LookAheadDashboard } from "../../Design_Tracking/src/components/LookAheadDashboard";
import { LiaisoningTracker } from "../../Design_Tracking/src/components/LiaisoningTracker";
import { DesignStagesRoadmap } from "../../Design_Tracking/src/components/DesignStagesRoadmap";
import { DrawingRegister } from "../../Design_Tracking/src/components/DrawingRegister";
import { GfcHandoverView } from "../../Design_Tracking/src/components/GfcHandoverView";
import { UploadDrawingModal } from "../../Design_Tracking/src/components/UploadDrawingModal";
import { ReviewApprovalModal } from "../../Design_Tracking/src/components/ReviewApprovalModal";
import { EyTenderService } from "../../Design_Tracking/src/services/eyTenderService";
import { mockDrawings, mockGfcReleases } from "../../Design_Tracking/src/mock/designMockData";
import { DrawingItem, DrawingStatus } from "../../Design_Tracking/src/types";
import { EY_PROJECT_COLUMNS, EY_UNIQUE_PROJECTS, EY_LOOK_AHEAD_ITEMS, EY_LIAISON_CONSULTANTS } from "../../Design_Tracking/src/data/eyTenderData";

type ActiveTabType = "MATRIX" | "LOOK_AHEAD" | "LIAISONING" | "STAGES" | "DRAWINGS" | "GFC_HANDOVER";

export default function DesignTrackingHost() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>("MATRIX");

  // Drawings & Modals state
  const [drawings, setDrawings] = useState<DrawingItem[]>(mockDrawings);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDrawingForReview, setSelectedDrawingForReview] = useState<DrawingItem | null>(null);

  // Overall KPIs from EyTenderService
  const projectKpis = useMemo(() => EyTenderService.getProjectKpis(), []);
  const totalReceived = useMemo(() => projectKpis.reduce((acc, p) => acc + p.receivedPackages, 0), [projectKpis]);
  const totalPackages = useMemo(() => projectKpis.reduce((acc, p) => acc + p.totalPackages, 0), [projectKpis]);
  const overallRate = totalPackages > 0 ? Math.round((totalReceived / totalPackages) * 100) : 0;

  const count30 = useMemo(() => EY_LOOK_AHEAD_ITEMS.filter(i => i.timeframe === "30_DAYS").length, []);
  const count60 = useMemo(() => EY_LOOK_AHEAD_ITEMS.filter(i => i.timeframe === "60_DAYS").length, []);

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
    <div className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner Executive Header */}
      <div className="relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-teal-950/40 border border-emerald-500/25 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-4.5 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shrink-0">
            <Compass className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Design & Engineering Tracking Suite
              </h1>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>EY Tender R2 Standard</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Chandak Group Master Development Portfolio • 11 Projects • 24 Wings • Tender Freeze & GFC Release Cockpit
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Drawing Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Projects */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs hover:border-blue-500/40 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Development Projects</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground">{EY_UNIQUE_PROJECTS.length}</span>
              <span className="text-xs text-muted-foreground font-semibold">Projects</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-500 font-bold">
              <span>{EY_PROJECT_COLUMNS.length} Tower Wings Tracked</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Drawings Delivery */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Tender Drawings Delivery</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-500 font-mono">{overallRate}%</span>
              <span className="text-xs text-muted-foreground font-semibold">Rate</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                  style={{ width: `${overallRate}%` }} 
                />
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{totalReceived}/{totalPackages}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Look-Ahead */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs hover:border-amber-500/40 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Look-Ahead Milestones</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">{EY_LOOK_AHEAD_ITEMS.length}</span>
              <span className="text-xs text-muted-foreground font-semibold">Total</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-rose-500">🚨 {count30} in 30d</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-bold text-amber-500">⏳ {count60} in 60d</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Statutory */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs hover:border-purple-500/40 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Statutory Authorities</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-purple-500 font-mono">{EY_LIAISON_CONSULTANTS.length}</span>
              <span className="text-xs text-muted-foreground font-semibold">Bodies</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-purple-500 font-bold">
              <span>BMC, CFO, Tree, RERA & MoEF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Module Segmented Tabs Navigation */}
      <div className="border-b border-border flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("MATRIX")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "MATRIX"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className={`h-4 w-4 ${activeTab === "MATRIX" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span>Tender Design Matrix</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground">
              65
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOOK_AHEAD")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "LOOK_AHEAD"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className={`h-4 w-4 ${activeTab === "LOOK_AHEAD" ? "text-amber-500" : "text-muted-foreground"}`} />
            <span>30/60d Look-Ahead</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-500 font-bold">
              {count30} Urg
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LIAISONING")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "LIAISONING"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className={`h-4 w-4 ${activeTab === "LIAISONING" ? "text-purple-500" : "text-muted-foreground"}`} />
            <span>Statutory Liaisoning</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-500 font-bold">
              25
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STAGES")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "STAGES"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className={`h-4 w-4 ${activeTab === "STAGES" ? "text-blue-500" : "text-muted-foreground"}`} />
            <span>5-Stage Roadmap</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground">
              5 Gates
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DRAWINGS")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "DRAWINGS"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className={`h-4 w-4 ${activeTab === "DRAWINGS" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span>Drawing Sheet Register</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-bold">
              {drawings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("GFC_HANDOVER")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "GFC_HANDOVER"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className={`h-4 w-4 ${activeTab === "GFC_HANDOVER" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span>GFC Site Handovers</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground">
              {mockGfcReleases.length} Releases
            </span>
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

      {/* Tab 6: GFC Handover View */}
      {activeTab === "GFC_HANDOVER" && (
        <GfcHandoverView releases={mockGfcReleases} />
      )}

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

