"use client";

import React, { useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface StatusComparisonWidgetProps {
  kpis?: any;
}

export function StatusComparisonWidget({ kpis }: StatusComparisonWidgetProps) {
  const chartData = useMemo(() => {
    if (!kpis?.monthlyTrends) return [];

    const reversed = [...kpis.monthlyTrends].reverse();
    return reversed.map((t: any) => ({
      month: t.month,
      Active: t.active,
      "In Review": t.review,
      Escalated: t.escalated,
      Resolved: t.resolved
    }));
  }, [kpis]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl">
          <p className="text-sm font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-border/50 text-xs font-semibold text-foreground">
            Total: {payload.reduce((acc: number, entry: any) => acc + entry.value, 0)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (!kpis?.monthlyTrends) return <div className="h-full w-full bg-surface/50 rounded-2xl animate-pulse" />;

  return (
    <BaseWidget title="Status Trends" subtitle="Monthly Status-wise comparison" overflowHidden>
      <div className="flex-1 w-full h-full pt-4 min-h-[250px] pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--text-muted)', opacity: 0.2 }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="Resolved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Active" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="In Review" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Escalated" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </BaseWidget>
  );
}
