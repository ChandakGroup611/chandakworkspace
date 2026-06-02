"use client";

import React, { useMemo } from "react";

interface SprintKanbanBoardProps {
  metrics?: any[];
}

export default function SprintKanbanBoard({ metrics = [] }: SprintKanbanBoardProps) {
  
  const board = useMemo(() => {
    const backlog: any[] = [];
    const inProgress: any[] = [];
    const inReview: any[] = [];
    const done: any[] = [];

    const validItems = metrics.filter(m => m.id && m.module !== 'Workspaces').slice(0, 40);

    validItems.forEach(m => {
      // Use rawStatus to get a more accurate idea of where it belongs
      const s = String(m.rawStatus || m.status).toLowerCase();
      
      if (s.includes("resolve") || s.includes("complet") || s.includes("done") || s.includes("archiv")) {
        if (done.length < 8) done.push(m);
      } else if (s.includes("review") || s.includes("escalat") || s.includes("block") || s.includes("test")) {
        if (inReview.length < 8) inReview.push(m);
      } else if (s.includes("progress") || s.includes("doing") || s.includes("active")) {
        if (inProgress.length < 8) inProgress.push(m);
      } else {
        // "New", "Open", "To Do", "Backlog", or anything unrecognized goes to Backlog
        if (backlog.length < 8) backlog.push(m);
      }
    });

    return { backlog, inProgress, inReview, done };
  }, [metrics]);

  const renderCard = (m: any, isProgress: boolean) => {
    const isBug = m.module === 'Tickets';
    const isTask = m.module === 'Tasks';
    
    const tagClass = isBug ? 'type-tag t-bug' : isTask ? 'type-tag t-task' : 'type-tag t-feat';
    const shortId = m.id ? String(m.id).substring(0, 7).toUpperCase() : 'UNKNOWN';
    const initials = m.user ? m.user.substring(0,2).toUpperCase() : 'UN';

    // Cycle avatars based on length
    const avatarClass = `mini-avatar a${((m.id?.length || 0) % 5) + 1}`;

    return (
      <div key={m.id} className="sprint-card" style={isProgress ? { borderColor: 'rgba(110,123,255,0.25)' } : {}}>
        <div className="sprint-card-title" title={m.title}>{m.title || `${m.module} Assignment`}</div>
        <div className="sprint-card-meta">
          <span className="sprint-card-id">{m.code || `TF-${shortId}`}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className={tagClass}>{m.module.substring(0,4).toLowerCase()}</span>
            <div className={avatarClass} title={m.user}>{initials}</div>
          </div>
        </div>
        {isProgress && (
          <>
            <div style={{ marginTop: '8px' }}>
              <div className="prog-bar-wrap">
                <div className="prog-bar" style={{ width: '100%', background: 'var(--accent)' }}></div>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: '4px' }}>In Progress</div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="panel" style={{ marginBottom: '20px' }}>
      <div className="panel-header">
        <i className="ti ti-layout-kanban" style={{ fontSize: '16px', color: 'var(--teal)' }} aria-hidden="true"></i>
        <span className="panel-title">Kanban Board · Active Sprint</span>
        <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{board.backlog.length + board.inProgress.length + board.inReview.length} active items</span>
        <span className="panel-action" style={{ marginLeft: '12px' }}>Full Board ↗</span>
      </div>
      <div className="panel-body">
        <div className="sprint-cols">

          <div className="sprint-col">
            <div className="sprint-col-header">
              <span className="sprint-col-name">Backlog / Open</span>
              <span className="sprint-count">{board.backlog.length}</span>
            </div>
            {board.backlog.map(m => renderCard(m, false))}
          </div>

          <div className="sprint-col">
            <div className="sprint-col-header">
              <span className="sprint-col-name" style={{ color: 'var(--accent)' }}>In Progress</span>
              <span className="sprint-count">{board.inProgress.length}</span>
            </div>
            {board.inProgress.map(m => renderCard(m, true))}
          </div>

          <div className="sprint-col">
            <div className="sprint-col-header">
              <span className="sprint-col-name" style={{ color: 'var(--amber)' }}>In Review</span>
              <span className="sprint-count">{board.inReview.length}</span>
            </div>
            {board.inReview.map(m => renderCard(m, false))}
          </div>

          <div className="sprint-col">
            <div className="sprint-col-header">
              <span className="sprint-col-name" style={{ color: 'var(--green)' }}>Done</span>
              <span className="sprint-count">{board.done.length}</span>
            </div>
            <div>
              {board.done.map(m => renderCard(m, false))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
