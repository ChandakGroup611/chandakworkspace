"use client";

import React, { useMemo } from "react";
import { Users, ArrowUpRight } from "lucide-react";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { BaseWidget } from "./BaseWidget";

interface PerformanceWidgetProps {
  metrics?: any[];
}

export function PerformanceWidget({ metrics = [] }: PerformanceWidgetProps) {
  
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
      
      const statusStr = String(m.status).toLowerCase();
      if (statusStr.includes('resolv') || statusStr.includes('done')) {
        userMap[m.user].closed += 1;
        userMap[m.user].pts += 3;
      } else {
        userMap[m.user].active += 1;
      }
    });

    return Object.values(userMap)
      .sort((a, b) => b.closed - a.closed) // Sort by closed items
      .slice(0, 5);
  }, [metrics]);

  const getRole = (i: number) => {
    return "Team Member";
  };

  const getAvgDays = (i: number) => {
    return "2.4d";
  };

  return (
    <BaseWidget
      id="team-performance"
      title="Team Performance"
      icon={<Users className="w-5 h-5" />}
      className="h-[400px]"
      noPadding
      headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors flex items-center gap-1">Full Report <ArrowUpRight className="w-3 h-3" /></span>}
    >
      <div className="w-full overflow-auto h-full custom-scrollbar">
        <AppTable className="border-b-0">
          <AppTableHeader className="sticky top-0 z-10 bg-surface/90 backdrop-blur-md shadow-sm">
            <AppTableRow className="border-b border-border/50">
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent">Member</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent text-center w-24">Closed</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent text-center w-24">Story Pts</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent w-48">Progress</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent text-right w-24">Avg Velocity</AppTableHead>
            </AppTableRow>
          </AppTableHeader>
          <AppTableBody>
            {teamStats.map((u: any, i: number) => {
              const progress = u.closed + u.active > 0 ? Math.round((u.closed / (u.closed + u.active)) * 100) : 0;
              const colors = ['bg-emerald-500/20 text-emerald-500 border-emerald-500/30', 'bg-blue-500/20 text-blue-500 border-blue-500/30', 'bg-purple-500/20 text-purple-500 border-purple-500/30', 'bg-amber-500/20 text-amber-500 border-amber-500/30', 'bg-rose-500/20 text-rose-500 border-rose-500/30'];
              const fillColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
              
              const colorCls = colors[i % colors.length];
              const fillCls = fillColors[i % fillColors.length];

              return (
                <AppTableRow key={i} className="hover:bg-surface-hover/50 transition-colors border-b border-border/40 last:border-0 group cursor-default">
                  <AppTableCell>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold border shadow-sm group-hover:scale-110 transition-transform ${colorCls}`}>
                        {u.initials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{u.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{getRole(i)}</div>
                      </div>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="text-center font-bold text-lg text-foreground/80 group-hover:text-foreground transition-colors">
                    {u.closed}
                  </AppTableCell>
                  <AppTableCell className="text-center font-bold text-lg text-primary/80 group-hover:text-primary transition-colors">
                    {u.pts}
                  </AppTableCell>
                  <AppTableCell>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">
                      <span>Sprint Goal</span><span className="font-bold text-foreground">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-hover border border-border/50 rounded-full overflow-hidden">
                      <div className={`h-full ${fillCls} transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="text-right font-mono text-xs text-muted-foreground font-semibold">
                    {getAvgDays(i)}
                  </AppTableCell>
                </AppTableRow>
              );
            })}
            {teamStats.length === 0 && (
              <AppTableRow>
                <AppTableCell colSpan={5} className="text-center py-12 text-muted-foreground border-0">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-sm">No team performance data</span>
                  </div>
                </AppTableCell>
              </AppTableRow>
            )}
          </AppTableBody>
        </AppTable>
      </div>
    </BaseWidget>
  );
}
