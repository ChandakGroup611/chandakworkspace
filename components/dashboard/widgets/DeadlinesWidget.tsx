"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Calendar, AlertCircle, Flame, ArrowUpRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { cn } from "@/lib/utils";

interface DeadlinesWidgetProps {
  metrics?: any[];
  onOpenList?: () => void;
}

export function DeadlinesWidget({ metrics = [], onOpenList }: DeadlinesWidgetProps) {
  const router = useRouter();
  
  const upcoming = useMemo(() => {
    return metrics
      .filter(m => {
        if (!m.dueDate || String(m.status) === 'Resolved' || String(m.status) === 'Done') return false;
        const diff = getDaysDiff(m.dueDate);
        return diff <= 3; // Show only if due in 3 days or less (including overdue)
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 8);
  }, [metrics]);

  const getDaysDiff = (dateStr: string) => {
    if (!dateStr) return 0;
    const d1 = new Date();
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(dateStr);
    d2.setHours(0, 0, 0, 0);
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
  };

  const getPendingDays = (startDate: string) => {
    if (!startDate) return null;
    const d1 = new Date(startDate);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date();
    d2.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };

  const renderDaysLeft = (diff: number) => {
    if (diff < 0) {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-danger/10 text-danger border border-red-500/20">Overdue</span>
          <span className="text-[10px] font-semibold text-danger">Overdue by {Math.abs(diff)} days</span>
        </div>
      );
    }
    if (diff === 0) {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-danger/10 text-danger border border-red-500/20">Due Today</span>
          <span className="text-[10px] font-semibold text-danger">Today should be close</span>
        </div>
      );
    }
    if (diff === 1) {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-amber-500/20">Due Tomorrow</span>
          <span className="text-[10px] font-semibold text-warning">This has to be complete</span>
        </div>
      );
    }
    if (diff === 2) {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-amber-500/20">Due in 2 Days</span>
          <span className="text-[10px] font-semibold text-warning">This has to be complete</span>
        </div>
      );
    }
    if (diff === 3) {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-amber-500/20">Due in 3 Days</span>
          <span className="text-[10px] font-semibold text-warning">In 3 days need to complete</span>
        </div>
      );
    }
    return <span className="text-xs font-semibold text-muted-foreground">In {diff} days</span>;
  };

  const getIconData = (diff: number) => {
    if (diff <= 0) return { icon: <Flame className="h-4 w-4 text-danger" />, bg: "bg-danger/10 border-red-500/20" };
    if (diff <= 3) return { icon: <AlertCircle className="h-4 w-4 text-warning" />, bg: "bg-warning/10 border-amber-500/20" };
    return { icon: <Calendar className="h-4 w-4 text-muted-foreground" />, bg: "bg-surface-hover border-border/50" };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <BaseWidget
      id="deadlines"
      title="Upcoming Deadlines"
      icon={<CalendarClock className="w-5 h-5" />}
      className="h-[400px]"
      headerRight={<span onClick={onOpenList} className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors flex items-center gap-1">Calendar <ArrowUpRight className="w-3 h-3" /></span>}
    >
      <div className="space-y-3">
        {upcoming.map((m, i) => {
          const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
          const diff = getDaysDiff(m.dueDate);
          const pendingDays = getPendingDays(m.startDate);
          const { icon, bg } = getIconData(diff);
          
          const handleItemClick = () => {
            if (m.module === 'Tickets') router.push(`/tickets/${m.id}`);
            else if (m.module === 'Tasks' || m.module === 'Sub Tasks') router.push(`/tasks/${m.id}`);
            else if (m.module === 'Sub Workspaces' || m.module === 'Workspaces') router.push(`/workspaces/tasks?workspaceId=${m.id}`);
            else if (m.module === 'Requirements') router.push(`/requirements/${m.id}`);
            else router.push(`/${m.module.toLowerCase()}`);
          };

          return (
            <div 
              key={m.id} 
              className={cn(
                "flex flex-col gap-2 p-3 rounded-xl border transition-all cursor-pointer group",
                diff <= 0 ? "bg-danger/5 hover:bg-danger/10 border-red-500/20" : 
                diff <= 3 ? "bg-warning/5 hover:bg-warning/10 border-amber-500/20" : 
                "bg-surface-hover/30 hover:bg-surface-hover/80 border-transparent hover:border-border/50"
              )}
              onClick={handleItemClick}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border shadow-sm group-hover:scale-105 transition-transform ${bg}`}>
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1" title={m.title || `${m.module} Assignment`}>
                      {m.title || `${m.module} Assignment`}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-primary/80">{m.code || `ID-${shortId}`}</span>
                      <span>·</span>
                      <span className="font-medium text-[9px] uppercase tracking-wider">{m.module}</span>
                      {m.priority && m.priority !== "N/A" && (
                        <>
                          <span>·</span>
                          <span className="font-medium">{m.priority}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  {renderDaysLeft(diff)}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  {m.startDate && (
                    <div className="flex items-center gap-1">
                      <span className="opacity-70">Start:</span>
                      <span className="font-medium text-foreground/80">{formatDate(m.startDate)}</span>
                    </div>
                  )}
                  {m.dueDate && (
                    <div className="flex items-center gap-1">
                      <span className="opacity-70">Due:</span>
                      <span className="font-medium text-foreground/80">{formatDate(m.dueDate)}</span>
                    </div>
                  )}
                </div>
                {pendingDays !== null && (
                  <div className="font-medium">
                    Pending: <span className="text-foreground/90">{pendingDays} day{pendingDays !== 1 ? 's' : ''}</span>
                  </div>
                )}
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
