"use client";

import React from "react";
import { Briefcase, ListTodo, Layers, ArrowUpRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

interface WorkloadIntelligenceWidgetProps {
  analytics?: any;
  kpis?: any;
}

export function WorkloadIntelligenceWidget({ analytics, kpis: globalKpis }: WorkloadIntelligenceWidgetProps) {
  const kpis = globalKpis || analytics?.kpis || analytics || {};
  const workload = kpis.workload || { active_tickets: 0, active_tasks: 0, active_requirements: 0 };

  return (
    <BaseWidget
      id="workload"
      title="Tactical Workload"
      icon={<Briefcase className="w-5 h-5" />}
      headerRight={<span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Active Assignments</span>}
    >
      <div className="space-y-5 mt-2">
        {/* Workload Bars */}
        <div className="space-y-2 group cursor-pointer">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
              <ListTodo className="w-4 h-4 text-blue-500" /> Active Tickets
            </span>
            <span className="font-bold">{workload.active_tickets}</span>
          </div>
          <div className="w-full bg-surface-hover h-2 rounded-full overflow-hidden border border-border/50">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min(100, workload.active_tickets * 10)}%` }} 
            />
          </div>
        </div>

        <div className="space-y-2 group cursor-pointer">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
              <Layers className="w-4 h-4 text-purple-500" /> Active Tasks
            </span>
            <span className="font-bold">{workload.active_tasks}</span>
          </div>
          <div className="w-full bg-surface-hover h-2 rounded-full overflow-hidden border border-border/50">
            <div 
              className="bg-purple-500 h-full rounded-full transition-all duration-1000 ease-out delay-100" 
              style={{ width: `${Math.min(100, workload.active_tasks * 10)}%` }} 
            />
          </div>
        </div>

        <div className="space-y-2 group cursor-pointer">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
              <Briefcase className="w-4 h-4 text-emerald-500" /> Active Requirements
            </span>
            <span className="font-bold">{workload.active_requirements}</span>
          </div>
          <div className="w-full bg-surface-hover h-2 rounded-full overflow-hidden border border-border/50">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out delay-200" 
              style={{ width: `${Math.min(100, workload.active_requirements * 10)}%` }} 
            />
          </div>
        </div>
      </div>
      
      <button className="w-full mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors py-2.5 bg-primary/5 hover:bg-primary/10 rounded-xl">
        View Assignment Queue <ArrowUpRight className="w-3 h-3" />
      </button>
    </BaseWidget>
  );
}
