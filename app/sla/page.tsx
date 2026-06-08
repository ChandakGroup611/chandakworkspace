"use client";

import React, { useState } from "react";
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

interface SLATracker {
  id: string;
  targetEntity: string;
  type: "First Response" | "Resolution SLA" | "Escalation SLA";
  allocatedWindow: string;
  elapsedTime: string;
  status: "Healthy" | "Warning" | "Breached";
  escalationTier: "Level 1" | "Level 2" | "Level 3" | "Level 4";
  actionRecipient: string;
}

export default function SLAPage() {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  
  const [slas, setSlas] = useState<SLATracker[]>([
    {
      id: "SLA-401",
      targetEntity: "TKT-2041 (Database Saturation)",
      type: "Resolution SLA",
      allocatedWindow: "60m target",
      elapsedTime: "56m elapsed",
      status: "Warning",
      escalationTier: "Level 3",
      actionRecipient: "Department Operations Manager"
    },
    {
      id: "SLA-389",
      targetEntity: "REQ-902 (Snapshot Materialization)",
      type: "First Response",
      allocatedWindow: "15m target",
      elapsedTime: "18m elapsed",
      status: "Breached",
      escalationTier: "Level 4",
      actionRecipient: "Executive VP Ops Dashboard Alert"
    },
    {
      id: "SLA-405",
      targetEntity: "TKT-2039 (Middleware Invalidation)",
      type: "First Response",
      allocatedWindow: "30m target",
      elapsedTime: "8m elapsed",
      status: "Healthy",
      escalationTier: "Level 1",
      actionRecipient: "Assigned Service Desk Agent"
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const simulateTick = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSlas(slas.map(s => {
        if (s.status === "Warning") return { ...s, status: "Breached", escalationTier: "Level 4", elapsedTime: "62m elapsed" };
        return s;
      }));
      setIsRefreshing(false);
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
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b ${isLightMode ? "border-gray-200" : "border-white/5"}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-bold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>SLA Governance & Surveillance Engine</h1>
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

      {/* Primary Orchestration Column Layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Span 2: Active Timers & Escalation Targets Matrix */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <AppCard className={`flex-1 flex flex-col justify-between overflow-hidden ${isLightMode ? "bg-white border-gray-200" : ""}`}>
            <AppCardHeader className={`flex flex-row items-center justify-between pb-3 border-b ${isLightMode ? "border-gray-100 bg-gray-50/50" : "border-white/5 bg-white/[0.01]"}`}>
              <div className="space-y-0.5">
                <AppCardTitle className={`flex items-center gap-2 ${isLightMode ? "text-rose-600" : "text-rose-400"}`}>
                  <ShieldAlert className="h-4 w-4" />
                  <span>Monitored Operational Timeouts</span>
                </AppCardTitle>
                <p className="text-[0.8rem] text-gray-500">Reactive task timers updating background worker task queue parameters.</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                isLightMode ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}>
                Breach Count: {slas.filter(s => s.status === "Breached").length}
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
                    {slas.map((item) => (
                      <AppTableRow key={item.id} className={isLightMode ? "hover:bg-gray-50" : ""}>
                        <AppTableCell>
                          <div className="space-y-0.5">
                            <span className={`font-mono text-xs font-bold block ${isLightMode ? "text-indigo-600" : "text-white"}`}>{item.id}</span>
                            <span className="text-[0.8rem] text-gray-500 block truncate max-w-[150px]">{item.targetEntity}</span>
                            <span className={`text-xs font-semibold ${isLightMode ? "text-indigo-500" : "text-indigo-400"}`}>{item.type}</span>
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="space-y-0.5 text-xs">
                            <span className={`${isLightMode ? "text-gray-700" : "text-gray-300"} font-medium block`}>{item.allocatedWindow}</span>
                            <span className={`text-[0.8rem] font-mono block ${isLightMode ? "text-amber-600" : "text-amber-400"}`}>{item.elapsedTime}</span>
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
                              <AppButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500 hover:bg-blue-500/10" title="View SLA Tracker">
                                <Eye className="h-3.5 w-3.5" />
                              </AppButton>
                              <AppButton variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-500 hover:bg-amber-500/10" title="Update Thresholds">
                                <Edit2 className="h-3.5 w-3.5" />
                              </AppButton>
                              <AppButton variant="ghost" size="sm" onClick={() => overrideBreach(item.id)} className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/10" title="Delete / Override Alert">
                                <Trash2 className="h-3.5 w-3.5" />
                              </AppButton>
                            </div>
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </div>

            <div className={`p-4 border-t text-[0.8rem] text-gray-500 flex items-center justify-between ${isLightMode ? "bg-gray-50 border-gray-100" : "bg-white/[0.01] border-white/5"}`}>
              <span>Async worker loop interval syncs timeout status keys continuously.</span>
              <span className={`cursor-pointer hover:underline ${isLightMode ? "text-rose-600" : "text-rose-400"}`}>Flush breach cache</span>
            </div>
          </AppCard>
        </div>

        {/* Right Span 1: Multi-Level Escalation Routing Architecture */}
        <div className="space-y-6">
          <AppCard className={`p-5 space-y-4 ${isLightMode ? "bg-white border-gray-200" : ""}`}>
            <div className={`pb-2 border-b ${isLightMode ? "border-gray-100" : "border-white/5"}`}>
              <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? "text-gray-600" : "text-gray-400"}`}>
                <BellRing className={`h-3.5 w-3.5 ${isLightMode ? "text-amber-500" : "text-amber-400"}`} />
                <span>Escalation Level Routing Matrix</span>
              </span>
            </div>

            <div className="space-y-3">
              {levels.map((lvl, idx) => (
                <div key={idx} className={`p-3 rounded-xl border space-y-1 relative overflow-hidden ${
                  isLightMode ? "bg-gray-50 border-gray-100" : "bg-white/[0.01] border-white/5"
                }`}>
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-amber-500 to-rose-500 opacity-60" />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>{lvl.level}</span>
                    <span className={`text-[0.7rem] px-1.5 py-0.2 rounded font-bold uppercase border ${
                      isLightMode ? "bg-white text-gray-500 border-gray-200" : "bg-white/5 text-gray-400 border-white/10"
                    }`}>
                      {lvl.scope}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{lvl.action}</p>
                </div>
              ))}
            </div>

            <div className={`pt-2 border-t text-center ${isLightMode ? "border-gray-100" : "border-white/5"}`}>
              <span className="text-xs text-gray-500 italic">
                Higher level breaches instantly stack downstream action notifications automatically.
              </span>
            </div>
          </AppCard>

          {/* Operational Trust Advisory Card */}
          <AppCard className={`p-5 space-y-2 border ${
            isLightMode ? "bg-emerald-50 border-emerald-100" : "border-emerald-500/10 bg-emerald-500/[0.01]"
          }`}>
            <span className={`text-xs font-bold uppercase tracking-wider block ${isLightMode ? "text-emerald-700" : "text-emerald-400"}`}>
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
