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
    { level: "Level 1", action: "Agent warning inline tooltip trigger", scope: "Local UI" },
    { level: "Level 2", action: "Manager high priority webhook notification", scope: "Departmental" },
    { level: "Level 3", action: "Department routing escalation chain trigger", scope: "Multi-Team" },
    { level: "Level 4", action: "Executive global operational state breach heatmap", scope: "Global Master" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-400 w-full transition-colors duration-300">
      {/* SLA Module Title Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b ${"border-border"}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-bold tracking-tight ${"text-foreground"}`}>SLA governance & surveillance engine</h1>
            <AppBadge variant="danger">Realtime tracking</AppBadge>
          </div>
          <p className="text-xs text-muted">
            Continuous timeout computation monitoring active workflow tuples to enforce multi-level escalation routing protocols.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`hidden sm:flex p-1 rounded-md border bg-elevated border-border`}>
            <AppButton variant="secondary"
              onClick={() => setModuleFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${moduleFilter === 'ALL' ? 'bg-background shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
            >
              All modules
            </AppButton>
            <AppButton variant="secondary"
              onClick={() => setModuleFilter('TICKET')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${moduleFilter === 'TICKET' ? 'bg-background shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
            >
              Tickets
            </AppButton>
            <AppButton variant="secondary"
              onClick={() => setModuleFilter('TASK')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${moduleFilter === 'TASK' ? 'bg-background shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
            >
              Tasks
            </AppButton>
            <AppButton variant="secondary"
              onClick={() => setModuleFilter('REQUIREMENT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${moduleFilter === 'REQUIREMENT' ? 'bg-background shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
            >
              Requirements
            </AppButton>
          </div>

          <AppButton 
            variant="secondary" 
            size="sm" 
            onClick={refreshLiveTracking}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            className="bg-surface border-border text-foreground shadow-sm"
          >
            Refresh live tracking
          </AppButton>
        </div>
      </div>
      {/* Interactive SLA Governance Heatmap Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <AppCard 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${filter === 'ALL' ? 'ring-2 ring-theme-btn-primary' : 'hover:bg-surface/50 dark:hover:bg-surface/5'} bg-surface`}
          onClick={() => setFilter('ALL')}
        >
          <AppCardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-muted mb-1">Total records</span>
            <span className="text-3xl font-bold text-theme-icon dark:text-theme-icon">
              {loading ? '-' : <AnimatedCounter value={totalRecords} />}
            </span>
          </AppCardContent>
        </AppCard>

        <AppCard 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${filter === 'UPCOMING' ? 'ring-2 ring-warning' : 'hover:bg-warning-soft/50 dark:hover:bg-warning/10'} bg-surface`}
          onClick={() => setFilter('UPCOMING')}
        >
          <AppCardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-muted mb-1 flex items-center gap-1.5"><Clock className="h-4 w-4" /> Upcoming</span>
            <span className="text-3xl font-bold text-warning">
              {loading ? '-' : <AnimatedCounter value={upcomingRecords} />}
            </span>
          </AppCardContent>
        </AppCard>

        <AppCard 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${filter === 'ESCALATED' ? 'ring-2 ring-danger' : 'hover:bg-danger-soft/50 dark:hover:bg-danger/10'} bg-surface`}
          onClick={() => setFilter('ESCALATED')}
        >
          <AppCardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-muted mb-1 flex items-center gap-1.5"><Flame className="h-4 w-4" /> Escalated</span>
            <span className="text-3xl font-bold text-danger dark:text-danger">
              {loading ? '-' : <AnimatedCounter value={escalatedRecords} />}
            </span>
          </AppCardContent>
        </AppCard>
      </div>
      {/* Primary Orchestration Column Layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Span 2: Active Timers & Escalation Targets Matrix */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <AppCard className="flex-1 flex flex-col justify-between overflow-hidden">
            <AppCardHeader className={`flex flex-row items-center justify-between pb-3 border-b border-border bg-elevated/50`}>
              <div className="space-y-0.5">
                <AppCardTitle className={`flex items-center gap-2 text-danger`}>
                  <ShieldAlert className="h-4 w-4" />
                  <span>Monitored operational timeouts</span>
                </AppCardTitle>
                <p className="text-[0.8rem] text-muted">Reactive task timers updating background worker task queue parameters.</p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border inline-flex items-center gap-1.5 bg-danger-soft text-danger border-danger/20">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
                Breach Count: {escalatedRecords}
              </span>
            </AppCardHeader>

            <div className="p-4 flex-1">
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <tr>
                      <AppTableHead>SLA target</AppTableHead>
                      <AppTableHead>Interval window</AppTableHead>
                      <AppTableHead>Escalation state</AppTableHead>
                      <AppTableHead className="text-right">Action gate</AppTableHead>
                    </tr>
                  </AppTableHeader>
                  <AppTableBody>
                    {filteredSlas.map((item, index) => {
                      const staggerClass = index < 8 ? `delay-${index + 1}` : "";
                      return (
                        <AppTableRow key={item.id} className={`hover:bg-elevated transition-colors animate-stagger-in ${staggerClass}`}>
                          <AppTableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-xs font-bold text-theme-icon`}>{item.displayId || item.id}</span>
                                <AppBadge variant="neutral" className="text-[0.65rem] py-0">{item.module}</AppBadge>
                              </div>
                              <span className="text-[0.8rem] text-muted block truncate max-w-[150px]">{item.targetEntity}</span>
                              <span className={`text-xs font-semibold text-theme-icon`}>{item.type}</span>
                            </div>
                          </AppTableCell>
                          <AppTableCell>
                            <div className="space-y-0.5 text-xs">
                              <span className={`${"text-foreground"} font-medium block`}>{item.allocatedWindow}</span>
                              <span className={`text-[0.8rem] font-mono block text-warning font-semibold`}>{item.elapsedTime}</span>
                            </div>
                          </AppTableCell>
                          <AppTableCell>
                            <div className="space-y-1">
                              <AppBadge 
                                variant={item.status === "Healthy" ? "success" : item.status === "Warning" ? "warning" : "danger"}
                                withPulse={item.status === "Breached" || item.status === "Warning"}
                              >
                                {item.status}
                              </AppBadge>
                              <span className="text-xs text-muted block font-medium">{item.escalationTier}</span>
                            </div>
                          </AppTableCell>
                          <AppTableCell className="text-right">
                            <div className="space-y-1 flex flex-col items-end">
                              <span className="text-xs text-muted italic block truncate max-w-[120px]">{item.actionRecipient}</span>
                              <div className="flex items-center gap-1 mt-1 justify-end">
                                <AppButton aria-label="View record" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 text-theme-icon hover:bg-accent-soft rounded-lg transition-all" 
                                  title="View record"
                                  onClick={() => {
                                    let url = "";
                                    if (item.module === "TICKET") url = `/tickets/${item.entityId}`;
                                    else if (item.module === "TASK") url = `/tasks/${item.entityId}`;
                                    else if (item.module === "REQUIREMENT") url = `/requirements/${item.entityId}`;
                                    if (url) window.location.href = url;
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </AppButton>
                                {(roleCode === "SUPER_ADMIN" || hasPermission("SLA_UPDATE")) && (
                                  <AppButton aria-label="Update thresholds / configure SLA rules" variant="ghost" size="sm" onClick={() => { window.location.href = '/sla/rules'; }} className="h-6 w-6 p-0 text-warning hover:bg-warning/10 rounded-lg transition-all" title="Update thresholds / configure SLA rules">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </AppButton>
                                )}
                                {(roleCode === "SUPER_ADMIN" || hasPermission("SLA_DELETE")) && (
                                  <AppButton aria-label="Delete / override alert" variant="ghost" size="sm" onClick={() => overrideBreach(item.id)} className="h-6 w-6 p-0 text-danger hover:bg-danger/10 rounded-lg transition-all" title="Delete / override alert">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </AppButton>
                                )}
                              </div>
                            </div>
                          </AppTableCell>
                        </AppTableRow>
                      );
                    })}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </div>

            <div className={`p-4 border-t text-[0.8rem] text-muted flex items-center justify-between bg-elevated border-border`}>
              <span>Real-time SLA tracking</span>
              <button type="button" className="cursor-pointer hover:underline text-danger font-semibold" onClick={refreshLiveTracking}>Force Re-sync</button>
            </div>
          </AppCard>
        </div>

        {/* Right Span 1: Multi-Level Escalation Routing Architecture */}
        <div className="space-y-6">
          <AppCard className="p-5 space-y-4">
            <div className={`pb-2 border-b ${"border-border"}`}>
              <span className="text-xs font-semibold flex items-center gap-2 text-muted">
                <BellRing className={`h-3.5 w-3.5 text-warning`} />
                <span>Escalation level routing matrix</span>
              </span>
            </div>

            <div className="space-y-3">
              {levels.map((lvl, idx) => (
                <div key={idx} className={`p-3 rounded-xl border space-y-1 relative overflow-hidden ${
                  "bg-elevated border-border"
                }`}>
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-warning to-danger opacity-60" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{lvl.level}</span>
                    <span className="text-[0.7rem] px-1.5 py-0.2 rounded font-medium border bg-surface text-muted border-border">
                      {lvl.scope}
                    </span>
                  </div>
                  <p className="text-xs text-muted font-medium">{lvl.action}</p>
                </div>
              ))}
            </div>

            <div className={`pt-2 border-t text-center ${"border-border"}`}>
              <span className="text-xs text-muted italic">
                Higher level breaches instantly stack downstream action notifications automatically.
              </span>
            </div>
          </AppCard>

          {/* Operational Trust Advisory Card */}
          <AppCard className="p-5 space-y-2 border bg-success-soft border-success/20">
            <span className="text-xs font-semibold block text-success">
              SLA trust assurance
            </span>
            <p className="text-xs text-muted leading-relaxed">
              Zero ticket leakage past allocated thresholds without strict activity entry logs appended to master audit trails.
            </p>
          </AppCard>
        </div>
      </div>
    </div>
  );
}

