"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { ListChecks, Search } from "lucide-react";
import { AppInput } from "@/components/ui/AppInput";

interface MetricsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: any[];
}

export function MetricsListModal({ isOpen, onClose, metrics = [] }: MetricsListModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = metrics.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      String(m.title || "").toLowerCase().includes(term) ||
      String(m.code || "").toLowerCase().includes(term) ||
      String(m.module || "").toLowerCase().includes(term) ||
      String(m.user || "").toLowerCase().includes(term)
    );
  });

  const renderStatus = (s: string) => {
    const statusStr = String(s || "").toLowerCase();
    if (statusStr.includes("resolv") || statusStr.includes("done")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-success/10 text-success border border-emerald-500/20">Done</span>;
    if (statusStr.includes("escalat") || statusStr.includes("block")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-danger/10 text-danger border border-red-500/20">Blocked</span>;
    if (statusStr.includes("review")) 
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-warning/10 text-warning border border-amber-500/20">Review</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20">Active</span>;
  };

  const renderPriority = (p: string) => {
    const priorityStr = String(p || "").toLowerCase();
    if (priorityStr.includes("critical") || priorityStr.includes("p1")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span><span className="text-xs text-foreground">Critical</span></div>;
    if (priorityStr.includes("high") || priorityStr.includes("p2")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-xs text-foreground">High</span></div>;
    if (priorityStr.includes("medium")) 
      return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"></span><span className="text-xs text-foreground">Medium</span></div>;
    return <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="text-xs text-foreground">Low</span></div>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] h-[85vh] flex flex-col overflow-hidden bg-background">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              Unified Items List
            </DialogTitle>
            <DialogDescription className="mt-1">
              Combined view of all tasks, tickets, requirements, and workspaces in your scope.
            </DialogDescription>
          </div>
          <div className="w-72 mr-8">
            <AppInput
              placeholder="Search ID, title, user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-sm"
              leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto custom-scrollbar mt-4">
          <AppTable>
            <AppTableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              <AppTableRow className="border-b border-border/50">
                <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground w-1/4">ID / Title</AppTableHead>
                <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground w-32">Type</AppTableHead>
                <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground w-28">Priority</AppTableHead>
                <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground w-24">Status</AppTableHead>
                <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground w-32">Assignee</AppTableHead>
                <AppTableHead className="font-semibold text-xs tracking-wider uppercase text-muted-foreground w-32">Due Date</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map((m, i) => {
                  const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
                  const isBug = m.module === 'Tickets';
                  const isTask = m.module === 'Tasks' || m.module === 'Sub Tasks';
                  const isReq = m.module === 'Requirements';
                  const tagBg = isBug ? 'bg-danger/10 text-danger border-red-500/20' : isTask ? 'bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/20' : isReq ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                  
                  const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';

                  const handleRowClick = () => {
                    if (m.module === 'Tickets') window.location.href = `/tickets/${m.id}`;
                    else if (m.module === 'Tasks' || m.module === 'Sub Tasks') window.location.href = `/tasks/${m.id}`;
                    else if (m.module === 'Requirements') window.location.href = `/requirements/${m.id}`;
                    else if (m.module === 'Workspaces' || m.module === 'Sub Workspaces') window.location.href = `/workspaces/tasks?workspaceId=${m.id}`;
                    else window.location.href = `/${m.module.toLowerCase()}`;
                  };

                  return (
                    <AppTableRow key={`${m.id}-${i}`} onClick={handleRowClick} className="cursor-pointer hover:bg-surface-hover/50 transition-colors border-b border-border/40">
                      <AppTableCell>
                        <div className="font-mono text-[10px] font-bold text-muted-foreground uppercase mb-0.5">{m.code || `ID-${shortId}`}</div>
                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors" title={m.title}>{m.title || `${m.module} Assignment`}</div>
                      </AppTableCell>
                      <AppTableCell>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${tagBg}`}>
                          {m.module}
                        </span>
                      </AppTableCell>
                      <AppTableCell>{renderPriority(m.priority || "")}</AppTableCell>
                      <AppTableCell>{renderStatus(m.status)}</AppTableCell>
                      <AppTableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-surface border border-border/50 flex items-center justify-center text-[10px] font-bold text-foreground" title={m.user}>
                            {initials}
                          </div>
                          <span className="text-xs text-foreground/80 truncate max-w-[100px]">{m.user}</span>
                        </div>
                      </AppTableCell>
                      <AppTableCell>
                        {m.dueDate ? (
                          <div className={`text-xs font-semibold ${m.isOverdue ? 'text-danger' : 'text-muted-foreground'}`}>
                            {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
                  <AppTableCell colSpan={6} className="text-center py-20 text-muted-foreground border-0">
                    <div className="flex flex-col items-center justify-center">
                      <ListChecks className="w-12 h-12 mb-4 opacity-20" />
                      <span className="text-base font-semibold text-foreground/70">No items found</span>
                      <span className="text-sm mt-1">Try adjusting your search or filters</span>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </DialogContent>
    </Dialog>
  );
}
