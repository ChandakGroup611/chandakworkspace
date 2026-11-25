"use client";

import React, { useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Activity
} from "lucide-react";

interface MetricsRowProps {
  metrics?: any[];
}

export default function MetricsRow({ metrics = [] }: MetricsRowProps) {
  const { isLight } = useTheme();

  const stats = useMemo(() => {
    const total = metrics.length;
    const resolved = metrics.filter(m => String(m.status).toLowerCase().includes('resolv') || String(m.status).toLowerCase().includes('done')).length;
    const inProgress = metrics.filter(m => String(m.status).toLowerCase().includes('progress') || String(m.status).toLowerCase().includes('activ')).length;
    const blocked = metrics.filter(m => String(m.status).toLowerCase().includes('escalat') || String(m.status).toLowerCase().includes('block')).length;

    return { total, resolved, inProgress, blocked };
  }, [metrics]);

  const cards = [
    {
      id: "total",
      label: "Total operations",
      value: stats.total,
      delta: "Live tracking",
      isUp: true,
      icon: Activity,
      color: "accent", // Using global accent
      gradientLight: "to-accent/10",
      gradientDark: "to-accent/10",
      textColor: "text-accent-soft-text",
    },
    {
      id: "resolved",
      label: "Resolved",
      value: stats.resolved,
      delta: "Completed",
      isUp: true,
      icon: CheckCircle2,
      color: "emerald-500",
      gradientLight: "to-success-soft",
      gradientDark: "to-success-soft",
      textColor: "text-success-text dark:text-success-text",
    },
    {
      id: "inProgress",
      label: "In Progress",
      value: stats.inProgress,
      delta: "Active work",
      isUp: false,
      icon: Clock,
      color: "amber-500",
      gradientLight: "to-warning-soft",
      gradientDark: "to-warning-soft",
      textColor: "text-warning-text dark:text-warning-text",
    },
    {
      id: "blocked",
      label: "Blocked issues",
      value: stats.blocked,
      delta: "Needs attention",
      isUp: false,
      icon: AlertCircle,
      color: "rose-500",
      gradientLight: "to-danger-soft",
      gradientDark: "to-danger-soft",
      textColor: "text-danger-text dark:text-danger-text",
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <AppCard 
            key={card.id}
            className={`relative overflow-hidden group transition-all duration-300 ${
              "theme-card-structural"
            }`}
          >

            <div className="p-5 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-medium text-muted-foreground">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg bg-surface/50 shadow-sm ring-1 ring-inset ring-border ${card.textColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-auto">
                <div className={`text-3xl font-semibold tracking-tight mb-2 text-foreground`}>
                  {card.value}
                </div>
                
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={`flex items-center gap-0.5 ${card.isUp ? "text-success-text" : (card.color === 'rose-500' ? "text-danger-text" : "text-warning-text")}`}>
                    {card.isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-muted-foreground">{card.delta}</span>
                </div>
              </div>
            </div>
          </AppCard>
        );
      })}
    </div>
  );
}
