"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

interface ChartsRowProps {
  metrics?: any[];
}

export default function ChartsRow({ metrics = [] }: ChartsRowProps) {
  
  const burndownData = useMemo(() => {
    // Generate actual burndown-like data using the createdAt dates in the metrics
    const days: Record<string, { total: number; resolved: number }> = {};
    const now = new Date();
    
    // Initialize last 15 days
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days[dateStr] = { total: 0, resolved: 0 };
    }

    metrics.forEach(m => {
      if (!m.createdAt) return;
      const d = new Date(m.createdAt);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays < 15) {
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (days[dateStr]) {
          days[dateStr].total++;
          if (String(m.status).toLowerCase() === 'resolved') {
            days[dateStr].resolved++;
          }
        }
      }
    });

    let runningTotal = 0;
    let runningResolved = 0;

    return Object.keys(days).map(day => {
      runningTotal += days[day].total;
      runningResolved += days[day].resolved;
      return {
        day,
        active: runningTotal - runningResolved,
        total: runningTotal
      };
    });

  }, [metrics]);

  const donutData = useMemo(() => {
    let tasks = 0, tickets = 0, reqs = 0, workspaces = 0;
    metrics.forEach(m => {
      if (m.module === "Tasks") tasks++;
      else if (m.module === "Tickets") tickets++;
      else if (m.module === "Requirements") reqs++;
      else if (m.module === "Workspaces") workspaces++;
    });

    return [
      { name: "Tickets", value: tickets || 1, color: "var(--red)" },
      { name: "Tasks", value: tasks || 1, color: "var(--teal)" },
      { name: "Requirements", value: reqs || 1, color: "var(--purple)" },
      { name: "Workspaces", value: workspaces || 1, color: "var(--accent)" },
    ];
  }, [metrics]);

  const total = donutData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid-2" style={{ marginBottom: '20px' }}>
      
      {/* ACTIVE ITEMS TREND */}
      <div className="panel">
        <div className="panel-header">
          <i className="ti ti-trending-down" style={{ fontSize: '16px', color: 'var(--accent)' }} aria-hidden="true"></i>
          <span className="panel-title">Active Items Trend</span>
          <span className="panel-action">Details ↗</span>
        </div>
        <div className="panel-body">
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} dy={10} style={{ fontFamily: 'var(--mono)' }} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} dx={-10} style={{ fontFamily: 'var(--mono)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: '#0f172a', fontSize: '11px', fontFamily: 'var(--mono)' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Line type="monotone" dataKey="total" stroke="rgba(139,145,168,0.35)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Total Created" />
                <Line type="monotone" dataKey="active" stroke="#6e7bff" strokeWidth={2} dot={{ r: 3, fill: '#6e7bff', strokeWidth: 0 }} name="Active" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DONUT + VELOCITY */}
      <div className="panel">
        <div className="panel-header">
          <i className="ti ti-chart-donut" style={{ fontSize: '16px', color: 'var(--purple)' }} aria-hidden="true"></i>
          <span className="panel-title">Ticket Distribution</span>
          <div className="tab-row">
            <div className="tab active">Type</div>
            <div className="tab">Status</div>
          </div>
        </div>
        
        <div className="panel-body">
          <div className="donut-row">
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius="68%"
                    outerRadius="100%"
                    paddingAngle={0}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: '#0f172a', fontSize: '11px', fontFamily: 'var(--mono)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="donut-legend">
              {donutData.map((d, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-dot" style={{ background: d.color }}></div>
                  <div className="legend-name">{d.name}</div>
                  <div className="legend-pct">{total > 0 ? Math.round((d.value/total)*100) : 0}%</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '0.5px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: '8px' }}>Historical Velocity (Mock)</div>
            <div className="velocity-chart">
              <div className="vel-bar-group">
                <div className="vel-bars">
                  <div className="vel-bar" style={{ height: '60%', background: 'var(--accent)', opacity: 0.5 }}></div>
                  <div className="vel-bar" style={{ height: '72%', background: 'var(--green)', opacity: 0.7 }}></div>
                </div>
                <div className="vel-label">W1</div>
              </div>
              <div className="vel-bar-group">
                <div className="vel-bars">
                  <div className="vel-bar" style={{ height: '80%', background: 'var(--accent)', opacity: 0.5 }}></div>
                  <div className="vel-bar" style={{ height: '65%', background: 'var(--green)', opacity: 0.7 }}></div>
                </div>
                <div className="vel-label">W2</div>
              </div>
              <div className="vel-bar-group">
                <div className="vel-bars">
                  <div className="vel-bar" style={{ height: '55%', background: 'var(--accent)', opacity: 0.5 }}></div>
                  <div className="vel-bar" style={{ height: '88%', background: 'var(--green)', opacity: 0.7 }}></div>
                </div>
                <div className="vel-label">W3</div>
              </div>
              <div className="vel-bar-group">
                <div className="vel-bars">
                  <div className="vel-bar" style={{ height: '100%', background: 'var(--accent)', opacity: 0.5 }}></div>
                  <div className="vel-bar" style={{ height: '75%', background: 'var(--green)', opacity: 0.7 }}></div>
                </div>
                <div className="vel-label">W4</div>
              </div>
              <div className="vel-bar-group">
                <div className="vel-bars">
                  <div className="vel-bar" style={{ height: '70%', background: 'var(--accent)', opacity: 0.5 }}></div>
                  <div className="vel-bar" style={{ height: '90%', background: 'var(--green)', opacity: 0.7 }}></div>
                </div>
                <div className="vel-label">W5</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
