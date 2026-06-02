"use client";

import React, { useMemo } from "react";

import { useRouter } from "next/navigation";

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
    <div className="panel">
      <div className="panel-header">
        <i className="ti ti-list-details" style={{ fontSize: '16px', color: 'var(--accent)' }} aria-hidden="true"></i>
        <span className="panel-title">Recent Tickets</span>
        <span className="panel-action">View All ↗</span>
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ticket-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '16px' }}>Ticket</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th style={{ paddingRight: '16px' }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
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
                    <tr key={i} onClick={handleRowClick} style={{ cursor: 'pointer' }} className="hover:bg-white/[0.05] transition-colors">
                      <td style={{ paddingLeft: '16px' }}>
                        <div className="ticket-id">{m.code || `TF-${shortId}`}</div>
                        <div className="ticket-title" title={m.title}>{m.title || `${m.module} Assignment`}</div>
                      </td>
                      <td><span className={tagClass}>{m.module.substring(0,4).toLowerCase()}</span></td>
                      <td>{renderPriority(m.priority || "")}</td>
                      <td>{renderStatus(m.status)}</td>
                      <td><div className={avatarClass} title={m.user}>{initials}</div></td>
                      <td style={{ paddingRight: '16px' }}>
                        {m.dueDate ? (
                          <div className={`due-date ${isOverdue ? 'due-overdue' : ''}`}>
                            {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        ) : (
                          <div className="due-date">N/A</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)' }}>No recent tickets found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
