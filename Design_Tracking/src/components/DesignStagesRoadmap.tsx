"use client";

import React, { useState, useMemo } from "react";
import { EY_DESIGN_STAGES, DesignStageItem } from "../data/eyTenderData";
import { 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  Target, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Circle,
  SlidersHorizontal,
  Sparkles,
  Check,
  X
} from "lucide-react";
import { DesignMultiSelectDropdown } from "./DesignMultiSelectDropdown";

export const DesignStagesRoadmap: React.FC = () => {
  // Deliverables completion tracker state (clean empty start)
  const [completedDeliverables, setCompletedDeliverables] = useState<Set<number>>(new Set());
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  // Group deliverables by stageName
  const groupedStages = useMemo(() => {
    const map = new Map<string, DesignStageItem[]>();
    for (const item of EY_DESIGN_STAGES) {
      const stage = item.stageName || "General Execution";
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(item);
    }
    return Array.from(map.entries());
  }, []);

  const STAGE_TARGETS = [
    { label: "Stage 1: Feasibility & Roadmap", targetPct: "0% - 10%", color: "from-blue-600 to-cyan-500", desc: "Topographical survey, statutory applicability, and site constraints" },
    { label: "Stage 2: Concept Design Freeze", targetPct: "20% - 30%", color: "from-indigo-600 to-blue-500", desc: "Massing studies, area statements, and environmental strategy" },
    { label: "Stage 3: Design Basis Freeze", targetPct: "30% - 40%", color: "from-purple-600 to-indigo-500", desc: "Soil investigation, Structural & MEP Design Basis Reports" },
    { label: "Stage 4: Schematic Design Freeze", targetPct: "40% - 60%", color: "from-violet-600 to-purple-500", desc: "RCC framing, shaft layouts, facade concepts, and lift sizing" },
    { label: "Stage 5: Detailed Design", targetPct: "60% - 80%", color: "from-amber-600 to-orange-500", desc: "Detailed structural, MEP, facade, and lighting schematics" },
    { label: "Stage 6: Tender Design & BOQ", targetPct: "80% - 100%", color: "from-rose-600 to-amber-500", desc: "Procurement packages, tender drawings, and BOQs" },
    { label: "Stage 7: Pre-Construction / GFC", targetPct: "100% GFC", color: "from-emerald-600 to-teal-500", desc: "Good For Construction drawings issued to site execution team" },
    { label: "Stage 8: Construction Support", targetPct: "Site QA/QC", color: "from-teal-600 to-emerald-500", desc: "TPQA audits, PMC monitoring, site supervisor certifications" }
  ];

  const currentStage = groupedStages[activeStageIndex];
  const currentDeliverables = currentStage ? currentStage[1] : [];

  // Consultants for filter
  const consultantFilterOptions = useMemo(() => {
    const set = new Set(currentDeliverables.map(d => d.consultant).filter(Boolean));
    return Array.from(set).map(c => ({
      value: c,
      label: c,
      count: currentDeliverables.filter(d => d.consultant === c).length
    }));
  }, [currentDeliverables]);

  const filteredDeliverables = useMemo(() => {
    if (selectedConsultants.length === 0) return currentDeliverables;
    return currentDeliverables.filter(d => selectedConsultants.includes(d.consultant));
  }, [currentDeliverables, selectedConsultants]);

  const toggleDeliverable = (itemIdx: number) => {
    setCompletedDeliverables(prev => {
      const next = new Set(prev);
      if (next.has(itemIdx)) next.delete(itemIdx);
      else next.add(itemIdx);
      return next;
    });
  };

  // Stage progress calculation
  const completedCount = currentDeliverables.filter((_, i) => completedDeliverables.has(i)).length;
  const stageProgressPct = currentDeliverables.length > 0 
    ? Math.round((completedCount / currentDeliverables.length) * 100) 
    : 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Design Stages Roadmap
            </h2>
          </div>
        </div>
      </div>

      {/* Stages Progression Stepper Bar */}
      {groupedStages.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-3">
          <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Design Stage Deliverables Configured</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Design stages are dynamically populated as deliverables are added to your project.
          </p>
        </div>
      ) : (
        <div className="p-3 sm:p-4 rounded-2xl border border-border bg-surface shadow-xs overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2.5 min-w-max">
            {groupedStages.map(([stageName, items], idx) => {
              const isSelected = activeStageIndex === idx;
              const targetInfo = STAGE_TARGETS[idx] || { targetPct: "100%", color: "from-emerald-600 to-teal-500" };
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveStageIndex(idx);
                    setSelectedConsultants([]);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 min-w-[220px] shrink-0 whitespace-nowrap ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/50 shadow-xs"
                      : "border-border bg-surface text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected 
                      ? "bg-emerald-600 text-white" 
                      : "bg-slate-100 dark:bg-slate-800 text-foreground"
                  }`}>
                    0{idx + 1}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-xs leading-snug truncate text-foreground whitespace-nowrap">
                      {stageName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground whitespace-nowrap">
                      <span>{items.length} items</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {targetInfo.targetPct}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Stage Details & Interactive Deliverables Checklist */}
      {currentStage && (
        <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-5">
          {/* Stage Banner Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Stage 0{activeStageIndex + 1} Gateway
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 border border-border text-muted-foreground">
                    Target {STAGE_TARGETS[activeStageIndex]?.targetPct}
                  </span>
                </div>
                <h3 className="text-lg font-black text-foreground tracking-tight mt-0.5">
                  {currentStage[0]}
                </h3>
              </div>
            </div>

            {/* Stage Progress Bar & Counter */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
              <div className="text-right">
                <div className="text-xs font-bold text-foreground">
                  {completedCount} of {currentDeliverables.length} Deliverables Completed
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Milestone Gate Readiness
                </div>
              </div>

              <div className="relative h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center font-mono font-black text-xs text-emerald-500 shadow-inner">
                {stageProgressPct}%
              </div>
            </div>
          </div>

          {/* Unified Consultant / Discipline Multi-Select Filter Ribbon */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <DesignMultiSelectDropdown
                label="Discipline / Consultant"
                options={consultantFilterOptions}
                selectedValues={selectedConsultants}
                onChange={setSelectedConsultants}
                colorTheme="emerald"
                placeholder="All Deliverables"
              />

              {selectedConsultants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedConsultants([])}
                  className="h-8 px-2.5 rounded-xl border border-dashed border-rose-500/40 hover:border-rose-500/70 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="text-[11px] font-semibold text-muted-foreground">
              Showing <span className="font-bold text-foreground">{filteredDeliverables.length}</span> of {currentDeliverables.length} items
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {selectedConsultants.length > 0 && (
            <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Active:</span>

              {selectedConsultants.map(c => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedConsultants(selectedConsultants.filter(x => x !== c))}
                    className="hover:text-emerald-900 dark:hover:text-emerald-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={() => setSelectedConsultants([])}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground ml-1 underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Deliverables Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDeliverables.map((del, i) => {
              const isChecked = completedDeliverables.has(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleDeliverable(i)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 group select-none ${
                    isChecked
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-2xs"
                      : "border-border bg-slate-50/50 dark:bg-slate-900/40 hover:border-emerald-500/30"
                  }`}
                >
                  <div className={`mt-0.5 h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                      : "border-border bg-surface text-transparent group-hover:border-emerald-500"
                  }`}>
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.2 rounded-md bg-slate-200/60 dark:bg-slate-800/80 text-foreground font-mono">
                        {del.consultant || "Multi-Disciplinary"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Deliverable #{i + 1}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed transition-all ${
                      isChecked ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {del.deliverable}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

