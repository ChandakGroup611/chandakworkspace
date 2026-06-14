"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { CalendarClock, Calendar, AlertCircle, Flame } from "lucide-react";

interface UpcomingDeadlinesProps {
  metrics?: any[];
}

export default function UpcomingDeadlines({ metrics = [] }: UpcomingDeadlinesProps) {
  const router = useRouter();
  
  const upcoming = useMemo(() => {
    return metrics
      .filter(m => m.dueDate && String(m.status) !== 'Resolved' && String(m.status) !== 'Done')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);
  }, [metrics]);

  const renderDaysLeft = (dueDate: string) => {
    const d1 = new Date();
    const d2 = new Date(dueDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    
    if (diff < 0) return <AppBadge variant="danger" className="text-[10px] uppercase font-bold py-0 h-5 border-rose-500/30 text-rose-500">Overdue</AppBadge>;
    if (diff === 0) return <AppBadge variant="warning" className="text-[10px] uppercase font-bold py-0 h-5 border-amber-500/30 text-amber-500">Due Today</AppBadge>;
    if (diff === 1) return <span className="text-xs font-medium text-muted-foreground">Tomorrow</span>;
    return <span className="text-xs font-medium text-muted-foreground">In {diff} days</span>;
  };

  const getIconData = (dueDate: string) => {
    const d1 = new Date();
    const d2 = new Date(dueDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    if (diff < 0) return { icon: <Flame className="h-4 w-4 text-rose-500" /> };
    if (diff <= 2) return { icon: <AlertCircle className="h-4 w-4 text-amber-500" /> };
    return { icon: <Calendar className="h-4 w-4 text-muted-foreground" /> };
  };

  return (
    <AppCard>
      <div className="flex items-center gap-2 p-4 border-b border-border bg-surface">
        <CalendarClock className="h-4 w-4 text-rose-500" />
        <span className="text-sm font-bold text-foreground">Upcoming Deadlines</span>
      </div>
      <div className="p-4 bg-background">
        <div className="space-y-3">
          {upcoming.map(m => {
            const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
            const { icon } = getIconData(m.dueDate);
            
            const handleItemClick = () => {
              if (m.module === 'Tickets') router.push(`/tickets?ticket=${m.id}`);
              else if (m.module === 'Tasks' || m.module === 'Sub Tasks') router.push(`/workspaces?task=${m.id}`);
              else if (m.module === 'Sub Workspaces') router.push(`/workspaces?subWorkspace=${m.id}`);
              else router.push(`/${m.module.toLowerCase()}`);
            };

            return (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer group" onClick={handleItemClick}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-surface group-hover:bg-background transition-colors">{icon}</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{m.module} Assignment ({m.priority})</div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">TF-{shortId} · Platform v3</div>
                  </div>
                </div>
                <div>{renderDaysLeft(m.dueDate)}</div>
              </div>
            );
          })}
          {upcoming.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">No upcoming deadlines.</div>
          )}
        </div>
      </div>
    </AppCard>
  );
}
