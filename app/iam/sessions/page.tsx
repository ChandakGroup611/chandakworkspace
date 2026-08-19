"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppTable, AppTableContainer, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { Shield, MonitorSmartphone, WifiOff, Globe, Loader2, Search, ShieldX } from "lucide-react";
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
          <div className="relative w-72 group animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-surface/60 border border-border/40 rounded-xl flex items-center shadow-sm transition-all duration-300 group-focus-within:border-accent/50 group-focus-within:bg-surface/90">
              <Search className="w-4 h-4 ml-3 text-muted group-focus-within:text-accent transition-colors duration-300" />
              <input 
                type="text" 
                placeholder="Search users or IP..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-2 pr-4 py-2 bg-transparent text-sm placeholder:text-muted/70 focus:outline-none focus:ring-0 text-foreground"
              />
            </div>
          </div>
        }
      />

      <div className="mt-6 flex-1 min-h-0 flex flex-col h-[calc(100vh-200px)]">
        <AppTableContainer className="flex-1 overflow-y-auto bg-surface/40 rounded-2xl border border-border/30 shadow-sm">
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
                [...Array(5)].map((_, i) => (
                  <AppTableRow key={`skeleton-${i}`} className="animate-pulse border-b border-border/20">
                    <AppTableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-border/40" />
                        <div className="space-y-2">
                          <div className="h-3 w-24 bg-border/40 rounded-full" />
                          <div className="h-2 w-32 bg-border/30 rounded-full" />
                        </div>
                      </div>
                    </AppTableCell>
                    <AppTableCell><div className="h-3 w-20 bg-border/40 rounded-full" /></AppTableCell>
                    <AppTableCell><div className="h-3 w-32 bg-border/40 rounded-full" /></AppTableCell>
                    <AppTableCell><div className="h-3 w-24 bg-border/40 rounded-full" /></AppTableCell>
                    <AppTableCell><div className="h-3 w-16 bg-border/40 rounded-full" /></AppTableCell>
                    <AppTableCell className="text-right"><div className="h-8 w-24 bg-border/40 rounded-lg ml-auto" /></AppTableCell>
                  </AppTableRow>
                ))
              ) : filteredSessions.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={6} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in-95 duration-500">
                      <div className="w-14 h-14 rounded-2xl bg-surface/80 border border-border/40 flex items-center justify-center shadow-sm">
                        <ShieldX className="w-7 h-7 text-muted" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">No active sessions found</h3>
                        <p className="text-xs text-muted mt-1 max-w-sm">There are currently no active sessions matching your search criteria.</p>
                      </div>
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ) : (
                filteredSessions.map(session => (
                  <AppTableRow key={session.id} className="hover:bg-surface/50 transition-colors duration-200">
                    <AppTableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs shadow-[inset_0_0_8px_rgba(var(--color-accent),0.2)]">
                          {session.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm tracking-tight">{session.user?.full_name || 'Unknown User'}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted font-mono">{session.user?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-muted" />
                        <span className="font-mono text-xs">{session.ip_address || 'Unknown'}</span>
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex items-center gap-2">
                        <MonitorSmartphone className="w-3.5 h-3.5 text-muted" />
                        <span className="text-xs text-subtle dark:text-muted max-w-[200px] truncate" title={session.user_agent}>
                          {session.user_agent || 'Unknown Device'}
                        </span>
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="text-xs text-subtle dark:text-muted">
                        {new Date(session.login_time).toLocaleString()}
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="text-xs font-medium text-success dark:text-success">
                        {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                      </div>
                    </AppTableCell>
                    <AppTableCell className="text-right">
                      <AppButton 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleKillSession(session.id)}
                        disabled={processingId === session.id}
                        className="text-danger border-danger/20 hover:bg-danger/10 hover:border-danger/40 transition-all shadow-sm rounded-lg"
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
