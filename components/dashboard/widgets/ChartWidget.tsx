"use client";

import React, { useMemo } from "react";
import { LineChart, Activity } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface ChartWidgetProps {
  metrics?: any[];
}

export function ChartWidget({ metrics = [] }: ChartWidgetProps) {
  const burndownData = useMemo(() => {
    const days: Record<string, { tasksT: number; tasksR: number; wsT: number; wsR: number; ticT: number; ticR: number; reqT: number; reqR: number; }> = {};
    const now = new Date();
    
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
          const isRes = String(m.status).toLowerCase().includes('resolv') || String(m.status).toLowerCase().includes('done');
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
        Tasks: rTasksT - rTasksR,
        Tickets: rTicT - rTicR,
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
      { name: "Tickets", value: tickets, color: "#a855f7" },
      { name: "Tasks", value: tasks, color: "#3b82f6" },
      { name: "Requirements", value: reqs, color: "#10b981" },
      { name: "Workspaces", value: workspaces, color: "#f59e0b" },
    ].filter(d => d.value > 0);
  }, [metrics]);

  const total = donutData.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl">
          <p className="text-sm font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? Math.round((data.value / total) * 100) : 0;
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="text-muted-foreground">{data.name}:</span>
            <span className="font-bold">{data.value}</span>
            <span className="text-muted-foreground ml-1">({percentage}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      
      {/* ACTIVE ITEMS TREND - 2D Modern Bar */}
      <BaseWidget
        id="chart-trend"
        title="Active Items Trend"
        icon={<Activity className="w-5 h-5" />}
        headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors">View Details</span>}
        overflowHidden
      >
        <div className="flex-1 w-full h-full pt-4 min-h-[280px] pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={burndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--text-muted)', opacity: 0.2 }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Tasks" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Tickets" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </BaseWidget>

      {/* DONUT CHART - 2D Modern Donut */}
      <BaseWidget
        id="chart-distribution"
        title="Volume Distribution"
        icon={<LineChart className="w-5 h-5" />}
        headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors">By Type</span>}
        overflowHidden
      >
        <div className="flex items-center flex-1 w-full h-full min-h-[280px] pt-2 pb-2">
          <div className="w-1/2 h-full flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 pl-4 space-y-4 relative z-10">
            {donutData.map((d, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                  <div className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{d.name}</div>
                </div>
                <div className="text-sm font-bold theme-card-structural px-2 py-0.5 rounded-md">
                  {total > 0 ? Math.round((d.value/total)*100) : 0}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </BaseWidget>

    </div>
  );
}

