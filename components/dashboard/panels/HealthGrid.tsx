"use client";

import React, { useMemo } from "react";

interface HealthGridProps {
  metrics?: any[];
}

export default function HealthGrid({ metrics = [] }: HealthGridProps) {
  
  const { velocity, cycleTime } = useMemo(() => {
    let resolvedCount = 0;
    let totalCycleTimeDays = 0;
    
    metrics.forEach(m => {
      const isResolved = String(m.status).toLowerCase().includes('resolv') || String(m.status).toLowerCase().includes('done');
      if (isResolved) {
        resolvedCount++;
        if (m.createdAt && m.updatedAt) {
          const diffMs = new Date(m.updatedAt).getTime() - new Date(m.createdAt).getTime();
          const diffDays = diffMs / (1000 * 3600 * 24);
          totalCycleTimeDays += Math.max(0, diffDays);
        }
      }
    });
    
    const avgCycle = resolvedCount > 0 ? (totalCycleTimeDays / resolvedCount) : 0;
    return {
      velocity: resolvedCount,
      cycleTime: avgCycle < 0.1 && resolvedCount > 0 ? "<0.1" : avgCycle.toFixed(1)
    };
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
          <div className="health-value" style={{ color: 'var(--green)' }}>{velocity} items</div>
        </div>
      </div>
      
      <div className="health-card">
        <div className="health-icon" style={{ color: 'var(--accent)' }}>
          <i className="ti ti-clock" aria-hidden="true"></i>
        </div>
        <div>
          <div className="health-label">Avg. Cycle Time</div>
          <div className="health-value" style={{ color: 'var(--accent)' }}>{cycleTime} days</div>
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
