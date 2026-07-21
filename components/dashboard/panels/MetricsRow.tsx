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
  const { theme } = useTheme();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

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
      label: "Total Operations",
      value: stats.total,
      delta: "Live tracking",
      isUp: true,
      icon: Activity,
      color: "accent", // Using global accent
      gradientLight: "from-white to-accent/10",
      gradientDark: "from-white/5 to-accent/10",
      textColor: "text-accent",
    },
    {
      id: "resolved",
      label: "Resolved",
      value: stats.resolved,
      delta: "Completed",
      isUp: true,
      icon: CheckCircle2,
      color: "emerald-500",
      gradientLight: "from-white to-emerald-50",
      gradientDark: "from-white/5 to-emerald-500/10",
      textColor: "text-emerald-500 dark:text-emerald-400",
    },
    {
      id: "inProgress",
      label: "In Progress",
      value: stats.inProgress,
      delta: "Active work",
      isUp: false,
      icon: Clock,
      color: "amber-500",
      gradientLight: "from-white to-amber-50",
      gradientDark: "from-white/5 to-amber-500/10",
      textColor: "text-amber-500 dark:text-amber-400",
    },
    {
      id: "blocked",
      label: "Blocked Issues",
      value: stats.blocked,
      delta: "Needs attention",
      isUp: false,
      icon: AlertCircle,
      color: "rose-500",
      gradientLight: "from-white to-rose-50",
      gradientDark: "from-white/5 to-rose-500/10",
      textColor: "text-rose-600 dark:text-rose-400",
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <AppCard 
            key={card.id}
            className={`relative overflow-hidden group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
              "theme-card-structural"
            }`}
          >
            {/* 3D Gradient Overlay matching theme & status color */}
            <div className={`absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity duration-300 group-hover:opacity-100 ${
              isLight ? card.gradientLight : card.gradientDark
            }`} />

            {/* Glowing Accent Top Border */}
            <div className={`absolute top-0 left-0 w-full h-1 ${
              card.color === "accent" ? "bg-accent" : `bg-${card.color}`
            }`} />

            <div className="p-5 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mix-blend-luminosity opacity-80">
                  {card.label}
                </span>
                <div className={`p-2 rounded-xl bg-surface/50 backdrop-blur-sm shadow-sm ring-1 ring-inset ring-black/5 ${card.textColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              
              <div className="mt-auto">
                <div className={`text-3xl font-black tracking-tight mb-2 text-foreground`}>
                  {card.value}
                </div>
                
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={`flex items-center gap-0.5 ${card.isUp ? "text-emerald-500" : (card.color === 'rose-500' ? "text-rose-500" : "text-amber-500")}`}>
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
