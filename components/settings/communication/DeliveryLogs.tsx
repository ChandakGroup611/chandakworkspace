"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function DeliveryLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_delivery_logs")
        .select(`
          *,
          email_queue (
            module,
            event,
            subject
          ),
          email_providers (
            provider_name
          )
        `)
        .order("recorded_at", { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-amber-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[#0A0D14] border border-white/10 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white">Transmission Logs</h2>
          <p className="text-xs text-gray-400">View recent async email dispatch attempts and delivery receipts.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-[#121620] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Trigger Event</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Recipient</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Gateway</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.recorded_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">
                        {log.email_queue?.module} - {log.email_queue?.event}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">
                        {log.email_queue?.subject}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-blue-400">
                    {log.recipient_email}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {log.email_providers?.provider_name || 'System Default'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="text-xs font-bold text-gray-300">{log.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No delivery logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
