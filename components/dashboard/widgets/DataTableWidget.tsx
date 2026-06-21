"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { BaseWidget } from "./BaseWidget";

interface DataTableWidgetProps {
  metrics?: any[];
}

export function DataTableWidget({ metrics = [] }: DataTableWidgetProps) {
  const router = useRouter();
  
  const recentItems = useMemo(() => {
    return metrics.filter(m => m.id && m.module !== 'Workspaces').slice(0, 10);
  }, [metrics]);

  const renderStatus = (s: string) => {
    const statusStr = String(s || "").toLowerCase();
    if (statusStr.includes("resolv") || statusStr.includes("done")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Done</span>;
    if (statusStr.includes("escalat") || statusStr.includes("block")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">Blocked</span>;
    if (statusStr.includes("review")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20">Review</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20">Active</span>;
  };

  const renderPriority = (p: string) => {
    const priorityStr = String(p || "").toLowerCase();
    if (priorityStr.includes("critical") || priorityStr.includes("p1")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span><span className="text-xs text-foreground">Critical</span></div>;
    if (priorityStr.includes("high") || priorityStr.includes("p2")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-xs text-foreground">High</span></div>;
    if (priorityStr.includes("medium")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span><span className="text-xs text-foreground">Medium</span></div>;
    return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="text-xs text-foreground">Low</span></div>;
  };

  return (
    <BaseWidget
      id="recent-items"
      title="Recent Assignments"
      icon={<ListChecks className="w-5 h-5" />}
      className="h-[400px]"
      noPadding
      headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors" onClick={() => router.push('/tickets')}>View All</span>}
    >
      <div className="w-full overflow-auto h-full custom-scrollbar">
        <AppTable className="border-b-0">
          <AppTableHeader className="sticky top-0 z-10 bg-surface/90 backdrop-blur-md shadow-sm">
            <AppTableRow className="border-b border-border/50">
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent">ID / Title</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent w-24">Type</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent w-28">Priority</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent w-24">Status</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent w-20">Assignee</AppTableHead>
              <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground bg-transparent w-24">Due Date</AppTableHead>
            </AppTableRow>
          </AppTableHeader>
          <AppTableBody>
            {recentItems.length > 0 ? (
              recentItems.map((m, i) => {
                const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
                const isBug = m.module === 'Tickets';
                const isTask = m.module === 'Tasks';
                const tagBg = isBug ? 'bg-red-500/10 text-red-500 border-red-500/20' : isTask ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20';
                
                const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';

                const handleRowClick = () => {
                  if (m.module === 'Tickets') router.push(`/tickets?ticket=${m.id}`);
                  else if (m.module === 'Tasks' || m.module === 'Sub Tasks') router.push(`/workspaces?task=${m.id}`);
                  else if (m.module === 'Sub Workspaces') router.push(`/workspaces?subWorkspace=${m.id}`);
                  else router.push(`/${m.module.toLowerCase()}`);
                };

                return (
                  <AppTableRow key={i} onClick={handleRowClick} className="cursor-pointer hover:bg-surface-hover/50 transition-colors border-b border-border/40 last:border-0 group">
                    <AppTableCell>
                      <div className="font-mono text-[10px] font-bold text-muted-foreground uppercase mb-0.5">{m.code || `TF-${shortId}`}</div>
                      <div className="text-sm font-semibold text-foreground truncate max-w-[250px] group-hover:text-primary transition-colors" title={m.title}>{m.title || `${m.module} Assignment`}</div>
                    </AppTableCell>
                    <AppTableCell>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${tagBg}`}>
                        {m.module.substring(0,4)}
                      </span>
                    </AppTableCell>
                    <AppTableCell>{renderPriority(m.priority || "")}</AppTableCell>
                    <AppTableCell>{renderStatus(m.status)}</AppTableCell>
                    <AppTableCell>
                      <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-foreground" title={m.user}>
                        {initials}
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      {m.dueDate ? (
                        <div className={`text-xs font-semibold ${m.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/50 italic">N/A</div>
                      )}
                    </AppTableCell>
                  </AppTableRow>
                );
              })
            ) : (
              <AppTableRow>
                <AppTableCell colSpan={6} className="text-center py-12 text-muted-foreground border-0">
                  <div className="flex flex-col items-center justify-center">
                    <ListChecks className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-sm">No recent assignments found</span>
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
