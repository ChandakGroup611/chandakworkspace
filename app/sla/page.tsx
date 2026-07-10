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

interface SLATracker {
  id: string;
  displayId?: string;
  targetEntity: string;
  type: "First Response" | "Resolution SLA" | "Escalation SLA";
  allocatedWindow: string;
  elapsedTime: string;
  status: "Healthy" | "Warning" | "Breached";
  escalationTier: "Level 1" | "Level 2" | "Level 3" | "Level 4";
  actionRecipient: string;
}

export default function SLAPage() {
  const { hasPermission, roleCode } = usePermissions();
  const canView = roleCode === "SUPER_ADMIN" || hasPermission("SLA_VIEW");

  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  
  const [slas, setSlas] = useState<SLATracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'ESCALATED'>('ALL');

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
    if (filter === 'UPCOMING') return s.status === 'Warning';
    if (filter === 'ESCALATED') return s.status === 'Breached';
    return true;
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const simulateTick = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSlas(slas.map(s => {
        if (s.status === "Warning") return { ...s, status: "Breached", escalationTier: "Level 4", elapsedTime: "0h remaining" };
        return s;
      }));
      setIsRefreshing(false);
      fetchSlas(); // Refresh from backend too
    }, 1500);
  };

  const overrideBreach = (id: string) => {
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
            <h1 className={`text-xl font-bold tracking-tight ${"text-foreground"}`}>SLA Governance & Surveillance Engine</h1>
            <AppBadge variant="danger">Realtime Tracking</AppBadge>
          </div>
          <p className="text-xs text-gray-500">
            Continuous timeout computation monitoring active workflow tuples to enforce multi-level escalation routing protocols.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AppButton 
            variant="secondary" 
            size="sm" 
            onClick={simulateTick}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            className={isLightMode ? "bg-white border-gray-200 text-gray-700 shadow-sm" : ""}
          >
            Simulate Timeout Expiration
          </AppButton>
        </div>
      </div>
      {/* Interactive SLA Governance Heatmap Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <AppCard 
          className={`cursor-pointer transition-all ${filter === 'ALL' ? 'ring-2 ring-accent' : 'hover:bg-gray-50/50 dark:hover:bg-white/5'} ${isLightMode ? "bg-white" : ""}`}
          onClick={() => setFilter('ALL')}
        >
          <AppCardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Records</span>
            <span className="text-3xl font-bold text-accent dark:text-accent">{loading ? '-' : totalRecords}</span>
          </AppCardContent>
        </AppCard>

        <AppCard 
          className={`cursor-pointer transition-all ${filter === 'UPCOMING' ? 'ring-2 ring-amber-500' : 'hover:bg-amber-50/50 dark:hover:bg-amber-500/10'} ${isLightMode ? "bg-white" : ""}`}
          onClick={() => setFilter('UPCOMING')}
        >
          <AppCardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="h-4 w-4" /> Upcoming</span>
            <span className="text-3xl font-bold text-amber-500">{loading ? '-' : upcomingRecords}</span>
          </AppCardContent>
        </AppCard>

        <AppCard 
          className={`cursor-pointer transition-all ${filter === 'ESCALATED' ? 'ring-2 ring-rose-500' : 'hover:bg-rose-50/50 dark:hover:bg-rose-500/10'} ${isLightMode ? "bg-white" : ""}`}
          onClick={() => setFilter('ESCALATED')}
        >
          <AppCardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Flame className="h-4 w-4" /> Escalated</span>
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">{loading ? '-' : escalatedRecords}</span>
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
                <AppCardTitle className={`flex items-center gap-2 text-rose-600`}>
                  <ShieldAlert className="h-4 w-4" />
                  <span>Monitored Operational Timeouts</span>
                </AppCardTitle>
                <p className="text-[0.8rem] text-gray-500">Reactive task timers updating background worker task queue parameters.</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
                Breach Count: {escalatedRecords}
              </span>
            </AppCardHeader>

            <div className="p-4 flex-1">
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <tr>
                      <AppTableHead>SLA Target</AppTableHead>
                      <AppTableHead>Interval Window</AppTableHead>
                      <AppTableHead>Escalation State</AppTableHead>
                      <AppTableHead className="text-right">Action Gate</AppTableHead>
                    </tr>
                  </AppTableHeader>
                  <AppTableBody>
                    {filteredSlas.map((item) => (
                      <AppTableRow key={item.id} className="hover:bg-elevated">
                        <AppTableCell>
                          <div className="space-y-0.5">
                            <span className={`font-mono text-xs font-bold block text-accent`}>{item.displayId || item.id}</span>
                            <span className="text-[0.8rem] text-gray-500 block truncate max-w-[150px]">{item.targetEntity}</span>
                            <span className={`text-xs font-semibold text-accent`}>{item.type}</span>
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="space-y-0.5 text-xs">
                            <span className={`${"text-foreground"} font-medium block`}>{item.allocatedWindow}</span>
                            <span className={`text-[0.8rem] font-mono block text-amber-600`}>{item.elapsedTime}</span>
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="space-y-1">
                            <AppBadge variant={item.status === "Healthy" ? "success" : item.status === "Warning" ? "warning" : "danger"}>
                              {item.status}
                            </AppBadge>
                            <span className="text-xs text-gray-500 block font-bold tracking-wider uppercase">{item.escalationTier}</span>
                          </div>
                        </AppTableCell>
                        <AppTableCell className="text-right">
                          <div className="space-y-1 flex flex-col items-end">
                            <span className="text-xs text-gray-500 italic block truncate max-w-[120px]">{item.actionRecipient}</span>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <AppButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-accent hover:bg-accent/10" title="View SLA Tracker">
                                <Eye className="h-3.5 w-3.5" />
                              </AppButton>
                              {(roleCode === "SUPER_ADMIN" || hasPermission("SLA_UPDATE")) && (
                                <AppButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-500 hover:bg-amber-500/10" title="Update Thresholds">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </AppButton>
                              )}
                              {(roleCode === "SUPER_ADMIN" || hasPermission("SLA_DELETE")) && (
                                <AppButton variant="ghost" size="sm" onClick={() => overrideBreach(item.id)} className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/10" title="Delete / Override Alert">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AppButton>
                              )}
                            </div>
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </div>

            <div className={`p-4 border-t text-[0.8rem] text-gray-500 flex items-center justify-between bg-elevated border-border`}>
              <span>Async worker loop interval syncs timeout status keys continuously.</span>
              <span className={`cursor-pointer hover:underline text-rose-600`}>Flush breach cache</span>
            </div>
          </AppCard>
        </div>

        {/* Right Span 1: Multi-Level Escalation Routing Architecture */}
        <div className="space-y-6">
          <AppCard className="p-5 space-y-4">
            <div className={`pb-2 border-b ${"border-border"}`}>
              <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${"text-muted"}`}>
                <BellRing className={`h-3.5 w-3.5 text-amber-500`} />
                <span>Escalation Level Routing Matrix</span>
              </span>
            </div>

            <div className="space-y-3">
              {levels.map((lvl, idx) => (
                <div key={idx} className={`p-3 rounded-xl border space-y-1 relative overflow-hidden ${
                  "bg-elevated border-border"
                }`}>
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-amber-500 to-rose-500 opacity-60" />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${"text-foreground"}`}>{lvl.level}</span>
                    <span className={`text-[0.7rem] px-1.5 py-0.2 rounded font-bold uppercase border ${
                      "bg-white text-muted border-border"
                    }`}>
                      {lvl.scope}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{lvl.action}</p>
                </div>
              ))}
            </div>

            <div className={`pt-2 border-t text-center ${"border-border"}`}>
              <span className="text-xs text-gray-500 italic">
                Higher level breaches instantly stack downstream action notifications automatically.
              </span>
            </div>
          </AppCard>

          {/* Operational Trust Advisory Card */}
          <AppCard className={`p-5 space-y-2 border ${
            "bg-emerald-50 border-emerald-100"
          }`}>
            <span className={`text-xs font-bold uppercase tracking-wider block text-emerald-700`}>
              SLA Trust Assurance
            </span>
            <p className="text-xs text-gray-500 leading-relaxed">
              Zero ticket leakage past allocated thresholds without strict activity entry logs appended to master audit trails.
            </p>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
