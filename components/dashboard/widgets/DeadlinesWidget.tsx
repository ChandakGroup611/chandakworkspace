"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Calendar, AlertCircle, Flame, ArrowUpRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { cn } from "@/lib/utils";

interface DeadlinesWidgetProps {
  metrics?: any[];
}

export function DeadlinesWidget({ metrics = [] }: DeadlinesWidgetProps) {
  const router = useRouter();
  
  const upcoming = useMemo(() => {
    return metrics
      .filter(m => m.dueDate && String(m.status) !== 'Resolved' && String(m.status) !== 'Done')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [metrics]);

  const getDaysDiff = (dueDate: string) => {
    const d1 = new Date();
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(dueDate);
    d2.setHours(0, 0, 0, 0);
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
  };

  const renderDaysLeft = (diff: number) => {
    if (diff < 0) return <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">Overdue</span>;
    if (diff === 0) return <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">Due Today</span>;
    if (diff === 1) return <span className="text-xs font-semibold text-foreground/80">Tomorrow</span>;
    return <span className="text-xs font-semibold text-muted-foreground">In {diff} days</span>;
  };

  const getIconData = (diff: number) => {
    if (diff < 0) return { icon: <Flame className="h-4 w-4 text-red-500" />, bg: "bg-red-500/10 border-red-500/20" };
    if (diff <= 2) return { icon: <AlertCircle className="h-4 w-4 text-amber-500" />, bg: "bg-amber-500/10 border-amber-500/20" };
    return { icon: <Calendar className="h-4 w-4 text-muted-foreground" />, bg: "bg-surface-hover border-border/50" };
  };

  return (
    <BaseWidget
      id="deadlines"
      title="Upcoming Deadlines"
      icon={<CalendarClock className="w-5 h-5" />}
      className="h-[400px]"
      headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors flex items-center gap-1">Calendar <ArrowUpRight className="w-3 h-3" /></span>}
    >
      <div className="space-y-3">
        {upcoming.map((m, i) => {
          const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
          const diff = getDaysDiff(m.dueDate);
          const { icon, bg } = getIconData(diff);
          
          const handleItemClick = () => {
            if (m.module === 'Tickets') router.push(`/tickets?ticket=${m.id}`);
            else if (m.module === 'Tasks' || m.module === 'Sub Tasks') router.push(`/workspaces?task=${m.id}`);
            else if (m.module === 'Sub Workspaces') router.push(`/workspaces?subWorkspace=${m.id}`);
            else router.push(`/${m.module.toLowerCase()}`);
          };

          return (
            <div 
              key={m.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                diff < 0 ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/20" : 
                diff === 0 ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20" : 
                "bg-surface-hover/30 hover:bg-surface-hover/80 border-transparent hover:border-border/50"
              )}
              onClick={handleItemClick}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg border shadow-sm group-hover:scale-105 transition-transform ${bg}`}>
                  {icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{m.module} Assignment ({m.priority})</div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">TF-{shortId} · {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                {renderDaysLeft(diff)}
              </div>
            </div>
          );
        })}
        {upcoming.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/50 rounded-xl">No upcoming deadlines</div>
        )}
      </div>
    </BaseWidget>
  );
}
