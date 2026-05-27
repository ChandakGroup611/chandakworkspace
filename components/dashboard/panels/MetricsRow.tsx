"use client";

import React, { useMemo } from "react";

interface MetricsRowProps {
  metrics?: any[];
}

export default function MetricsRow({ metrics = [] }: MetricsRowProps) {
  
  const stats = useMemo(() => {
    const total = metrics.length;
    const resolved = metrics.filter(m => String(m.status).toLowerCase().includes('resolv') || String(m.status).toLowerCase().includes('done')).length;
    const inProgress = metrics.filter(m => String(m.status).toLowerCase().includes('progress') || String(m.status).toLowerCase().includes('activ')).length;
    const blocked = metrics.filter(m => String(m.status).toLowerCase().includes('escalat') || String(m.status).toLowerCase().includes('block')).length;

    return { total, resolved, inProgress, blocked };
  }, [metrics]);

  return (
    <div className="metrics-row">
      <div className="metric-card blue">
        <div className="metric-label">Total Items</div>
        <div className="metric-value">{stats.total}</div>
        <div className="metric-delta delta-up">
          <i className="ti ti-trending-up" aria-hidden="true"></i> Live tracking
        </div>
        <i className="ti ti-ticket metric-icon" aria-hidden="true"></i>
      </div>
      
      <div className="metric-card green">
        <div className="metric-label">Resolved</div>
        <div className="metric-value">{stats.resolved}</div>
        <div className="metric-delta delta-up">
          <i className="ti ti-trending-up" aria-hidden="true"></i> Completed
        </div>
        <i className="ti ti-circle-check metric-icon" aria-hidden="true"></i>
      </div>
      
      <div className="metric-card amber">
        <div className="metric-label">In Progress</div>
        <div className="metric-value">{stats.inProgress}</div>
        <div className="metric-delta delta-down">
          <i className="ti ti-trending-down" aria-hidden="true"></i> Active work
        </div>
        <i className="ti ti-clock-play metric-icon" aria-hidden="true"></i>
      </div>
      
      <div className="metric-card red">
        <div className="metric-label">Blocked</div>
        <div className="metric-value">{stats.blocked}</div>
        <div className="metric-delta delta-down">
          <i className="ti ti-alert-circle" aria-hidden="true"></i> Needs attention
        </div>
        <i className="ti ti-ban metric-icon" aria-hidden="true"></i>
      </div>
    </div>
  );
}
