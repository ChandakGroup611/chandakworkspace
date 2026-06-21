"use client";

import React, { useMemo } from "react";
import { LayoutDashboard, ArrowUpRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

interface KanbanWidgetProps {
  metrics?: any[];
}

export function KanbanWidget({ metrics = [] }: KanbanWidgetProps) {
  const board = useMemo(() => {
    const backlog: any[] = [];
    const inProgress: any[] = [];
    const inReview: any[] = [];
    const done: any[] = [];

    const validItems = metrics.filter(m => m.id && m.module !== 'Workspaces').slice(0, 40);

    validItems.forEach(m => {
      const s = String(m.rawStatus || m.status).toLowerCase();
      
      if (s.includes("resolve") || s.includes("complet") || s.includes("done") || s.includes("archiv")) {
        if (done.length < 8) done.push(m);
      } else if (s.includes("review") || s.includes("escalat") || s.includes("block") || s.includes("test")) {
        if (inReview.length < 8) inReview.push(m);
      } else if (s.includes("progress") || s.includes("doing") || s.includes("active")) {
        if (inProgress.length < 8) inProgress.push(m);
      } else {
        if (backlog.length < 8) backlog.push(m);
      }
    });

    return { backlog, inProgress, inReview, done };
  }, [metrics]);

  const renderCard = (m: any, isProgress: boolean) => {
    const isBug = m.module === 'Tickets';
    const isTask = m.module === 'Tasks';
    
    const tagBg = isBug ? 'bg-red-500/10 text-red-500 border-red-500/20' : isTask ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
    const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';

    return (
      <div 
        key={m.id} 
        className={`p-3 rounded-xl border bg-background/50 hover:bg-background/80 transition-colors cursor-pointer shadow-sm ${isProgress ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border/50 hover:border-border'}`}
      >
        <div className="text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-2" title={m.title}>{m.title || `${m.module} Assignment`}</div>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] font-mono text-muted-foreground bg-surface px-1.5 py-0.5 rounded border border-border/50">
            {m.code || `TF-${shortId}`}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${tagBg}`}>
              {m.module.substring(0,4)}
            </span>
            <div className="w-5 h-5 rounded-full bg-surface-hover border border-border flex items-center justify-center text-[9px] font-bold text-foreground" title={m.user}>
              {initials}
            </div>
          </div>
        </div>
        
        {isProgress && (
          <div className="mt-2.5">
            <div className="w-full h-1 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-2/3" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseWidget
      id="kanban"
      title="Active Sprint"
      icon={<LayoutDashboard className="w-5 h-5" />}
      className="h-[500px]"
      headerRight={
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            {board.backlog.length + board.inProgress.length + board.inReview.length} active items
          </span>
          <span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors flex items-center gap-1">
            Full Board <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-4 gap-4 h-full overflow-x-auto pb-2">
        {/* Backlog */}
        <div className="flex flex-col h-full bg-surface-hover/30 rounded-xl p-2 border border-border/30">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Backlog</h4>
            <span className="bg-surface text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-border/50">{board.backlog.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.backlog.map(m => renderCard(m, false))}
            {board.backlog.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-dashed border-border/50 rounded-xl">No items</div>}
          </div>
        </div>

        {/* In Progress */}
        <div className="flex flex-col h-full bg-primary/5 rounded-xl p-2 border border-primary/10">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">In Progress</h4>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{board.inProgress.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.inProgress.map(m => renderCard(m, true))}
            {board.inProgress.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-dashed border-border/50 rounded-xl">No items</div>}
          </div>
        </div>

        {/* In Review */}
        <div className="flex flex-col h-full bg-amber-500/5 rounded-xl p-2 border border-amber-500/10">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">In Review</h4>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{board.inReview.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.inReview.map(m => renderCard(m, false))}
            {board.inReview.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-dashed border-border/50 rounded-xl">No items</div>}
          </div>
        </div>

        {/* Done */}
        <div className="flex flex-col h-full bg-emerald-500/5 rounded-xl p-2 border border-emerald-500/10 opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Done</h4>
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{board.done.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.done.map(m => renderCard(m, false))}
            {board.done.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-dashed border-border/50 rounded-xl">No items</div>}
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
