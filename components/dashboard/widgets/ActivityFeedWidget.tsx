"use client";

import React, { useMemo } from "react";
import { Activity, CheckCircle2, AlertCircle, MessageSquare, Plus, ArrowUpRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

interface ActivityFeedWidgetProps {
  metrics?: any[];
}

export function ActivityFeedWidget({ metrics = [] }: ActivityFeedWidgetProps) {
  const activities = useMemo(() => {
    // Generate some simulated activity from the latest metrics
    const sorted = [...metrics]
      .filter(m => m.id && m.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return sorted.map((m, i) => {
      const statusStr = String(m.status || "").toLowerCase();
      const isBlocked = statusStr.includes('escalat') || statusStr.includes('block');
      const isDone = statusStr.includes('resolv') || statusStr.includes('done');
      const isReview = statusStr.includes('review');

      const targetStr = m.code || `TF-${m.id.substring(0,6).toUpperCase()}`;

      if (isDone) {
        return {
          id: m.id,
          type: 'closed',
          user: m.user || 'System',
          action: `closed ${m.module.substring(0,4)}`,
          target: targetStr,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      if (isBlocked) {
        return {
          id: m.id,
          type: 'blocked',
          user: m.user || 'System',
          action: `marked Blocked`,
          target: targetStr,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      if (isReview) {
        return {
          id: m.id,
          type: 'comment',
          user: m.user || 'System',
          action: `requested review on`,
          target: targetStr,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      
      return {
        id: m.id,
        type: 'created',
        user: m.user || 'System',
        action: `opened new ${m.module.substring(0,4)}`,
        target: targetStr,
        time: new Date(m.createdAt).toLocaleDateString()
      };
    });
  }, [metrics]);

  return (
    <BaseWidget
      id="activity-feed"
      title="Recent Activity"
      icon={<Activity className="w-5 h-5" />}
      className="h-[400px]"
      headerRight={<span className="text-xs text-primary hover:text-primary/80 cursor-pointer font-semibold transition-colors flex items-center gap-1">All <ArrowUpRight className="w-3 h-3" /></span>}
    >
      <div className="space-y-4 pr-1">
        {activities.map((act, i) => {
          let iconElement;
          let iconBg;
          
          if (act.type === 'closed') {
            iconElement = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            iconBg = "bg-emerald-500/10 border-emerald-500/20";
          } else if (act.type === 'blocked') {
            iconElement = <AlertCircle className="h-4 w-4 text-red-500" />;
            iconBg = "bg-red-500/10 border-red-500/20";
          } else if (act.type === 'comment') {
            iconElement = <MessageSquare className="h-4 w-4 text-accent" />;
            iconBg = "bg-accent/10 border-accent/20";
          } else {
            iconElement = <Plus className="h-4 w-4 text-accent" />;
            iconBg = "bg-accent/10 border-accent/20";
          }

          return (
            <div key={act.id || i} className="flex gap-4 group cursor-default">
              <div className="relative">
                <div className={`p-2 rounded-full border ${iconBg} shadow-sm group-hover:scale-110 transition-transform`}>
                  {iconElement}
                </div>
                {i !== activities.length - 1 && (
                  <div className="absolute top-10 bottom-[-16px] left-1/2 w-px bg-border/50 -translate-x-1/2" />
                )}
              </div>
              <div className="flex flex-col justify-center pb-2">
                <div className="text-sm text-foreground/90">
                  <strong className="text-foreground">{act.user}</strong> {act.action} <span className="font-mono text-xs px-1 py-0.5 rounded theme-card-structural /50">{act.target}</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">{act.time}</div>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/50 rounded-xl">No recent activity</div>
        )}
      </div>
    </BaseWidget>
  );
}
