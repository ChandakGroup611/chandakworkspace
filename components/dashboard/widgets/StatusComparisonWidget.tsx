"use client";

import React, { useMemo } from "react";
import { BarChart3 } from "lucide-react";
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
        <div className="bg-background/95 border border-border p-3 rounded-lg ">
          <p className="text-sm font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold">{entry.value}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-border text-xs font-semibold text-foreground">
            Total: {payload.reduce((acc: number, entry: any) => acc + entry.value, 0)}
          </div>
        </div>
      );
    }
    return null;
  };

  if (!kpis?.monthlyTrends) return <div className="h-full w-full bg-surface/50 rounded-lg animate-pulse" />;

  return (
    <BaseWidget 
      id="status-comp"
      title="Status trends" 
      subtitle="Monthly status-wise breakdown" 
      icon={<BarChart3 className="w-5 h-5 text-accent-soft-text" />}
      collapsible={true}
      overflowHidden
    >
      <div className="flex-1 w-full h-full pt-4 min-h-[250px] pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--text-muted)', opacity: 0.2 }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="Resolved" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Active" stackId="a" fill="var(--chart-2)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="In Review" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Escalated" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </BaseWidget>
  );
}
