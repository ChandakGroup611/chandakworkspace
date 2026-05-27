"use client";

import React, { useMemo } from "react";

interface TeamPerformanceProps {
  metrics?: any[];
}

export default function TeamPerformance({ metrics = [] }: TeamPerformanceProps) {
  
  const teamStats = useMemo(() => {
    const userMap: Record<string, any> = {};
    metrics.forEach(m => {
      if (!m.user || m.user === 'System') return;
      if (!userMap[m.user]) {
        userMap[m.user] = {
          name: m.user,
          initials: m.user.substring(0,2).toUpperCase(),
          closed: 0,
          pts: 0,
          active: 0,
        };
      }
      
      if (String(m.status) === 'Resolved' || String(m.status) === 'Done') {
        userMap[m.user].closed += 1;
        userMap[m.user].pts += 3;
      } else {
        userMap[m.user].active += 1;
      }
    });

    return Object.values(userMap).slice(0, 5);
  }, [metrics]);

  const getRole = (i: number) => {
    return "Team Member";
  };

  const getAvgDays = (i: number) => {
    return "-";
  };

  return (
    <div className="panel" style={{ marginTop: '20px' }}>
      <div className="panel-header">
        <i className="ti ti-users-group" style={{ fontSize: '16px', color: 'var(--purple)' }} aria-hidden="true"></i>
        <span className="panel-title">Team Performance · Sprint 24</span>
        <span className="panel-action">Full Report ↗</span>
      </div>
      <div className="panel-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
          <div style={{ display: 'contents' }}>
            <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0 10px 0', borderBottom: '0.5px solid var(--border)', gridColumn: 1 }}>Member</div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0 10px 16px', borderBottom: '0.5px solid var(--border)', gridColumn: 2 }}>Closed</div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0 10px 16px', borderBottom: '0.5px solid var(--border)', gridColumn: 3 }}>Story Pts</div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0 10px 16px', borderBottom: '0.5px solid var(--border)', gridColumn: 4 }}>Progress</div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0 10px 16px', borderBottom: '0.5px solid var(--border)', gridColumn: 5 }}>Avg Days</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {teamStats.map((u: any, i: number) => {
            const isLast = i === teamStats.length - 1;
            const progress = u.closed + u.active > 0 ? Math.round((u.closed / (u.closed + u.active)) * 100) : 0;
            const colors = ['var(--green)', 'var(--teal)', 'var(--amber)', 'var(--purple)', 'var(--green)'];
            const color = colors[i % colors.length];

            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 3fr 1fr', alignItems: 'center', padding: '12px 0', borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div className={`mini-avatar a${(i % 5) + 1}`} style={{ width: '30px', height: '30px', fontSize: '11px' }}>{u.initials}</div>
                  <div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text1)', fontWeight: 500 }}>{u.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{getRole(i)}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--syne)', fontSize: '18px', fontWeight: 600, color: color, paddingLeft: '16px' }}>{u.closed}</div>
                <div style={{ fontFamily: 'var(--syne)', fontSize: '18px', fontWeight: 600, color: 'var(--accent)', paddingLeft: '16px' }}>{u.pts}</div>
                <div style={{ padding: '0 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: '4px' }}>
                    <span>Sprint goal</span><span>{progress}%</span>
                  </div>
                  <div className="prog-bar-wrap">
                    <div className="prog-bar" style={{ width: `${progress}%`, background: color }}></div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontFamily: 'var(--mono)', color: 'var(--text2)', paddingLeft: '16px' }}>{getAvgDays(i)}d</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
