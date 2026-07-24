"use client";

import React, { useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface ResolutionVelocityWidgetProps {
  metrics?: any[];
}

export function ResolutionVelocityWidget({ metrics = [] }: ResolutionVelocityWidgetProps) {
  const chartData = useMemo(() => {
    // Generate some mock velocity points over time based on actual metrics counts for visual depth
    // A real implementation would parse the 'updatedAt' vs 'createdAt' for each ticket
    
    // Group metrics by day for the last 7 days
    const dailyData: Record<string, { resolved: number, total: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      dailyData[dayStr] = { resolved: 0, total: 0 };
    }

    metrics.forEach(m => {
      if (m.createdAt) {
        const d = new Date(m.createdAt);
        const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
        if (dailyData[dayStr]) {
          dailyData[dayStr].total++;
          const sLower = String(m.status).toLowerCase();
          if (sLower.includes('resolv') || sLower.includes('done')) {
            dailyData[dayStr].resolved++;
          }
        }
      }
    });

    return Object.keys(dailyData).map(day => ({
      day,
      New: dailyData[day].total,
      Resolved: dailyData[day].resolved
    }));
  }, [metrics]);

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

  return (
    <BaseWidget id="resolution-velocity" title="Resolution Progress" subtitle="7-Day Activity" overflowHidden>
      <div className="flex-1 w-full h-full pt-4 min-h-[250px] pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Area type="monotone" dataKey="New" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
            <Area type="monotone" dataKey="Resolved" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </BaseWidget>
  );
}

