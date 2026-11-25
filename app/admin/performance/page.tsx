'use client';

import { useEffect, useState } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from '@/components/ui/AppTable';
import { queryStore, QueryMetrics, budgetManager } from '@/utils/performance/query-tracker';
import { websocketStore } from '@/utils/performance/websocket-tracker';
import { hydrationStore } from '@/hooks/use-hydration-tracker';
import { getPerformanceServerMetrics } from './actions';
import { performanceGovernor, GovernanceMetrics, DegradationStage } from '@/utils/performance/PerformanceGovernanceEngine';
import { usePermissions } from "@/hooks/usePermissions";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export default function PerformanceCommandCenter() {
  const { hasPermission, roleCode } = usePermissions();
  const canView = roleCode === "SUPER_ADMIN" || hasPermission("SUPER_ADMIN");

  const [metrics, setMetrics] = useState<QueryMetrics[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [activeChannels, setActiveChannels] = useState(0);
  const [hydrationData, setHydrationData] = useState({ fcp: 0, lcp: 0, ttqb: 0 });
  const [serverMetrics, setServerMetrics] = useState({ cacheHits: 0, cacheMisses: 0, cacheRatio: 100, queue: { pending: 0, processing: 0, failed: 0 } });
  
  const [govMetrics, setGovMetrics] = useState<GovernanceMetrics | null>(null);

  // Feature Flags State
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setKillSwitchEnabled(window.localStorage.getItem("REALTIME_KILL_SWITCH") === "true");
    }
  }, []);

  const toggleKillSwitch = () => {
    const newState = !killSwitchEnabled;
    setKillSwitchEnabled(newState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("REALTIME_KILL_SWITCH", String(newState));
    }
  };

  useEffect(() => {
    if (!canView) return; // Prevent polling if not authorized
    
    // R1: Production Safe Mode: 30s interval, paused when tab is hidden
    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      setMetrics([...queryStore.getMetrics()]);
      setViolations([...budgetManager.getViolations()]);
      setActiveChannels(websocketStore.getActiveCount());
      setHydrationData({
        fcp: hydrationStore.fcp,
        lcp: hydrationStore.lcp,
        ttqb: hydrationStore.ttqb,
      });
      const sMetrics = await getPerformanceServerMetrics();
      setServerMetrics(sMetrics);
      
      // Pull passive governance metrics
      setGovMetrics(performanceGovernor.getMetrics());
    }, 30000);
    return () => clearInterval(interval);
  }, [canView]);

  if (!canView) {
    return (
      <AccessRestricted
        requiredRole="Super Admin"
        moduleName="System Performance"
      />
    );
  }


  const totalQueries = metrics.length;
  const duplicateQueries = metrics.filter((m) => m.isDuplicate).length;
  const criticalQueries = metrics.filter((m) => m.severity === 'critical').length;
  const slowQueries = metrics.filter((m) => m.severity === 'slow').length;
  
  const totalPayloadKB = metrics.reduce((acc, m) => acc + (m.payloadBytes || 0), 0) / 1024;
  const totalRowsReturned = metrics.reduce((acc, m) => acc + (m.rowsReturned || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">Team performance</h1>
        <div className="flex items-center gap-4">
          <AppButton 
            onClick={toggleKillSwitch}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
              killSwitchEnabled 
                ? "bg-danger text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]" 
                : "bg-elevated text-foreground hover:bg-elevated"
            }`}
          >
            {killSwitchEnabled ? "KILL SWITCH ENGAGED (Realtime Paused)" : "Engage Realtime Kill Switch"}
          </AppButton>
        </div>
      </div>
      
      {/* ENTERPRISE SCORE & GOVERNANCE */}
      {govMetrics && (
        <div className="bg-surface text-foreground rounded-lg p-6 shadow-lg border border-border">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-muted">Weighted enterprise health score</h2>
              <p className="text-sm text-muted">Aggregated via passive governance engine</p>
            </div>
            <div className={`text-4xl font-semibold ${govMetrics.totalEnterpriseScore > 90 ? 'text-success-text' : govMetrics.totalEnterpriseScore > 75 ? 'text-warning-text' : 'text-danger-text'}`}>
              {govMetrics.totalEnterpriseScore.toFixed(1)} / 100
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div className="bg-surface/30 p-3 rounded-lg"><div className="text-xs text-muted">Hydration</div><div className="font-semibold">{govMetrics.hydrationScore.toFixed(0)}</div></div>
            <div className="bg-surface/30 p-3 rounded-lg"><div className="text-xs text-muted">Queries</div><div className="font-semibold">{govMetrics.queryLatencyScore.toFixed(0)}</div></div>
            <div className="bg-surface/30 p-3 rounded-lg"><div className="text-xs text-muted">Websockets</div><div className="font-semibold">{govMetrics.websocketHealthScore.toFixed(0)}</div></div>
            <div className="bg-surface/30 p-3 rounded-lg"><div className="text-xs text-muted">Memory</div><div className="font-semibold">{govMetrics.memoryPressureScore.toFixed(0)}</div></div>
            <div className="bg-surface/30 p-3 rounded-lg"><div className="text-xs text-muted">Payload</div><div className="font-semibold">{govMetrics.payloadSizeScore.toFixed(0)}</div></div>
            <div className="bg-surface/30 p-3 rounded-lg"><div className="text-xs text-muted">Rerenders</div><div className="font-semibold">{govMetrics.rerenderStormScore.toFixed(0)}</div></div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-surface/50 border border-border flex items-center justify-between">
            <div>
              <div className="font-semibold text-muted">Degradation stage</div>
              <div className="text-sm text-muted">Current self-protection level</div>
            </div>
            <div className="text-lg font-semibold text-warning-text">
              {govMetrics.currentStage === DegradationStage.STAGE_0_NORMAL && <span className="text-success-text">Stage 0: normal</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_1_MILD && <span>Stage 1: mild</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_2_MODERATE && <span>Stage 2: moderate</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_3_SEVERE && <span className="text-warning-text">Stage 3: severe</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_4_CRITICAL && <span className="text-danger-text">Stage 4: critical</span>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total queries" value={totalQueries} />
        <MetricCard title="Duplicate queries" value={duplicateQueries} isWarning={duplicateQueries > 5} />
        <MetricCard title="Critical queries" value={criticalQueries} isCritical={criticalQueries > 0} />
        <MetricCard title="Active websockets" value={activeChannels} isWarning={activeChannels > 15} isCritical={activeChannels > 30} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="First contentful paint (FCP)" value={`${hydrationData.fcp.toFixed(0)} ms`} />
        <MetricCard title="Largest contentful paint (LCP)" value={`${hydrationData.lcp.toFixed(0)} ms`} />
        <MetricCard title="Time to first byte (TTFB)" value={`${hydrationData.ttqb.toFixed(0)} ms`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-6 mt-6">
        <MetricCard title="Total JSON payload" value={`${totalPayloadKB.toFixed(1)} KB`} isWarning={totalPayloadKB > 1024} isCritical={totalPayloadKB > 5120} />
        <MetricCard title="Total rows hydrated" value={totalRowsReturned} isWarning={totalRowsReturned > 1000} />
        <MetricCard title="Master cache hits" value={serverMetrics.cacheHits} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Master cache misses" value={serverMetrics.cacheMisses} isWarning={serverMetrics.cacheMisses > 10} />
        <MetricCard title="Cache hit ratio" value={`${serverMetrics.cacheRatio.toFixed(1)}%`} isCritical={serverMetrics.cacheRatio < 80} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-6 mt-6">
        <MetricCard title="Queue depth (pending)" value={serverMetrics.queue.pending} isWarning={serverMetrics.queue.pending > 50} isCritical={serverMetrics.queue.pending > 200} />
        <MetricCard title="Processing events" value={serverMetrics.queue.processing} />
        <MetricCard title="Failed/dead-letter events" value={serverMetrics.queue.failed} isCritical={serverMetrics.queue.failed > 0} />
      </div>

      {violations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-danger-text">Soft governance budget violations</h2>
          <div className="overflow-x-auto">
            <AppTableContainer><AppTable className="min-w-full divide-y divide-danger-border text-base">
              <AppTableHeader className="bg-danger-soft">
                <AppTableRow>
                  <AppTableHead className="px-4 py-3 text-left">Route</AppTableHead>
                  <AppTableHead className="px-4 py-3 text-right">Query count</AppTableHead>
                  <AppTableHead className="px-4 py-3 text-right">Allowed budget</AppTableHead>
                  <AppTableHead className="px-4 py-3 text-left">Time</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody className="divide-y divide-danger-border">
                {violations.map((v, i) => (
                  <AppTableRow key={i} className="bg-surface">
                    <AppTableCell className="px-4 py-3 font-medium">{v.route}</AppTableCell>
                    <AppTableCell className="px-4 py-3 text-right font-semibold text-danger-text">{v.count}</AppTableCell>
                    <AppTableCell className="px-4 py-3 text-right text-muted">{v.budget}</AppTableCell>
                    <AppTableCell className="px-4 py-3 text-muted">{new Date(v.timestamp).toLocaleTimeString()}</AppTableCell>
                  </AppTableRow>
                ))}
              </AppTableBody>
            </AppTable></AppTableContainer>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Query log</h2>
        <div className="overflow-x-auto">
          <AppTableContainer><AppTable className="min-w-full divide-y divide-border text-base">
            <AppTableHeader className="bg-surface">
              <AppTableRow>
                <AppTableHead className="px-4 py-3 text-left">Time</AppTableHead>
                <AppTableHead className="px-4 py-3 text-left">Type</AppTableHead>
                <AppTableHead className="px-4 py-3 text-left">Target</AppTableHead>
                <AppTableHead className="px-4 py-3 text-right">Duration</AppTableHead>
                <AppTableHead className="px-4 py-3 text-right">Rows</AppTableHead>
                <AppTableHead className="px-4 py-3 text-right">Payload</AppTableHead>
                <AppTableHead className="px-4 py-3 text-left">Severity</AppTableHead>
                <AppTableHead className="px-4 py-3 text-left">Duplicate</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody className="divide-y divide-border">
              {metrics.slice(0, 50).map((m) => (
                <AppTableRow key={m.id} className={m.severity === 'critical' ? 'bg-danger-soft' : m.severity === 'slow' ? 'bg-warning-soft' : m.severity === 'warning' ? 'bg-warning-soft' : ''}>
                  <AppTableCell className="px-4 py-3 text-muted">{new Date(m.timestamp).toLocaleTimeString()}</AppTableCell>
                  <AppTableCell className="px-4 py-3 font-medium">{m.queryType.toUpperCase()}</AppTableCell>
                  <AppTableCell className="px-4 py-3">{m.tableOrFunction}</AppTableCell>
                  <AppTableCell className="px-4 py-3 text-right font-mono">{m.durationMs.toFixed(1)} ms</AppTableCell>
                  <AppTableCell className="px-4 py-3 text-right">{m.rowsReturned}</AppTableCell>
                  <AppTableCell className="px-4 py-3 text-right">{(m.payloadBytes / 1024).toFixed(1)} KB</AppTableCell>
                  <AppTableCell className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      m.severity === 'critical' ? 'bg-danger-soft text-danger-text' :
                      m.severity === 'slow' ? 'bg-warning-soft text-warning-text' :
                      m.severity === 'warning' ? 'bg-warning-soft text-warning-text' :
                      'bg-success-soft text-success-text'
                    }`}>
                      {m.severity.toUpperCase()}
                    </span>
                  </AppTableCell>
                  <AppTableCell className="px-4 py-3 text-danger-text font-semibold">{m.isDuplicate ? `YES (${m.duplicateCount})` : ''}</AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable></AppTableContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, isWarning, isCritical }: { title: string, value: string | number, isWarning?: boolean, isCritical?: boolean }) {
  let bgColor = 'bg-surface';
  let textColor = 'text-foreground';
  let borderColor = 'border-border';

  if (isCritical) {
    bgColor = 'bg-danger-soft';
    textColor = 'text-danger-text';
    borderColor = 'border-danger-border';
  } else if (isWarning) {
    bgColor = 'bg-warning-soft';
    textColor = 'text-warning-text';
    borderColor = 'border-warning-border';
  }

  return (
    <div className={`p-6 rounded-lg border shadow-sm ${bgColor} ${borderColor}`}>
      <h3 className="text-sm font-medium text-muted mb-1">{title}</h3>
      <p className={`text-3xl font-semibold ${textColor}`}>{value}</p>
    </div>
  );
}
