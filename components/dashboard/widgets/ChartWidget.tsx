"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";
import { LineChart, Activity } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

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
      { name: "Tickets", value: tickets, color: "#a855f7" }, // purple-500
      { name: "Tasks", value: tasks, color: "#3b82f6" },     // blue-500
      { name: "Requirements", value: reqs, color: "#10b981" }, // emerald-500
      { name: "Workspaces", value: workspaces, color: "#f59e0b" }, // amber-500
    ].filter(d => d.value > 0);
  }, [metrics]);

  const total = donutData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      
      {/* ACTIVE ITEMS TREND - Using Area Chart for Executive Feel */}
      <BaseWidget
        id="chart-trend"
        title="Active Items Trend"
        icon={<Activity className="w-5 h-5" />}
        headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors">View Details</span>}
      >
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={burndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))', fontSize: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area type="monotone" dataKey="tasksActive" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTasks)" strokeWidth={2} name="Tasks" />
              <Area type="monotone" dataKey="ticActive" stroke="#a855f7" fillOpacity={1} fill="url(#colorTickets)" strokeWidth={2} name="Tickets" />
              <Area type="monotone" dataKey="reqActive" stroke="#10b981" fillOpacity={0} strokeWidth={2} name="Requirements" />
              <Area type="monotone" dataKey="wsActive" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} name="Workspaces" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BaseWidget>

      {/* DONUT CHART */}
      <BaseWidget
        id="chart-distribution"
        title="Volume Distribution"
        icon={<LineChart className="w-5 h-5" />}
        headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors">By Type</span>}
      >
        <div className="flex items-center h-64">
          <div className="w-1/2 h-full flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--foreground))', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 pl-6 space-y-4">
            {donutData.map((d, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                  <div className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{d.name}</div>
                </div>
                <div className="text-sm font-bold bg-surface border border-border px-2 py-0.5 rounded-md">
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
