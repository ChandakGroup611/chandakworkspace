"use client";

import React, { useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface RiskIntelligenceWidgetProps {
  kpis?: any;
}

export function RiskIntelligenceWidget({ kpis }: RiskIntelligenceWidgetProps) {
  const chartData = useMemo(() => {
    if (!kpis?.risk) return [];

    const { escalationRate, overdueRate, velocity } = kpis.risk;

    return [
      { name: 'Escalation Rate', value: escalationRate, color: '#ef4444' },
      { name: 'Overdue Rate', value: overdueRate, color: '#f59e0b' },
      { name: 'Resolution Gap', value: Math.max(0, 100 - velocity), color: '#3b82f6' },
      { name: 'Healthy', value: Math.max(0, 100 - (escalationRate + overdueRate + Math.max(0, 100 - velocity))), color: '#10b981' }
    ];
  }, [kpis]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl z-50">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="text-muted-foreground">{data.name}:</span>
            <span className="font-bold">{data.value.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!kpis?.risk) return <div className="h-full w-full bg-surface/50 rounded-2xl animate-pulse" />;

  return (
    <BaseWidget 
      title="Risk Intelligence Radar" 
      subtitle="System health and exposure analysis"
      overflowHidden
    >
      <div className="flex flex-col h-full w-full pt-4">
        {/* Radar Chart Container */}
        <div className="h-[140px] w-full flex items-end justify-center relative z-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
          {chartData.map((d, i) => (
            <div key={i} className="flex flex-col text-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-0.5">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                <span className="truncate">{d.name}</span>
              </div>
              <div className="font-semibold text-foreground pl-4">{d.value.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </BaseWidget>
  );
}
