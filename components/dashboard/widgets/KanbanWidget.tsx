"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ArrowUpRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

interface KanbanWidgetProps {
  metrics?: any[];
  onOpenList?: () => void;
}

export function KanbanWidget({ metrics = [], onOpenList }: KanbanWidgetProps) {
  const router = useRouter();
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
    const isReq = m.module === 'Requirements';
    
    let href = '#';
    if (isTask || m.module === 'Sub Tasks') href = `/tasks/${m.id}`;
    if (isBug) href = `/tickets/${m.id}`;
    if (isReq) href = `/requirements/${m.id}`;
    
    const tagBg = isBug ? 'bg-danger-soft text-danger-text border-danger-border' : isTask ? 'bg-accent-soft text-accent-soft-text border-border-active' : 'bg-accent-soft text-accent-soft-text border-border-active';
    const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
    const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';

    return (
      <Link 
        key={m.id} 
        href={href}
        className={`block p-3 rounded-lg border bg-surface/60 hover:bg-surface transition-all cursor-pointer shadow-xs min-w-0 overflow-hidden ${isProgress ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5' : 'border-border hover:border-border'}`}
        style={{ textDecoration: 'none' }}
      >
        <div className="text-xs font-semibold text-foreground line-clamp-2 leading-snug mb-2 break-words overflow-hidden" title={m.title}>
          {m.title || `${m.module} Assignment`}
        </div>
        
        <div className="flex items-center justify-between gap-1.5 mt-auto pt-1 min-w-0">
          <span className="text-[11px] font-mono text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/40 truncate max-w-[90px]">
            {m.code || `TF-${shortId}`}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${tagBg}`}>
              {m.module.substring(0,4)}
            </span>
            <div className="w-5 h-5 rounded-full bg-surface-hover border border-border flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0" title={m.user}>
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
      </Link>
    );
  };

  const totalActive = board.backlog.length + board.inProgress.length + board.inReview.length;

  return (
    <BaseWidget
      id="kanban"
      title="Active sprint"
      subtitle="Sprint Kanban board & flow stages"
      icon={<LayoutDashboard className="w-5 h-5 text-accent-soft-text" />}
      badge={
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-soft-text border border-border-active shrink-0">
          {totalActive} Active items
        </span>
      }
      className="min-h-[480px] h-[500px]"
      collapsible={true}
      headerRight={
        <div className="flex items-center gap-3">
          <span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors flex items-center gap-1" onClick={onOpenList || (() => router.push('/workspaces/tasks'))}>
            Full board <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      }
    >
      <div className="flex gap-3 h-full overflow-x-auto custom-scrollbar pb-2 w-full min-w-0">
        {/* Backlog */}
        <div className="w-[240px] sm:w-[260px] min-w-[240px] sm:min-w-[260px] shrink-0 flex flex-col h-full bg-surface/40 rounded-lg p-2.5 border border-border">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-semibold text-muted-foreground">Backlog</h4>
            <span className="bg-surface text-muted-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border/40">{board.backlog.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.backlog.map(m => renderCard(m, false))}
            {board.backlog.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-border rounded-lg">No items</div>}
          </div>
        </div>

        {/* In Progress */}
        <div className="w-[240px] sm:w-[260px] min-w-[240px] sm:min-w-[260px] shrink-0 flex flex-col h-full bg-primary/5 rounded-lg p-2.5 border border-primary/20">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-semibold text-primary">In progress</h4>
            <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full border border-primary/20">{board.inProgress.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.inProgress.map(m => renderCard(m, true))}
            {board.inProgress.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-border rounded-lg">No items</div>}
          </div>
        </div>

        {/* In Review */}
        <div className="w-[240px] sm:w-[260px] min-w-[240px] sm:min-w-[260px] shrink-0 flex flex-col h-full bg-warning-soft rounded-lg p-2.5 border border-warning-border">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-semibold text-warning-text dark:text-warning-text">In review</h4>
            <span className="bg-warning-soft text-warning-text dark:text-warning-text text-[11px] font-semibold px-2 py-0.5 rounded-full border border-warning-border">{board.inReview.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.inReview.map(m => renderCard(m, false))}
            {board.inReview.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-border rounded-lg">No items</div>}
          </div>
        </div>

        {/* Done */}
        <div className="w-[240px] sm:w-[260px] min-w-[240px] sm:min-w-[260px] shrink-0 flex flex-col h-full bg-success-soft rounded-lg p-2.5 border border-success-border opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[11px] font-semibold text-success-text dark:text-success-text">Done</h4>
            <span className="bg-success-soft text-success-text dark:text-success-text text-[11px] font-semibold px-2 py-0.5 rounded-full border border-success-border">{board.done.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {board.done.map(m => renderCard(m, false))}
            {board.done.length === 0 && <div className="text-xs text-center text-muted-foreground py-8 border border-border rounded-lg">No items</div>}
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
