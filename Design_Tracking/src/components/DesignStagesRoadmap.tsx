"use client";

import React, { useState, useMemo } from "react";
import { EY_DESIGN_STAGES, DesignStageItem } from "../data/eyTenderData";
import { CheckCircle2, ChevronRight, Layers, Target, FileText, ArrowRight } from "lucide-react";

export const DesignStagesRoadmap: React.FC = () => {
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

  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Stages Horizontal Progression Ribbon */}
      <div className="p-3 rounded-2xl border border-border bg-surface shadow-xs overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {groupedStages.map(([stageName, items], idx) => {
            const isSelected = activeStageIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStageIndex(idx)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 min-w-[200px] ${
                  isSelected
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary shadow-xs"
                    : "border-border bg-surface text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800 text-foreground"
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <div className="font-bold text-xs leading-snug line-clamp-1">{stageName}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{items.length} deliverables</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Stage Details */}
      {groupedStages[activeStageIndex] && (
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Stage {activeStageIndex + 1} Milestone Gate
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {groupedStages[activeStageIndex][0]}
                </h3>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {groupedStages[activeStageIndex][1].length} Deliverables Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {groupedStages[activeStageIndex][1].map((del, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{del.consultant || "Multi-Disciplinary"}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                    #{i + 1}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  {del.deliverable}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
