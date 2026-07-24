"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppTable, AppTableContainer, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { Shield, MonitorSmartphone, WifiOff, Globe, Loader2, Search } from "lucide-react";
import { fetchActiveSessions, killSession } from "@/lib/actions/iam";
import { toast } from "react-toastify";
import { formatDistanceToNow } from "date-fns";

export default function SessionManagement() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchActiveSessions();
      setSessions(data);
    } catch (err) {
      toast.error("Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleKillSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to terminate this session? The user will be logged out immediately.")) return;
    setProcessingId(sessionId);
    try {
      await killSession(sessionId);
      toast.success("Session terminated successfully");
      await loadSessions();
    } catch (err: any) {
      toast.error(err.message || "Failed to terminate session");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSessions = sessions.filter(s => {
    const q = search.toLowerCase();
    return s.user?.full_name?.toLowerCase().includes(q) || 
           s.user?.email?.toLowerCase().includes(q) || 
           s.ip_address?.toLowerCase().includes(q);
  });

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Active Sessions"
        description="Monitor and manage active user sessions across the platform."
        badge={<AppBadge variant="info">Governance</AppBadge>}
        actions={
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users or IP..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface dark:bg-[#0B0F19] border border-border rounded-lg text-sm focus:ring-accent outline-none"
            />
          </div>
        }
      />

      <div className="mt-6 flex-1 min-h-0 flex flex-col h-[calc(100vh-200px)]">
        <AppTableContainer className="flex-1 overflow-y-auto bg-surface dark:bg-[#0B0F19] rounded-2xl border border-border shadow-sm">
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>User</AppTableHead>
                <AppTableHead>IP Address</AppTableHead>
                <AppTableHead>Device & Browser</AppTableHead>
                <AppTableHead>Started</AppTableHead>
                <AppTableHead>Last Activity</AppTableHead>
                <AppTableHead className="text-right">Actions</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {loading ? (
                <AppTableRow>
                  <AppTableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                    <p className="text-gray-500 mt-2">Loading active sessions...</p>
                  </AppTableCell>
                </AppTableRow>
              ) : filteredSessions.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No active sessions found matching your criteria.
                  </AppTableCell>
                </AppTableRow>
              ) : (
                filteredSessions.map(session => (
                  <AppTableRow key={session.id} className="hover:bg-gray-50 dark:hover:bg-surface/[0.02]">
                    <AppTableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                          {session.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{session.user?.full_name || 'Unknown User'}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{session.user?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono text-xs">{session.ip_address || 'Unknown'}</span>
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex items-center gap-2">
                        <MonitorSmartphone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[200px] truncate" title={session.user_agent}>
                          {session.user_agent || 'Unknown Device'}
                        </span>
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        {new Date(session.login_time).toLocaleString()}
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                      </div>
                    </AppTableCell>
                    <AppTableCell className="text-right">
                      <AppButton 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleKillSession(session.id)}
                        disabled={processingId === session.id}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/10 dark:text-red-400"
                        leftIcon={processingId === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WifiOff className="w-3.5 h-3.5" />}
                      >
                        {processingId === session.id ? "Terminating..." : "Kill Session"}
                      </AppButton>
                    </AppTableCell>
                  </AppTableRow>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableContainer>
      </div>
    </PageContainer>
  );
}
