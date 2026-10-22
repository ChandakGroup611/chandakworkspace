"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ListTodo, Layers, ArrowUpRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { AppButton } from "@/components/ui/AppButton";


interface WorkloadIntelligenceWidgetProps {
  analytics?: any;
  kpis?: any;
}

export function WorkloadIntelligenceWidget({ analytics, kpis: globalKpis }: WorkloadIntelligenceWidgetProps) {
  const router = useRouter();
  const kpis = globalKpis || analytics?.kpis || analytics || {};
  const workload = kpis.workload || { active_tickets: 0, active_tasks: 0, active_requirements: 0 };

  const totalWorkload = workload.active_tickets + workload.active_tasks + workload.active_requirements;

  return (
    <BaseWidget
      id="workload"
      title="Tactical workload"
      subtitle="Active assignments across tickets, tasks & reqs"
      icon={<Briefcase className="w-5 h-5 text-accent-soft-text" />}
      badge={
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-soft-text border border-border-active shrink-0">
          {totalWorkload} In progress
        </span>
      }
      collapsible={true}
      headerRight={<span className="text-[11px] font-semibold text-muted-foreground">Active assignments</span>}
    >
      <div className="space-y-5 mt-2">
        {/* Workload Bars */}
        <div className="space-y-2 group cursor-pointer">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
              <ListTodo className="w-4 h-4 text-accent-soft-text" /> Active tickets
            </span>
            <span className="font-semibold">{workload.active_tickets}</span>
          </div>
          <div className="w-full theme-input-structural h-2 rounded-full overflow-hidden p-0 flex items-center">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min(100, workload.active_tickets * 10)}%` }} 
            />
          </div>
        </div>

        <div className="space-y-2 group cursor-pointer">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
              <Layers className="w-4 h-4 text-accent-soft-text" /> Active tasks
            </span>
            <span className="font-semibold">{workload.active_tasks}</span>
          </div>
          <div className="w-full theme-input-structural h-2 rounded-full overflow-hidden p-0 flex items-center">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-1000 ease-out delay-100" 
              style={{ width: `${Math.min(100, workload.active_tasks * 10)}%` }} 
            />
          </div>
        </div>

        <div className="space-y-2 group cursor-pointer">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
              <Briefcase className="w-4 h-4 text-success-text" /> Active requirements
            </span>
            <span className="font-semibold">{workload.active_requirements}</span>
          </div>
          <div className="w-full theme-input-structural h-2 rounded-full overflow-hidden p-0 flex items-center">
            <div 
              className="bg-success h-full rounded-full transition-all duration-1000 ease-out delay-200" 
              style={{ width: `${Math.min(100, workload.active_requirements * 10)}%` }} 
            />
          </div>
        </div>
      </div>
      <AppButton 
        variant="primary" 
        className="w-full mt-6 flex items-center justify-center gap-2 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors py-2.5 bg-primary/5 hover:bg-primary/10 rounded-lg"
        onClick={() => router.push('/workspaces/tasks')}
      >
        View assignment queue <ArrowUpRight className="w-3 h-3" />
      </AppButton>
    </BaseWidget>
  );
}
