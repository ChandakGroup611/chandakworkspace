"use client";

import React from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { ShieldAlert, Clock, ArrowRight } from "lucide-react";

export default function EscalationMonitor({ activities = [] }: { activities?: any[] }) {
  const escalations = React.useMemo(() => {
    return activities
      .filter(act => act.status === "escalated" || act.impact === "Critical")
      .map(act => ({
         id: act.id,
         title: act.title,
         level: act.status === "escalated" ? "SLA Breach" : "Critical",
         timeRemaining: "Live Event",
         risk: act.status === "escalated" ? "danger" : "warning"
      }))
      .slice(0, 5); // Max 5 items to fit nicely
  }, [activities]);

  return (
    <AppCard className="flex flex-col h-full border-rose-500/10 bg-gradient-to-b from-rose-950/10 via-white/[0.01] to-transparent">
      <AppCardHeader className="flex flex-row items-center justify-between pb-2 border-rose-500/10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
          <AppCardTitle className="text-rose-200">SLA Breach Governance</AppCardTitle>
        </div>
        <AppBadge variant="danger">Escalated</AppBadge>
      </AppCardHeader>

      <AppCardContent className="space-y-3 pt-2">
        <p className="text-[0.8rem] text-gray-400 font-medium">
          Automated event listener routing active operational bottlenecks before target timeout expiration.
        </p>

        <div className="space-y-2">
          {escalations.length > 0 ? escalations.map((esc) => (
            <div 
              key={esc.id} 
              className="p-3 rounded-xl bg-surface/[0.02] border border-white/5 hover:border-white/10 flex items-center justify-between transition-colors duration-200"
            >
              <div className="space-y-1 truncate pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-accent">{esc.id}</span>
                  <span className={`text-[0.7rem] font-bold px-1.5 py-0.2 rounded uppercase ${
                    esc.risk === "danger" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {esc.level}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-200 truncate">{esc.title}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/5 px-2 py-1 rounded-lg border border-rose-500/10">
                  <Clock className="h-3 w-3" />
                  <span>{esc.timeRemaining}</span>
                </div>
                <div className="p-1 rounded-lg bg-surface/5 text-gray-400 hover:text-white hover:bg-surface/10 cursor-pointer transition-colors">
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          )) : (
            <div className="p-4 text-center text-xs text-gray-500 rounded-xl bg-surface/[0.01] border border-white/5">
              No active escalations or critical SLA breaches detected.
            </div>
          )}
        </div>

        <div className="pt-1 flex items-center justify-between text-xs text-gray-500">
          <span>Worker dispatch status: <strong className="text-emerald-500 font-bold">ONLINE</strong></span>
          <span className="underline hover:text-gray-300 cursor-pointer">SLA Escalation Matrix</span>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

