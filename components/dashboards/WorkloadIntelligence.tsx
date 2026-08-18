"use client";

import React from "react";
import { Briefcase, ListTodo, Layers, ArrowUpRight } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

export function WorkloadIntelligence({ workload }: { workload: any }) {
  return (
    <div className="p-6 rounded-2xl border bg-card text-card-foreground shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Tactical Workload</h3>
          <p className="text-xs text-muted-foreground mt-1">Your active assignments</p>
        </div>
        <div className="p-2 bg-theme-btn-primary/10 text-theme-icon rounded-lg">
          <Briefcase className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Workload Bars */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-2"><ListTodo className="w-4 h-4 text-theme-icon" /> Active Tickets</span>
            <span>{workload.active_tickets}</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-theme-btn-primary h-full rounded-full" style={{ width: `${Math.min(100, workload.active_tickets * 10)}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-theme-icon" /> Active Tasks</span>
            <span>{workload.active_tasks}</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-theme-btn-primary h-full rounded-full" style={{ width: `${Math.min(100, workload.active_tasks * 10)}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-success" /> Active Requirements</span>
            <span>{workload.active_requirements}</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-success h-full rounded-full" style={{ width: `${Math.min(100, workload.active_requirements * 10)}%` }} />
          </div>
        </div>
      </div>
      
      <AppButton 
        variant="secondary" 
        className="w-full mt-6 bg-theme-btn-primary/5 hover:opacity-90/10 text-theme-icon hover:text-theme-icon border-none rounded-xl"
        rightIcon={<ArrowUpRight className="w-3 h-3" />}
      >
        View Assignment Queue
      </AppButton>
    </div>
  );
}
