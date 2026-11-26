"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AppCard } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { AppButton } from "@/components/ui/AppButton";
import { formatDateTime } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";

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
      case 'DELIVERED': return <CheckCircle className="w-4 h-4 text-success-text" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-danger-text" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-warning-text" />;
      default: return <Clock className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <AppCard className="flex justify-between items-center p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Transmission logs</h2>
          </div>
        <AppButton aria-label="Refresh"
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
          <AppTable cardsOnPhone>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Timestamp</AppTableHead>
                <AppTableHead>Trigger event</AppTableHead>
                <AppTableHead>Recipient</AppTableHead>
                <AppTableHead>Gateway</AppTableHead>
                <AppTableHead>Status</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {logs.map((log) => (
                <AppTableRow key={log.id}>
                  <AppTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.recorded_at)}
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
                  <AppTableCell className="font-mono text-accent-soft-text">
                    {log.recipient_email}
                  </AppTableCell>
                  <AppTableCell className="text-xs text-muted-foreground">
                    {log.email_providers?.provider_name || 'System Default'}
                  </AppTableCell>
                  <AppTableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="text-xs font-semibold text-foreground">{log.status}</span>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ))}
              {logs.length === 0 && !loading && (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="p-0">
                    <EmptyState compact kind="empty" title="No delivery logs yet" description="Emails and notifications sent by the system appear here." />
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
