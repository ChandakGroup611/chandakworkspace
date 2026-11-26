"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";
import { 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Zap, 
  Users, 
  RefreshCw,
  BellRing,
  Eye,
  Edit2,
  Trash2
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatTile, StatTileRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import { cn } from "@/lib/utils";

interface SLATracker {
  id: string;
  displayId?: string;
  targetEntity: string;
  type: string;
  module: "TICKET" | "TASK" | "REQUIREMENT";
  entityId: string;
  allocatedWindow: string;
  elapsedTime: string;
  status: "Healthy" | "Warning" | "Breached";
  escalationTier: "Level 1" | "Level 2" | "Level 3" | "Level 4";
  actionRecipient: string;
}

export default function SLAPage() {
  const { hasPermission, roleCode } = usePermissions();
  const canView = roleCode === "SUPER_ADMIN" || hasPermission("SLA_VIEW");

  const { isLight: isLightMode } = useTheme();
  
  const [slas, setSlas] = useState<SLATracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'ESCALATED'>('ALL');
  const [moduleFilter, setModuleFilter] = useState<'ALL' | 'TICKET' | 'TASK' | 'REQUIREMENT'>('ALL');

  const fetchSlas = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sla');
      const data = await res.json();
      if (data.slas) {
        setSlas(data.slas);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlas();
  }, []);

  const totalRecords = slas.length;
  const upcomingRecords = slas.filter(s => s.status === 'Warning').length;
  const escalatedRecords = slas.filter(s => s.status === 'Breached').length;

  const filteredSlas = slas.filter(s => {
    if (filter === 'UPCOMING' && s.status !== 'Warning') return false;
    if (filter === 'ESCALATED' && s.status !== 'Breached') return false;
    
    if (moduleFilter !== 'ALL' && s.module !== moduleFilter) return false;
    
    return true;
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshLiveTracking = async () => {
    setIsRefreshing(true);
    await fetchSlas();
    setIsRefreshing(false);
  };

  const overrideBreach = async (id: string) => {
    // In a real app this would call an API to pause/delete the SLA tracker
    setSlas(slas.map(s => s.id === id ? { ...s, status: "Healthy", escalationTier: "Level 1", elapsedTime: "Reset via manual override" } : s));
  };

  const levels = [
    { level: "Level 1", action: "The assignee sees a warning on the record", scope: "Assignee" },
    { level: "Level 2", action: "Their manager is notified", scope: "Manager" },
    { level: "Level 3", action: "The department head is notified", scope: "Department" },
    { level: "Level 4", action: "Leadership sees it on the breach dashboard", scope: "Leadership" },
  ];

  const SEG_ON = "bg-surface text-foreground font-semibold shadow-sm";
  const SEG_OFF = "text-muted hover:text-foreground";
  const SEG_BTN = "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors";
  const MODULES = [
    { id: 'ALL', label: 'All modules' },
    { id: 'TICKET', label: 'Tickets' },
    { id: 'TASK', label: 'Tasks' },
    { id: 'REQUIREMENT', label: 'Requirements' },
  ] as const;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="SLA tracking"
        description="Response and resolution timers for open tickets, tasks and requirements."
        actions={
          <AppButton
            variant="secondary"
            size="sm"
            onClick={refreshLiveTracking}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </AppButton>
        }
      />

      <StatTileRow>
        <StatTile label="All timers" value={loading ? '—' : totalRecords} tone="neutral" icon={<Clock className="h-4 w-4" />} selected={filter === 'ALL'} onSelect={() => setFilter('ALL')} />
        <StatTile label="Due soon" value={loading ? '—' : upcomingRecords} tone="warning" icon={<AlertTriangle className="h-4 w-4" />} selected={filter === 'UPCOMING'} onSelect={() => setFilter('UPCOMING')} />
        <StatTile label="Breached" value={loading ? '—' : escalatedRecords} tone="danger" icon={<Flame className="h-4 w-4" />} selected={filter === 'ESCALATED'} onSelect={() => setFilter('ESCALATED')} />
      </StatTileRow>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col lg:col-span-2">
          <AppCard className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-[14px] font-semibold text-heading">Active timers</h2>
                <p className="text-[12.5px] text-muted">
                  {escalatedRecords > 0 ? `${escalatedRecords} breached` : "Nothing breached"}
                  {upcomingRecords > 0 ? ` · ${upcomingRecords} due soon` : ""}
                </p>
              </div>
              <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-sunken p-0.5 no-scrollbar" role="radiogroup" aria-label="Module">
                {MODULES.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={moduleFilter === m.id} onClick={() => setModuleFilter(m.id)} className={cn(SEG_BTN, moduleFilter === m.id ? SEG_ON : SEG_OFF)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              {loading ? (
                <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading timers">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-sunken" />)}
                </div>
              ) : filteredSlas.length === 0 ? (
                <EmptyState
                  kind={slas.length === 0 ? "empty" : "no-results"}
                  compact
                  title={slas.length === 0 ? "No active SLA timers" : "No timers match these filters"}
                  description={slas.length === 0 ? "Timers appear here when a ticket, task or requirement with an SLA rule is open." : "Try another module or select All timers."}
                  action={slas.length === 0 ? undefined : <AppButton variant="secondary" size="sm" onClick={() => { setFilter('ALL'); setModuleFilter('ALL'); }}>Clear filters</AppButton>}
                />
              ) : (
              <AppTableContainer className="rounded-none border-0">
                <AppTable cardsOnPhone>
                  <AppTableHeader>
                    <tr>
                      <AppTableHead>Record</AppTableHead>
                      <AppTableHead>Target and elapsed</AppTableHead>
                      <AppTableHead>Status</AppTableHead>
                      <AppTableHead className="text-right">Actions</AppTableHead>
                    </tr>
                  </AppTableHeader>
                  <AppTableBody>
                    {filteredSlas.map((item) => {
                      return (
                        <AppTableRow key={item.id}>
                          <AppTableCell>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{item.displayId || item.id}</span>
                                <AppBadge variant="neutral">{item.module === "TICKET" ? "Ticket" : item.module === "TASK" ? "Task" : "Requirement"}</AppBadge>
                              </div>
                              <span className="block max-w-[260px] truncate text-[13.5px] text-foreground" title={item.targetEntity}>{item.targetEntity}</span>
                              <span className="block text-[12.5px] text-muted">{item.type}</span>
                            </div>
                          </AppTableCell>
                          <AppTableCell>
                            <div className="space-y-0.5">
                              <span className="block text-[13.5px] text-foreground">{item.allocatedWindow}</span>
                              <span className={cn("block text-[12.5px] tabular-nums", item.status === "Breached" ? "font-medium text-danger-text" : item.status === "Warning" ? "text-warning-text" : "text-muted")}>{item.elapsedTime}</span>
                            </div>
                          </AppTableCell>
                          <AppTableCell>
                            <div className="space-y-1">
                              <AppBadge 
                                variant={item.status === "Healthy" ? "success" : item.status === "Warning" ? "warning" : "danger"}
                              >
                                {item.status === "Healthy" ? "On track" : item.status === "Warning" ? "Due soon" : "Breached"}
                              </AppBadge>
                              <span className="block text-[12.5px] text-muted">{item.escalationTier}{item.actionRecipient ? ` · ${item.actionRecipient}` : ""}</span>
                            </div>
                          </AppTableCell>
                          <AppTableCell className="text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <AppButton aria-label="Open record" 
                                  variant="ghost" 
                                  size="icon-sm" 
                                  className="text-muted hover:text-foreground" 
                                  title="Open record"
                                  onClick={() => {
                                    let url = "";
                                    if (item.module === "TICKET") url = `/tickets/${item.entityId}`;
                                    else if (item.module === "TASK") url = `/tasks/${item.entityId}`;
                                    else if (item.module === "REQUIREMENT") url = `/requirements/${item.entityId}`;
                                    if (url) window.location.href = url;
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </AppButton>
                                {(roleCode === "SUPER_ADMIN" || hasPermission("SLA_UPDATE")) && (
                                  <AppButton aria-label="Edit SLA rules" variant="ghost" size="icon-sm" onClick={() => { window.location.href = '/sla/rules'; }} className="text-muted hover:text-foreground" title="Edit SLA rules">
                                    <Edit2 className="h-4 w-4" />
                                  </AppButton>
                                )}
                                {(roleCode === "SUPER_ADMIN" || hasPermission("SLA_DELETE")) && (
                                  <AppButton aria-label="Reset alert on this screen (not saved)" variant="ghost" size="icon-sm" onClick={() => overrideBreach(item.id)} className="text-muted hover:bg-danger-soft hover:text-danger-text" title="Reset alert on this screen (not saved)">
                                    <Trash2 className="h-4 w-4" />
                                  </AppButton>
                                )}
                              </div>
                          </AppTableCell>
                        </AppTableRow>
                      );
                    })}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-sunken px-4 py-2.5 text-[12.5px] text-muted">
              <span>Showing {filteredSlas.length} of {totalRecords}</span>
              <button type="button" className="font-medium text-accent-soft-text hover:underline" onClick={refreshLiveTracking}>Refresh now</button>
            </div>
          </AppCard>
        </div>

        <div className="space-y-5">
          <AppCard className="space-y-3 p-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <BellRing className="h-4 w-4 text-muted" aria-hidden />
              <h2 className="text-[14px] font-semibold text-heading">How escalation works</h2>
            </div>

            <ol className="space-y-2">
              {levels.map((lvl, idx) => (
                <li key={idx} className="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-semibold tabular-nums text-subtle">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-foreground">{lvl.level}</span>
                      <span className="text-[12px] text-muted">{lvl.scope}</span>
                    </div>
                    <p className="text-[12.5px] text-muted">{lvl.action}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-[12.5px] text-muted">
              Each level is added on top of the previous one, so earlier notifications keep going.
            </p>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
