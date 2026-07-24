"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Clock, User, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";


export function AMCHistoryModal({
  amcId,
  onClose,
  isLightMode
}: {
  amcId: string;
  onClose: () => void;
  isLightMode: boolean;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchHistory();
  }, [amcId]);

  const fetchHistory = async () => {
    setLoading(true);
    // Fetch logs
    const { data: logData, error } = await supabase
      .from("software_amc_audit_logs")
      .select("*")
      .eq("amc_id", amcId)
      .order("created_at", { ascending: false });

    if (!error && logData) {
      // Extract unique actor IDs
      const actorIds = Array.from(new Set(logData.map(l => l.actor_id).filter(Boolean)));
      let userMap: Record<string, string> = {};
      
      if (actorIds.length > 0) {
        const { data: userData } = await supabase
          .from("user_master")
          .select("id, full_name")
          .in("id", actorIds);
          
        if (userData) {
          userMap = userData.reduce((acc: any, user: any) => {
            acc[user.id] = user.full_name;
            return acc;
          }, {});
        }
      }

      // Merge user names
      const enrichedLogs = logData.map(log => ({
        ...log,
        actor: { full_name: log.actor_id ? (userMap[log.actor_id] || "Unknown User") : "System Process" }
      }));
      setLogs(enrichedLogs);
    } else if (error) {
      console.error("Failed to fetch AMC history:", error);
    }
    setLoading(false);
  };

  const getOperationColor = (op: string) => {
    switch (op) {
      case "INSERT": return "text-green-500 bg-green-500/10";
      case "UPDATE": return "text-accent bg-accent/10";
      case "DELETE": return "text-red-500 bg-red-500/10";
      default: return "text-gray-500 bg-gray-500/10";
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${ "theme-card-structural " } border`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b shrink-0 border-border bg-elevated`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-surface shadow-sm`}>
              <Clock className={`h-5 w-5 text-accent`} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Audit History</h2>
              <p className="text-xs text-gray-500">Immutable changelog for this record</p>
            </div>
          </div>
          <AppButton variant="destructive" onClick={onClose} className="p-2 rounded-full hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors">
            <X className="h-5 w-5" />
          </AppButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-accent" />
              <p>Loading audit trail...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
              <Clock className="h-12 w-12 opacity-20" />
              <p>No history available for this record yet.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-4 space-y-8">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline Node */}
                  <div className={`absolute -left-[11px] top-1 h-5 w-5 rounded-full border-4 theme-card-structural`} />
                  
                  <div className={`p-4 rounded-xl border bg-surface shadow-sm border-border`}>
                    
                    <div className="flex items-center justify-between mb-3 border-b border-gray-200/20 pb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${getOperationColor(log.operation)}`}>
                          {log.operation}
                        </span>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <User className="h-3.5 w-3.5" />
                          <span>{log.actor?.full_name || 'System / Unknown'}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium bg-gray-500/10 px-2 py-1 rounded">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Diff Viewer for Updates */}
                    {log.operation === 'UPDATE' && log.before_values && log.after_values && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Changes Detected</p>
                        <div className="space-y-2">
                          {Object.keys(log.after_values).map((key) => {
                            const before = log.before_values[key];
                            const after = log.after_values[key];
                            // Skip unchanged fields, noise, and complex JSON dumps for now
                            if (JSON.stringify(before) === JSON.stringify(after)) return null;
                            if (['updated_at', 'created_at'].includes(key)) return null;
                            if (typeof after === 'object') return null; // Simplify object diffs

                            return (
                              <div key={key} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm border bg-gray-50 border-border`}>
                                <span className="font-mono text-xs w-1/3 truncate text-gray-500">{key}</span>
                                <div className="flex-1 flex items-center gap-3 truncate">
                                  <span className="truncate text-red-500/80 line-through opacity-80 max-w-[40%]">{String(before || 'null')}</span>
                                  <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate text-green-500 font-medium max-w-[40%]">{String(after || 'null')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {log.operation === 'INSERT' && (
                       <p className="text-sm text-gray-500">Record created with initial values.</p>
                    )}

                    {log.operation === 'DELETE' && (
                       <p className="text-sm text-red-400">Record was deleted.</p>
                    )}

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
