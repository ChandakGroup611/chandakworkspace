"use client";

import React, { useMemo } from "react";

import { useRouter } from "next/navigation";

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
    
    if (diff < 0) return <div className="deadline-when urgent">Overdue</div>;
    if (diff === 0) return <div className="deadline-when urgent">Due Today</div>;
    if (diff === 1) return <div className="deadline-when">Tomorrow</div>;
    return <div className="deadline-when">In {diff} days</div>;
  };

  const getIconColor = (dueDate: string) => {
    const d1 = new Date();
    const d2 = new Date(dueDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    if (diff < 0) return { color: 'var(--red)', icon: 'ti-flame' };
    if (diff <= 2) return { color: 'var(--amber)', icon: 'ti-alert-circle' };
    return { color: 'var(--text3)', icon: 'ti-calendar' };
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <i className="ti ti-calendar-due" style={{ fontSize: '16px', color: 'var(--red)' }} aria-hidden="true"></i>
        <span className="panel-title">Upcoming Deadlines</span>
      </div>
      <div className="panel-body">
        <div className="deadline-list">
          {upcoming.map(m => {
            const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
            const { color, icon } = getIconColor(m.dueDate);
            
            const handleItemClick = () => {
              if (m.module === 'Tickets') router.push(`/tickets?ticket=${m.id}`);
              else if (m.module === 'Tasks' || m.module === 'Sub Tasks') router.push(`/workspaces?task=${m.id}`);
              else if (m.module === 'Sub Workspaces') router.push(`/workspaces?subWorkspace=${m.id}`);
              else router.push(`/${m.module.toLowerCase()}`);
            };

            return (
              <div key={m.id} className="deadline-item hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={handleItemClick}>
                <div className="deadline-icon" style={{ color }}><i className={`ti ${icon}`} aria-hidden="true"></i></div>
                <div className="deadline-info">
                  <div className="deadline-name">{m.module} Assignment ({m.priority})</div>
                  <div className="deadline-proj">TF-{shortId} · Platform v3</div>
                </div>
                {renderDaysLeft(m.dueDate)}
              </div>
            );
          })}
          {upcoming.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', padding: '10px' }}>No upcoming deadlines.</div>
          )}
        </div>
      </div>
    </div>
  );
}
