"use client";

import React, { useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { AppButton } from "@/components/ui/AppButton";
import { Users, ArrowRight } from "lucide-react";

interface TeamPerformanceProps {
  metrics?: any[];
}

export default function TeamPerformance({ metrics = [] }: TeamPerformanceProps) {
  
  const teamStats = useMemo(() => {
    const userMap: Record<string, any> = {};
    metrics.forEach(m => {
      if (!m.user || m.user === 'System') return;
      if (!userMap[m.user]) {
        userMap[m.user] = {
          name: m.user,
          initials: m.user.substring(0,2).toUpperCase(),
          closed: 0,
          pts: 0,
          active: 0,
        };
      }
      
      if (String(m.status) === 'Resolved' || String(m.status) === 'Done') {
        userMap[m.user].closed += 1;
        userMap[m.user].pts += 3;
      } else {
        userMap[m.user].active += 1;
      }
    });

    return Object.values(userMap).slice(0, 5);
  }, [metrics]);

  const getRole = (i: number) => {
    return "Team Member";
  };

  const getAvgDays = (i: number) => {
    return "-";
  };

  return (
    <AppCard className="mt-5">
      <div className="flex items-center justify-between p-4 border-b theme-card-structural">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold text-foreground">Team Performance · Sprint 24</span>
        </div>
        <AppButton variant="ghost" size="sm" className="h-6 text-xs gap-1">Full Report <ArrowRight className="h-3 w-3" /></AppButton>
      </div>
      <div className="p-0 bg-background overflow-x-auto">
        <AppTable>
          <AppTableHeader>
            <AppTableRow>
              <AppTableHead>Member</AppTableHead>
              <AppTableHead className="text-center">Closed</AppTableHead>
              <AppTableHead className="text-center">Story Pts</AppTableHead>
              <AppTableHead>Progress</AppTableHead>
              <AppTableHead className="text-right">Avg Days</AppTableHead>
            </AppTableRow>
          </AppTableHeader>
          <AppTableBody>
            {teamStats.map((u: any, i: number) => {
              const progress = u.closed + u.active > 0 ? Math.round((u.closed / (u.closed + u.active)) * 100) : 0;
              const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-accent', 'bg-accent'];
              const textColors = ['text-emerald-500', 'text-teal-500', 'text-amber-500', 'text-accent', 'text-accent'];
              const color = colors[i % colors.length];
              const textColor = textColors[i % textColors.length];

              return (
                <AppTableRow key={i}>
                  <AppTableCell>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold text-foreground ${color}`}>
                        {u.initials}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{u.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{getRole(i)}</div>
                      </div>
                    </div>
                  </AppTableCell>
                  <AppTableCell className={`text-center font-bold text-lg ${textColor}`}>
                    {u.closed}
                  </AppTableCell>
                  <AppTableCell className="text-center font-bold text-lg text-accent">
                    {u.pts}
                  </AppTableCell>
                  <AppTableCell>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1.5">
                      <span>Sprint goal</span><span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="text-right font-mono text-xs text-muted-foreground">
                    {getAvgDays(i)}d
                  </AppTableCell>
                </AppTableRow>
              );
            })}
          </AppTableBody>
        </AppTable>
      </div>
    </AppCard>
  );
}
