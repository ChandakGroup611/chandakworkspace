"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Activity, Clock, CheckSquare, Edit, MessageSquare, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function TaskActivityTimeline({ taskId }: { taskId: string }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  const supabase = createClient();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const [logsRes, statusRes] = await Promise.all([
        supabase
          .from("task_activity_logs")
          .select("*, actor:user_master!actor_id(full_name)")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false }),
        supabase.from("status_master").select("id, status_name")
      ]);
        
      if (logsRes.error) {
        console.error("Error fetching task activity logs:", logsRes.error);
      }
      if (logsRes.data) setLogs(logsRes.data);
      if (statusRes.data) setStatuses(statusRes.data);
      setLoading(false);
    }
    fetchLogs();
  }, [taskId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'STATUS_CHANGE': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'DEPARTMENT_CHANGE': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'CHECKLIST_UPDATE': return <CheckSquare className="h-4 w-4 text-emerald-500" />;
      case 'COMMENT': return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case 'EDIT': return <Edit className="h-4 w-4 text-amber-500" />;
      case 'CREATE': return <Activity className="h-4 w-4 text-purple-500" />;
      case 'DELETE': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'RESTORE': return <Activity className="h-4 w-4 text-emerald-500" />;
      case 'ASSIGNMENT_CHANGE': return <Edit className="h-4 w-4 text-emerald-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionText = (log: any) => {
    switch (log.action) {
      case 'STATUS_CHANGE': {
        const getStatusName = (id: string) => statuses.find((s) => s.id === id)?.status_name;
        const statusName = log.new_state?.status_name || log.new_state?.status || getStatusName(log.new_state?.status_id) || 'Unknown';
        const oldStatusName = log.new_state?.old_status_name || log.new_state?.old_status || getStatusName(log.old_state?.status_id) || '';
        if (oldStatusName) {
          return `transitioned status from "${oldStatusName}" to "${statusName}"`;
        }
        return `changed status to "${statusName}"`;
      }
      case 'DEPARTMENT_CHANGE': {
        const oldDeptName = log.new_state?.old_department_name || 'None';
        const newDeptName = log.new_state?.department_name || 'None';
        return `Change department from ${oldDeptName} to ${newDeptName}`;
      }
      case 'CHECKLIST_UPDATE':
        return 'updated the task checklist';
      case 'COMMENT':
        return 'added an update comment / remarks';
      case 'CREATE':
        return 'created the task';
      case 'DELETE':
        return 'deleted the task';
      case 'RESTORE':
        return 'restored the task';
      case 'UPDATE':
        return 'updated the task details';
      case 'ASSIGNMENT_CHANGE':
        return `changed the Executors to: ${log.new_state?.executors_text || 'Unknown'}`;
      default:
        return `performed action: ${log.action.toLowerCase()}`;
    }
  };

  return (
    <AppCard className={`p-5 space-y-4 border-smooth ${isLightMode ? "bg-white shadow-sm" : "bg-elevated"}`}>
      <div className="flex items-center gap-2 border-b pb-3 mb-4 border-gray-200 dark:border-white/5">
        <Clock className={`h-4 w-4 ${isLightMode ? "text-purple-600" : "text-purple-400"}`} />
        <h3 className={`text-sm font-bold tracking-tight ${"text-foreground"}`}>Activity Timeline</h3>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-500 animate-pulse">Loading timeline...</div>
      ) : (
        <div className="relative border-l border-gray-200 dark:border-white/10 ml-3 space-y-6">
          {logs.map((log, idx) => (
            <div key={log.id || idx} className="relative pl-6 animate-in fade-in slide-in-from-bottom-2">
              <span className={`absolute -left-3.5 top-0.5 h-7 w-7 rounded-full border-4 flex items-center justify-center ${
                isLightMode ? "bg-white border-white shadow-sm" : "bg-[#0a0c16] border-[#0a0c16]"
              }`}>
                {getActionIcon(log.action)}
              </span>
              <div className={`p-3 rounded-xl border ${
                isLightMode ? "bg-gray-50/50 border-gray-100" : "bg-white/[0.02] border-white/5"
              }`}>
                <p className={`text-xs ${isLightMode ? "text-gray-800" : "text-gray-300"}`}>
                  <strong className={isLightMode ? "text-indigo-700" : "text-indigo-400"}>
                    {log.actor?.full_name || 'System Administrator'}
                  </strong> {getActionText(log)}
                </p>
                {log.action === 'COMMENT' && log.new_state?.message && (
                  <div className={`mt-2 p-2 rounded-md border text-xs whitespace-pre-wrap ${
                    isLightMode ? "bg-white border-gray-200 text-gray-600" : "bg-black/50 border-white/5 text-gray-400"
                  }`}>
                    {log.new_state.message}
                  </div>
                )}
                <span className="text-xs text-gray-500 font-mono mt-1 block">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {logs.length === 0 && !loading && (
            <div className="text-center py-6 text-xs text-gray-500 italic">
              No activity found for this task yet.
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}
