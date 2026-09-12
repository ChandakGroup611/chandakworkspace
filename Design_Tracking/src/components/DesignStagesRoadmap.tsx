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
  Check
} from "lucide-react";

export const DesignStagesRoadmap: React.FC = () => {
  // Deliverables completion tracker state
  const [completedDeliverables, setCompletedDeliverables] = useState<Set<number>>(new Set([0, 1, 2, 5, 8, 12, 18]));
  const [selectedConsultant, setSelectedConsultant] = useState<string>("ALL");
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
    { label: "Stage 1: Feasibility & Massing", targetPct: "0% - 10%", color: "from-blue-600 to-cyan-500" },
    { label: "Stage 2: Concept Freeze", targetPct: "20% - 30%", color: "from-indigo-600 to-blue-500" },
    { label: "Stage 3: Design Basis Report (DBR)", targetPct: "30% - 40%", color: "from-purple-600 to-indigo-500" },
    { label: "Stage 4: Tender Design & BOQ", targetPct: "60% - 70%", color: "from-amber-600 to-orange-500" },
    { label: "Stage 5: Good For Construction (GFC)", targetPct: "100% GFC", color: "from-emerald-600 to-teal-500" }
  ];

  const currentStage = groupedStages[activeStageIndex];
  const currentDeliverables = currentStage ? currentStage[1] : [];

  // Consultants for filter
  const stageConsultants = useMemo(() => {
    const set = new Set(currentDeliverables.map(d => d.consultant).filter(Boolean));
    return Array.from(set);
  }, [currentDeliverables]);

  const filteredDeliverables = useMemo(() => {
    if (selectedConsultant === "ALL") return currentDeliverables;
    return currentDeliverables.filter(d => d.consultant === selectedConsultant);
  }, [currentDeliverables, selectedConsultant]);

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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Stages Progression Stepper Bar */}
      <div className="p-3 sm:p-4 rounded-2xl border border-border bg-surface shadow-xs overflow-x-auto">
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
                  setSelectedConsultant("ALL");
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 min-w-[220px] ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/50 shadow-xs"
                    : "border-border bg-surface text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                  isSelected 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-100 dark:bg-slate-800 text-foreground"
                }`}>
                  0{idx + 1}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold text-xs leading-snug line-clamp-1 text-foreground">
                    {stageName}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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

      {/* Active Stage Details & Interactive Deliverables Checklist */}
      {currentStage && (
        <div className="p-5 sm:p-7 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          {/* Stage Banner Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30 shadow-inner shrink-0">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    Stage 0{activeStageIndex + 1} Gate Milestone
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 border border-border text-muted-foreground">
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

          {/* Consultant Filter Ribbon */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" />
              <span>Filter Discipline:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedConsultant("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedConsultant === "ALL"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              }`}
            >
              All Deliverables ({currentDeliverables.length})
            </button>
            {stageConsultants.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedConsultant(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedConsultant === c
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

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

