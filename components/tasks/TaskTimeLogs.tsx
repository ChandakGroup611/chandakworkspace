"use client";

import React, { useState, useEffect } from "react";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { Clock, Plus, Loader2 } from "lucide-react";
import { logTaskTime, getTaskDetails } from "@/lib/actions/tasks";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function TaskTimeLogs({ taskId }: { taskId: string }) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const details = await getTaskDetails(taskId);
        setEstimatedHours(details?.estimated_hours || 0);
        setLogs(details?.custom_fields?.time_logs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || isNaN(Number(hours))) return;
    
    setIsSubmitting(true);
    try {
      const newLog = await logTaskTime(taskId, Number(hours), description);
      setLogs([...logs, newLog]);
      setHours("");
      setDescription("");
    } catch (e: any) {
      alert("Failed to log time: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalLogged = logs.reduce((acc, log) => acc + (Number(log.hours) || 0), 0);
  const progressPercent = estimatedHours > 0 ? Math.min(100, (totalLogged / estimatedHours) * 100) : 0;

  if (loading) {
    return <div className="p-8 text-center text-xs text-gray-500 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className={`p-4 rounded-xl ${"theme-card-structural "}`}>
        <div className="flex justify-between items-end mb-2">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Logged</p>
            <p className={`text-2xl font-bold text-slate-900`}>{totalLogged.toFixed(1)}h</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated</p>
            <p className="text-sm font-bold text-gray-400">{estimatedHours > 0 ? `${estimatedHours}h` : "Not set"}</p>
          </div>
        </div>
        {estimatedHours > 0 && (
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mt-4 overflow-hidden">
            <div 
              className={`h-2 rounded-full ${progressPercent > 100 ? "bg-rose-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}
      </div>

      {/* Log Form */}
      <form onSubmit={handleSubmit} className={`p-4 rounded-xl border bg-gray-50 border-border`}>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Log New Time
        </h4>
        <div className="flex gap-2 mb-3">
          <AppInput 
            type="number" 
            step="0.1" 
            min="0"
            required 
            placeholder="Hours" 
            value={hours} 
            onChange={e => setHours(e.target.value)} 
            className={`w-24 ${"bg-surface"}`}
          />
          <AppInput 
            required 
            placeholder="What did you work on?" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className={`flex-1 ${"bg-surface"}`}
          />
        </div>
        <AppButton type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-9">
          {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> Save Log</>}
        </AppButton>
      </form>

      {/* Log History */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">History</h4>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No time logged yet.</p>
        ) : (
          logs.slice().reverse().map(log => (
            <div key={log.id} className={`p-3 rounded-lg border text-sm flex gap-3 border-border bg-white`}>
              <div className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400 w-12">{log.hours}h</div>
              <div className="flex-1 min-w-0">
                <p className={`truncate text-foreground`}>{log.description}</p>
                <p className="text-[10px] text-gray-500 mt-1">{new Date(log.logged_at).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

