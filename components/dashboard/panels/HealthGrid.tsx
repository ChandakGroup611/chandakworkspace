"use client";

import React, { useMemo } from "react";

interface HealthGridProps {
  metrics?: any[];
}

export default function HealthGrid({ metrics = [] }: HealthGridProps) {
  
  const velocity = useMemo(() => {
    return metrics.filter(m => String(m.status).toLowerCase().includes('resolv') || String(m.status).toLowerCase().includes('done')).length * 3 + 24; // dummy math for points
  }, [metrics]);

  const completion = useMemo(() => {
    if (metrics.length === 0) return 0;
    const resolved = metrics.filter(m => String(m.status).toLowerCase().includes('resolv') || String(m.status).toLowerCase().includes('done')).length;
    return Math.round((resolved / metrics.length) * 100);
  }, [metrics]);

  return (
    <div className="health-grid">
      <div className="health-card">
        <div className="health-icon" style={{ color: 'var(--green)' }}>
          <i className="ti ti-flame" aria-hidden="true"></i>
        </div>
        <div>
          <div className="health-label">Resolution Rate</div>
          <div className="health-value" style={{ color: 'var(--green)' }}>{velocity} pts</div>
        </div>
      </div>
      
      <div className="health-card">
        <div className="health-icon" style={{ color: 'var(--accent)' }}>
          <i className="ti ti-clock" aria-hidden="true"></i>
        </div>
        <div>
          <div className="health-label">Avg. Cycle Time</div>
          <div className="health-value" style={{ color: 'var(--accent)' }}>2.4 days</div>
        </div>
      </div>
      
      <div className="health-card">
        <div className="health-icon" style={{ color: 'var(--amber)' }}>
          <i className="ti ti-target" aria-hidden="true"></i>
        </div>
        <div>
          <div className="health-label">Sprint Completion</div>
          <div className="health-value" style={{ color: 'var(--amber)' }}>{completion}%</div>
        </div>
      </div>
    </div>
  );
}
