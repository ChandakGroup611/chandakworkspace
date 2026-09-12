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
  ArrowUpRight
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
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/50 to-slate-900/30 border border-emerald-500/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shrink-0">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Design & Tender Tracking Suite
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                EY Tender R2 Standard
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              11 Projects • 24 Towers • Multi-disciplinary Tender Packages, 30/60d Look-Ahead, and Statutory Liaisoning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Drawing Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Development Projects</span>
            <Building2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{EY_UNIQUE_PROJECTS.length} Projects</span>
            <span className="text-[11px] text-emerald-500 font-semibold">{EY_PROJECT_COLUMNS.length} Wings</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Drawings Delivery Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-500">{overallRate}%</span>
            <span className="text-[11px] text-muted-foreground">{totalReceived} of {totalPackages} received</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Look-Ahead Milestones</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-500">{EY_LOOK_AHEAD_ITEMS.length}</span>
            <span className="text-[11px] text-rose-500 font-semibold">30d / 60d urgent</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Statutory Authorities</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-500">{EY_LIAISON_CONSULTANTS.length}</span>
            <span className="text-[11px] text-muted-foreground">Compliance partners</span>
          </div>
        </div>
      </div>

      {/* Main Module Tabs Bar */}
      <div className="border-b border-border flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("MATRIX")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "MATRIX"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Tender Design Matrix (11 Projects)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOOK_AHEAD")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "LOOK_AHEAD"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>30/60d Look-Ahead ({EY_LOOK_AHEAD_ITEMS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LIAISONING")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "LIAISONING"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
            <span>Statutory Liaisoning ({EY_LIAISON_CONSULTANTS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STAGES")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "STAGES"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span>5-Stage Design Roadmap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DRAWINGS")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "DRAWINGS"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-emerald-500" />
            <span>Drawing Sheet Register</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("GFC_HANDOVER")}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "GFC_HANDOVER"
                ? "border-emerald-500 text-foreground font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>GFC Site Handovers</span>
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
