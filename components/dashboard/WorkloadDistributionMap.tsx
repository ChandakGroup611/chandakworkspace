"use client";

import React from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { Layers, Users, CheckCircle, AlertOctagon } from "lucide-react";

export default function WorkloadDistributionMap() {
  const departments = [
    { name: "ITSM Service Agents", active: 48, overdue: 3, capacity: 85, color: "from-blue-600 to-indigo-600" },
    { name: "Infrastructure Engineering", active: 24, overdue: 0, capacity: 42, color: "from-indigo-600 to-purple-600" },
    { name: "Database Operations", active: 64, overdue: 12, capacity: 94, color: "from-amber-600 to-rose-600" },
    { name: "Requirement Analysts", active: 18, overdue: 1, capacity: 30, color: "from-emerald-600 to-teal-600" },
  ];

  return (
    <AppCard className="flex flex-col h-full justify-between">
      <AppCardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-400" />
          <AppCardTitle>Workload Saturation Engine</AppCardTitle>
        </div>
        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 font-semibold uppercase">
          Live Pool
        </span>
      </AppCardHeader>

      <AppCardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-medium tracking-wide">Total Concurrency</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-white">154</span>
              <span className="text-[9px] text-gray-600 font-bold uppercase">tasks</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 flex flex-col justify-between">
            <span className="text-[10px] text-rose-500 font-medium tracking-wide">Backlog Overdue</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-rose-400">16</span>
              <span className="text-[9px] text-rose-600 font-bold uppercase">critical</span>
            </div>
          </div>
        </div>

        {/* Department Saturation Trackers */}
        <div className="space-y-3.5">
          {departments.map((dept) => (
            <div key={dept.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium truncate max-w-[140px]">{dept.name}</span>
                <div className="flex items-center gap-2 text-[11px]">
                  {dept.overdue > 0 && (
                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                      <AlertOctagon className="h-2.5 w-2.5" />
                      {dept.overdue}
                    </span>
                  )}
                  <span className="text-gray-400 font-bold">{dept.capacity}%</span>
                </div>
              </div>

              {/* Advanced track layout */}
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${dept.color} transition-all duration-500 shadow-sm`} 
                  style={{ width: `${dept.capacity}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </AppCardContent>
    </AppCard>
  );
}
