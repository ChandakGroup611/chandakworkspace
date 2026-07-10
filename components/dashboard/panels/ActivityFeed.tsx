"use client";

import React, { useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { Activity, ArrowRight, CheckCircle2, AlertCircle, MessageSquare, Plus } from "lucide-react";

interface ActivityFeedProps {
  metrics?: any[];
}

export default function ActivityFeed({ metrics = [] }: ActivityFeedProps) {
  
  const activities = useMemo(() => {
    // Generate some simulated activity from the latest metrics
    const sorted = [...metrics]
      .filter(m => m.id && m.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return sorted.map((m, i) => {
      const isBlocked = String(m.status).toLowerCase() === 'escalated';
      const isDone = String(m.status).toLowerCase() === 'resolved';
      const isReview = String(m.status).toLowerCase() === 'review';

      if (isDone) {
        return {
          id: m.id,
          type: 'closed',
          user: m.user || 'System',
          action: `closed ${m.module.substring(0,4)}`,
          target: m.code || `TF-${m.id.substring(0,6).toUpperCase()}`,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      if (isBlocked) {
        return {
          id: m.id,
          type: 'blocked',
          user: m.user || 'System',
          action: `marked Blocked`,
          target: m.code || `TF-${m.id.substring(0,6).toUpperCase()}`,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      if (isReview) {
        return {
          id: m.id,
          type: 'comment',
          user: m.user || 'System',
          action: `requested review on`,
          target: m.code || `TF-${m.id.substring(0,6).toUpperCase()}`,
          time: new Date(m.createdAt).toLocaleDateString()
        };
      }
      
      return {
        id: m.id,
        type: 'created',
        user: m.user || 'System',
        action: `opened new ${m.module.substring(0,4)}`,
        target: m.code || `TF-${m.id.substring(0,6).toUpperCase()}`,
        time: new Date(m.createdAt).toLocaleDateString()
      };
    });
  }, [metrics]);

  return (
    <AppCard>
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-bold text-foreground">Recent Activity</span>
        </div>
        <AppButton variant="ghost" size="sm" className="h-6 text-xs gap-1">All <ArrowRight className="h-3 w-3" /></AppButton>
      </div>
      <div className="p-4 bg-background">
        <div className="space-y-4">
          {activities.map((act, i) => {
            let iconElement;
            if (act.type === 'closed') iconElement = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            else if (act.type === 'blocked') iconElement = <AlertCircle className="h-4 w-4 text-rose-500" />;
            else if (act.type === 'comment') iconElement = <MessageSquare className="h-4 w-4 text-accent" />;
            else iconElement = <Plus className="h-4 w-4 text-accent" />;

            return (
              <div key={act.id || i} className="flex gap-3">
                <div className="mt-0.5">{iconElement}</div>
                <div>
                  <div className="text-xs text-foreground"><strong>{act.user}</strong> {act.action} <span className="font-mono text-muted-foreground">{act.target}</span></div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{act.time}</div>
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">No recent activity.</div>
          )}
        </div>
      </div>
    </AppCard>
  );
}
