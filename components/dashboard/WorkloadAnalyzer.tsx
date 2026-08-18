"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Activity, X, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { getWorkloadSnapshot } from "@/lib/actions/tasks";

export default function WorkloadAnalyzer({ userId, onClose }: { userId: string, onClose: () => void }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    async function loadMetrics() {
      if (!userId) {
        setMetrics({
          active_tasks: 0,
          overdue_tasks: 0,
          capacity_percentage: 0,
          estimated_hours: 0,
          available_capacity: 100
        });
        setLoading(false);
        return;
      }
      
      try {
        const data = await getWorkloadSnapshot(userId);
        setMetrics(data || {
          active_tasks: 0, overdue_tasks: 0, capacity_percentage: 0, estimated_hours: 0, available_capacity: 100
        });
      } catch (e) {
        console.error("Failed to load workload snapshot");
      }
      setLoading(false);
    }
    loadMetrics();
  }, [userId]);

  return (
    <div className="absolute inset-0 bg-surface/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 rounded-xl animate-in fade-in-50">
      <AppCard className={`w-full max-w-md p-6 shadow-2xl theme-card-structural border-theme-btn-primary/30`}>
        
        <div className="flex items-center justify-between border-b pb-4 mb-5 border-border dark:border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-theme-btn-primary/10 rounded-lg">
              <Activity className="h-5 w-5 text-theme-icon" />
            </div>
            <div>
              <h3 className={`font-bold text-theme-icon`}>Workload Intelligence</h3>
              <p className="text-xs text-muted">Capacity & bandwidth analysis</p>
            </div>
          </div>
          <AppButton onClick={onClose} className="p-1 rounded hover:bg-surface dark:hover:bg-surface/10 text-muted transition-colors">
            <X className="h-4 w-4" />
          </AppButton>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted animate-pulse font-mono">
            Analyzing operational bandwidth matrix...
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Primary Capacity Meter */}
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-xs font-bold text-theme-icon uppercase tracking-wider">Utilization</span>
                <span className={`text-2xl font-bold ${metrics.capacity_percentage > 80 ? 'text-danger' : 'text-theme-icon'}`}>
                  {metrics.capacity_percentage}%
                </span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 bg-elevated`}>
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    metrics.capacity_percentage > 80 
                      ? 'bg-gradient-to-r from-rose-500 to-red-500' 
                      : 'bg-gradient-to-r from-accent to-indigo-500'
                  }`} 
                  style={{ width: `${metrics.capacity_percentage}%` }} 
                />
              </div>
              {metrics.capacity_percentage > 80 && (
                <p className="text-xs text-danger flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> User is currently over-utilized. High risk of SLA breach.
                </p>
              )}
            </div>

            {/* Metric Bento Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border bg-elevated border-border`}>
                <CheckCircle2 className="h-4 w-4 text-success mb-2" />
                <span className="block text-2xl font-bold text-theme-icon mb-1">{metrics.active_tasks}</span>
                <span className="text-xs text-muted uppercase tracking-wider font-bold">Active Directives</span>
              </div>
              <div className={`p-4 rounded-xl border bg-rose-50 border-rose-100`}>
                <AlertTriangle className="h-4 w-4 text-danger mb-2" />
                <span className="block text-2xl font-bold text-danger dark:text-danger mb-1">{metrics.overdue_tasks}</span>
                <span className="text-xs text-danger/70 uppercase tracking-wider font-bold">Overdue SLA</span>
              </div>
              <div className={`p-4 rounded-xl border bg-elevated border-border`}>
                <Clock className="h-4 w-4 text-theme-icon mb-2" />
                <span className="block text-2xl font-bold text-theme-icon mb-1">{metrics.estimated_hours}h</span>
                <span className="text-xs text-muted uppercase tracking-wider font-bold">Estimated Load</span>
              </div>
              <div className={`p-4 rounded-xl border flex flex-col justify-center bg-theme-btn-primary/10 border-blue-100`}>
                <span className="text-xs text-theme-icon dark:text-theme-icon uppercase tracking-wider font-bold mb-1">Available Bandwidth</span>
                <span className="text-xl font-bold text-theme-icon dark:text-blue-300">{metrics.available_capacity}%</span>
              </div>
            </div>

            <AppButton 
              onClick={onClose}
              className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
                "bg-elevated text-muted hover:bg-elevated"
              }`}
            >
              Close Analysis
            </AppButton>
          </div>
        )}
      </AppCard>
    </div>
  );
}

