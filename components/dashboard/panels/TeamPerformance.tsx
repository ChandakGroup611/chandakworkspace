"use client";

import React, { useState, useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { AppButton } from "@/components/ui/AppButton";
import { Users, ArrowRight } from "lucide-react";
import { UserPerformanceWorkingSheetModal } from "../performance/UserPerformanceWorkingSheetModal";

interface TeamPerformanceProps {
  metrics?: any[];
}

export default function TeamPerformance({ metrics = [] }: TeamPerformanceProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  
  const teamStats = useMemo(() => {
    const userMap: Record<string, any> = {};
    metrics.forEach(m => {
      if (!m || !m.user || m.user === 'System' || m.user === 'Unassigned') return;
      const key = m.userId || m.user;
      if (!userMap[key]) {
        userMap[key] = {
          id: m.userId || null,
          name: m.user,
          initials: m.user.substring(0,2).toUpperCase(),
          role: m.userRole || "Team Member",
          closed: 0,
          pts: 0,
          active: 0,
          totalResolutionDays: 0
        };
      }
      
      const statusStr = String(m.status).toLowerCase();
      const isResolved = statusStr.includes('resolv') || statusStr.includes('done') || statusStr.includes('clos');

      if (isResolved) {
        userMap[key].closed += 1;
        
        // Dynamic Priority Points
        if (m.module === 'Sub Tasks') {
          userMap[key].pts += 1;
        } else {
          const p = String(m.priority || '').toLowerCase();
          if (p.includes('critical') || p.includes('high') || p.includes('urgent')) userMap[key].pts += 5;
          else if (p.includes('medium') || p.includes('standard')) userMap[key].pts += 3;
          else if (p.includes('low') || p.includes('minor')) userMap[key].pts += 1;
          else userMap[key].pts += 3; // Default
        }

        // Avg Days
        if (m.createdAt && m.updatedAt) {
          const diffMs = new Date(m.updatedAt).getTime() - new Date(m.createdAt).getTime();
          const diffDays = diffMs / (1000 * 3600 * 24);
          userMap[key].totalResolutionDays += Math.max(0, diffDays);
        }
      } else {
        userMap[key].active += 1;
      }
    });

    return Object.values(userMap)
      .sort((a, b) => b.closed - a.closed || b.pts - a.pts);
  }, [metrics]);

  const handleOpenUserSheet = (userObj: any) => {
    setSelectedUser(userObj.id || userObj.name);
    setIsSheetOpen(true);
  };

  const handleOpenTopPerformer = () => {
    if (teamStats.length > 0) {
      setSelectedUser(teamStats[0].id || teamStats[0].name);
    } else {
      setSelectedUser(null);
    }
    setIsSheetOpen(true);
  };

  const getRole = (u: any) => u.role;

  const getAvgDays = (u: any) => {
    if (u.closed === 0) return "-";
    const avg = u.totalResolutionDays / u.closed;
    return avg < 0.1 ? "<0.1d" : `${avg.toFixed(1)}d`;
  };

  return (
    <>
      <AppCard className="mt-5">
        <div className="flex items-center justify-between p-4 border-b theme-card-structural">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-theme-icon" />
            <span className="text-sm font-bold text-foreground">Team Performance · Live Working Metrics</span>
          </div>
          <AppButton 
            variant="ghost" 
            size="sm" 
            onClick={handleOpenTopPerformer}
            className="h-6 text-xs gap-1"
          >
            Full Working Sheet <ArrowRight className="h-3 w-3" />
          </AppButton>
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
                const colors = ['bg-success', 'bg-teal-500', 'bg-warning', 'bg-theme-btn-primary', 'bg-theme-btn-primary'];
                const textColors = ['text-success', 'text-teal-500', 'text-warning', 'text-theme-icon', 'text-theme-icon'];
                const color = colors[i % colors.length];
                const textColor = textColors[i % textColors.length];

                return (
                  <AppTableRow 
                    key={i}
                    onClick={() => handleOpenUserSheet(u)}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    title={`Click to view ${u.name}'s Performance Working Sheet`}
                  >
                    <AppTableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold text-foreground ${color}`}>
                          {u.initials}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground hover:text-primary transition-colors">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{getRole(u)}</div>
                        </div>
                      </div>
                    </AppTableCell>
                    <AppTableCell className={`text-center font-bold text-lg ${textColor}`}>
                      {u.closed}
                    </AppTableCell>
                    <AppTableCell className="text-center font-bold text-lg text-theme-icon">
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
                      {getAvgDays(u)}
                    </AppTableCell>
                  </AppTableRow>
                );
              })}
              {teamStats.length === 0 && (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No team performance records available
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </AppCard>

      {isSheetOpen && (
        <UserPerformanceWorkingSheetModal
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          userNameOrId={selectedUser}
        />
      )}
    </>
  );
}
