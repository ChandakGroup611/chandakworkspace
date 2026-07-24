"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

interface ChartsRowProps {
  metrics?: any[];
}

export default function ChartsRow({ metrics = [] }: ChartsRowProps) {
  
  const burndownData = useMemo(() => {
    // Generate actual burndown-like data using the createdAt dates in the metrics
    const days: Record<string, { 
      tasksT: number; tasksR: number;
      wsT: number; wsR: number;
      ticT: number; ticR: number;
      reqT: number; reqR: number;
    }> = {};
    const now = new Date();
    
    // Initialize last 15 days
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days[dateStr] = { tasksT: 0, tasksR: 0, wsT: 0, wsR: 0, ticT: 0, ticR: 0, reqT: 0, reqR: 0 };
    }

    metrics.forEach(m => {
      if (!m.createdAt) return;
      const d = new Date(m.createdAt);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays < 15) {
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (days[dateStr]) {
          const isRes = String(m.status).toLowerCase() === 'resolved';
          if (m.module === 'Tasks') {
            days[dateStr].tasksT++;
            if (isRes) days[dateStr].tasksR++;
          } else if (m.module === 'Workspaces') {
            days[dateStr].wsT++;
            if (isRes) days[dateStr].wsR++;
          } else if (m.module === 'Tickets') {
            days[dateStr].ticT++;
            if (isRes) days[dateStr].ticR++;
          } else if (m.module === 'Requirements') {
            days[dateStr].reqT++;
            if (isRes) days[dateStr].reqR++;
          }
        }
      }
    });

    let rTasksT = 0, rTasksR = 0;
    let rWsT = 0, rWsR = 0;
    let rTicT = 0, rTicR = 0;
    let rReqT = 0, rReqR = 0;

    return Object.keys(days).map(day => {
      rTasksT += days[day].tasksT; rTasksR += days[day].tasksR;
      rWsT += days[day].wsT; rWsR += days[day].wsR;
      rTicT += days[day].ticT; rTicR += days[day].ticR;
      rReqT += days[day].reqT; rReqR += days[day].reqR;

      return {
        day,
        tasksActive: rTasksT - rTasksR,
        wsActive: rWsT - rWsR,
        ticActive: rTicT - rTicR,
        reqActive: rReqT - rReqR,
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
      { name: "Tickets", value: tickets, color: "var(--red)" },
      { name: "Tasks", value: tasks, color: "var(--teal)" },
      { name: "Requirements", value: reqs, color: "var(--purple)" },
      { name: "Workspaces", value: workspaces, color: "var(--accent)" },
    ].filter(d => d.value > 0);
  }, [metrics]);

  const total = donutData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid-2" style={{ marginBottom: '20px' }}>
      
      {/* ACTIVE ITEMS TREND */}
      <div className="panel theme-card-structural">
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
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} dy={10} style={{ fontFamily: 'var(--mono)' }} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} axisLine={false} dx={-10} style={{ fontFamily: 'var(--mono)' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', color: '#0f172a', fontSize: '11px', fontFamily: 'var(--mono)' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Line type="monotone" dataKey="tasksActive" stroke="var(--teal)" strokeWidth={2} dot={{ r: 3, fill: 'var(--teal)', strokeWidth: 0 }} name="Tasks" />
                <Line type="monotone" dataKey="wsActive" stroke="var(--accent)" strokeWidth={2} dot={false} name="Workspaces" />
                <Line type="monotone" dataKey="ticActive" stroke="var(--red)" strokeWidth={2} dot={false} name="Tickets" />
                <Line type="monotone" dataKey="reqActive" stroke="var(--purple)" strokeWidth={2} dot={false} name="Requirements" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DONUT + VELOCITY */}
      <div className="panel theme-card-structural">
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
            <div className="section-label" style={{ marginBottom: '8px' }}>Historical Resolution (Mock)</div>
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
