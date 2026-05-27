"use client";

import React, { useMemo } from "react";

interface ActivityFeedProps {
  metrics?: any[];
}

export default function ActivityFeed({ metrics = [] }: ActivityFeedProps) {
  
  const activities = useMemo(() => {
    // Generate some simulated activity from the latest metrics
    const sorted = [...metrics]
      .filter(m => m.id && m.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return sorted.map((m, i) => {
      const isBlocked = String(m.status).toLowerCase() === 'escalated';
      const isDone = String(m.status).toLowerCase() === 'resolved';
      const isReview = String(m.status).toLowerCase() === 'review';

      if (isDone) {
        return {
          id: m.id,
          type: 'closed',
          user: m.user || 'System',
          action: `closed ${m.module.substring(0,4)}`,
          target: `TF-${m.id.substring(0,6).toUpperCase()}`,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      if (isBlocked) {
        return {
          id: m.id,
          type: 'blocked',
          user: m.user || 'System',
          action: `marked Blocked`,
          target: `TF-${m.id.substring(0,6).toUpperCase()}`,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      if (isReview) {
        return {
          id: m.id,
          type: 'comment',
          user: m.user || 'System',
          action: `requested review on`,
          target: `TF-${m.id.substring(0,6).toUpperCase()}`,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      
      return {
        id: m.id,
        type: 'created',
        user: m.user || 'System',
        action: `opened new ${m.module.substring(0,4)}`,
        target: `TF-${m.id.substring(0,6).toUpperCase()}`,
        time: new Date(m.createdAt).toLocaleDateString()
      };
    });
  }, [metrics]);

  return (
    <div className="panel">
      <div className="panel-header">
        <i className="ti ti-activity" style={{ fontSize: '16px', color: 'var(--green)' }} aria-hidden="true"></i>
        <span className="panel-title">Recent Activity</span>
        <span className="panel-action">All ↗</span>
      </div>
      <div className="panel-body">
        <div className="activity-list">
          {activities.map((act, i) => {
            const dotClass = `activity-dot ${act.type}`;
            const icon = act.type === 'closed' ? 'ti-check' : act.type === 'blocked' ? 'ti-ban' : act.type === 'comment' ? 'ti-message' : 'ti-plus';
            return (
              <div key={act.id || i} className="activity-item">
                <div className={dotClass}><i className={`ti ${icon}`} aria-hidden="true"></i></div>
                <div>
                  <div className="activity-text"><strong>{act.user}</strong> {act.action} {act.target}</div>
                  <div className="activity-time">{act.time}</div>
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', padding: '10px' }}>No recent activity.</div>
          )}
        </div>
      </div>
    </div>
  );
}
