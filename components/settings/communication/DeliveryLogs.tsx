"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AppCard } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { AppButton } from "@/components/ui/AppButton";

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
      <AppCard className="flex justify-between items-center p-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Transmission Logs</h2>
          <p className="text-xs text-muted-foreground">View recent async email dispatch attempts and delivery receipts.</p>
        </div>
        <AppButton
          onClick={fetchLogs}
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </AppButton>
      </AppCard>

      <AppCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Timestamp</AppTableHead>
                <AppTableHead>Trigger Event</AppTableHead>
                <AppTableHead>Recipient</AppTableHead>
                <AppTableHead>Gateway</AppTableHead>
                <AppTableHead>Status</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {logs.map((log) => (
                <AppTableRow key={log.id}>
                  <AppTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.recorded_at).toLocaleString()}
                  </AppTableCell>
                  <AppTableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {log.email_queue?.module} - {log.email_queue?.event}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {log.email_queue?.subject}
                      </span>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="font-mono text-blue-500">
                    {log.recipient_email}
                  </AppTableCell>
                  <AppTableCell className="text-xs text-muted-foreground">
                    {log.email_providers?.provider_name || 'System Default'}
                  </AppTableCell>
                  <AppTableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="text-xs font-bold text-foreground">{log.status}</span>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ))}
              {logs.length === 0 && !loading && (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No delivery logs found.
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </AppCard>
    </div>
  );
}
