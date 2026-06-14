"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppCard } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { AppButton } from "@/components/ui/AppButton";
import { ListChecks } from "lucide-react";

interface RecentTicketsTableProps {
  metrics?: any[];
}

export default function RecentTicketsTable({ metrics = [] }: RecentTicketsTableProps) {
  const router = useRouter();
  
  const recentItems = useMemo(() => {
    return metrics.filter(m => m.id && m.module !== 'Workspaces').slice(0, 10);
  }, [metrics]);

  const renderStatus = (s: string) => {
    if (s === "Resolved") return <span className="status-badge s-done">Done</span>;
    if (s === "Escalated") return <span className="status-badge s-blocked">Blocked</span>;
    if (s === "Review") return <span className="status-badge s-review">In Review</span>;
    return <span className="status-badge s-progress">In Progress</span>;
  };

  const renderPriority = (p: string) => {
    if (p.includes("Critical") || p.includes("P1")) return <><span className="priority-dot p-critical"></span>Critical</>;
    if (p.includes("High") || p.includes("P2")) return <><span className="priority-dot p-high"></span>High</>;
    if (p.includes("Medium")) return <><span className="priority-dot p-medium"></span>Medium</>;
    return <><span className="priority-dot p-low"></span>Low</>;
  };

  return (
    <AppCard className="overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-500" />
          <span className="text-sm font-bold text-foreground">Recent Tickets</span>
        </div>
        <AppButton variant="ghost" size="sm" onClick={() => router.push('/tickets')}>
          View All ↗
        </AppButton>
      </div>
      <div className="p-0">
      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Ticket</AppTableHead>
            <AppTableHead>Type</AppTableHead>
            <AppTableHead>Priority</AppTableHead>
            <AppTableHead>Status</AppTableHead>
            <AppTableHead>Assignee</AppTableHead>
            <AppTableHead>Due Date</AppTableHead>
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {recentItems.length > 0 ? (
            recentItems.map((m, i) => {
              const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
              const isBug = m.module === 'Tickets';
              const isTask = m.module === 'Tasks';
              const tagClass = isBug ? 'type-tag t-bug' : isTask ? 'type-tag t-task' : 'type-tag t-feat';
              
              const isOverdue = m.isOverdue;
              const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';
              const avatarClass = `mini-avatar a${(i % 5) + 1}`;

              const handleRowClick = () => {
                if (m.module === 'Tickets') router.push(`/tickets?ticket=${m.id}`);
                else if (m.module === 'Tasks' || m.module === 'Sub Tasks') router.push(`/workspaces?task=${m.id}`);
                else if (m.module === 'Sub Workspaces') router.push(`/workspaces?subWorkspace=${m.id}`);
                else router.push(`/${m.module.toLowerCase()}`);
              };

              return (
                <AppTableRow key={i} onClick={handleRowClick} className="cursor-pointer">
                  <AppTableCell>
                    <div className="font-mono text-[0.7rem] font-bold text-gray-500 dark:text-gray-400 uppercase">{m.code || `TF-${shortId}`}</div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={m.title}>{m.title || `${m.module} Assignment`}</div>
                  </AppTableCell>
                  <AppTableCell><span className={tagClass}>{m.module.substring(0,4).toLowerCase()}</span></AppTableCell>
                  <AppTableCell>{renderPriority(m.priority || "")}</AppTableCell>
                  <AppTableCell>{renderStatus(m.status)}</AppTableCell>
                  <AppTableCell><div className={avatarClass} title={m.user}>{initials}</div></AppTableCell>
                  <AppTableCell>
                    {m.dueDate ? (
                      <div className={`due-date ${isOverdue ? 'due-overdue' : ''}`}>
                        {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    ) : (
                      <div className="due-date text-gray-400">N/A</div>
                    )}
                  </AppTableCell>
                </AppTableRow>
              );
            })
          ) : (
            <AppTableRow>
              <AppTableCell colSpan={6} className="text-center py-8 text-gray-500">
                No recent tickets found
              </AppTableCell>
            </AppTableRow>
          )}
        </AppTableBody>
      </AppTable>
      </div>
    </AppCard>
  );
}
