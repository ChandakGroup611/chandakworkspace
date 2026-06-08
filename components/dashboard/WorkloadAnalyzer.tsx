"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Activity, X, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { getWorkloadSnapshot } from "@/lib/actions/tasks";

export default function WorkloadAnalyzer({ userId, onClose }: { userId: string, onClose: () => void }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  
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
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 rounded-xl animate-in fade-in-50">
      <AppCard className={`w-full max-w-md p-6 shadow-2xl ${isLightMode ? "bg-white border-blue-200" : "bg-[#0a0c16] border-blue-500/30"}`}>
        
        <div className="flex items-center justify-between border-b pb-4 mb-5 border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className={`font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>Workload Intelligence</h3>
              <p className="text-xs text-gray-500">Capacity & bandwidth analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500 animate-pulse font-mono">
            Analyzing operational bandwidth matrix...
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Primary Capacity Meter */}
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Utilization</span>
                <span className={`text-2xl font-bold ${metrics.capacity_percentage > 80 ? 'text-rose-500' : 'text-blue-500'}`}>
                  {metrics.capacity_percentage}%
                </span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 ${isLightMode ? "bg-gray-100" : "bg-white/5"}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    metrics.capacity_percentage > 80 
                      ? 'bg-gradient-to-r from-rose-500 to-red-500' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`} 
                  style={{ width: `${metrics.capacity_percentage}%` }} 
                />
              </div>
              {metrics.capacity_percentage > 80 && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> User is currently over-utilized. High risk of SLA breach.
                </p>
              )}
            </div>

            {/* Metric Bento Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border ${isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.02] border-white/5"}`}>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mb-2" />
                <span className="block text-2xl font-bold text-gray-900 dark:text-white mb-1">{metrics.active_tasks}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Active Directives</span>
              </div>
              <div className={`p-4 rounded-xl border ${isLightMode ? "bg-rose-50 border-rose-100" : "bg-rose-500/5 border-rose-500/20"}`}>
                <AlertTriangle className="h-4 w-4 text-rose-500 mb-2" />
                <span className="block text-2xl font-bold text-rose-600 dark:text-rose-400 mb-1">{metrics.overdue_tasks}</span>
                <span className="text-xs text-rose-500/70 uppercase tracking-wider font-bold">Overdue SLA</span>
              </div>
              <div className={`p-4 rounded-xl border ${isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.02] border-white/5"}`}>
                <Clock className="h-4 w-4 text-indigo-500 mb-2" />
                <span className="block text-2xl font-bold text-gray-900 dark:text-white mb-1">{metrics.estimated_hours}h</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Estimated Load</span>
              </div>
              <div className={`p-4 rounded-xl border flex flex-col justify-center ${isLightMode ? "bg-blue-50 border-blue-100" : "bg-blue-500/10 border-blue-500/20"}`}>
                <span className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold mb-1">Available Bandwidth</span>
                <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{metrics.available_capacity}%</span>
              </div>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
                isLightMode ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Close Analysis
            </button>
          </div>
        )}
      </AppCard>
    </div>
  );
}
