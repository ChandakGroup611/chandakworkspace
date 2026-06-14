'use client';

import { useEffect, useState } from 'react';
import { queryStore, QueryMetrics, budgetManager } from '@/utils/performance/query-tracker';
import { websocketStore } from '@/utils/performance/websocket-tracker';
import { hydrationStore } from '@/hooks/use-hydration-tracker';
import { getPerformanceServerMetrics } from './actions';
import { performanceGovernor, GovernanceMetrics, DegradationStage } from '@/utils/performance/PerformanceGovernanceEngine';
import { usePermissions } from "@/hooks/usePermissions";

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
    
    // Production Safe Mode: Reduced polling interval to 10s to minimize server action overhead.
    // (Was 2s = 30 calls/min per admin user. Now 6 calls/min.)
    const interval = setInterval(async () => {
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
    }, 10000);
    return () => clearInterval(interval);
  }, [canView]);

  if (!canView) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">Super Admin privileges are required to view the Performance Command Center.</p>
        </div>
      </div>
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
        <h1 className="text-3xl font-bold tracking-tight">Enterprise Performance Command Center</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleKillSwitch}
            className={`px-4 py-2 font-bold rounded-lg transition-colors ${
              killSwitchEnabled 
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]" 
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {killSwitchEnabled ? "KILL SWITCH ENGAGED (Realtime Paused)" : "Engage Realtime Kill Switch"}
          </button>
        </div>
      </div>
      
      {/* ENTERPRISE SCORE & GOVERNANCE */}
      {govMetrics && (
        <div className="bg-gray-900 text-white rounded-xl p-6 shadow-xl border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-200">Weighted Enterprise Health Score</h2>
              <p className="text-sm text-gray-400">Aggregated via Passive Governance Engine</p>
            </div>
            <div className={`text-4xl font-black ${govMetrics.totalEnterpriseScore > 90 ? 'text-green-400' : govMetrics.totalEnterpriseScore > 75 ? 'text-yellow-400' : 'text-red-500'}`}>
              {govMetrics.totalEnterpriseScore.toFixed(1)} / 100
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div className="bg-black/30 p-3 rounded-lg"><div className="text-xs text-gray-500">Hydration</div><div className="font-bold">{govMetrics.hydrationScore.toFixed(0)}</div></div>
            <div className="bg-black/30 p-3 rounded-lg"><div className="text-xs text-gray-500">Queries</div><div className="font-bold">{govMetrics.queryLatencyScore.toFixed(0)}</div></div>
            <div className="bg-black/30 p-3 rounded-lg"><div className="text-xs text-gray-500">Websockets</div><div className="font-bold">{govMetrics.websocketHealthScore.toFixed(0)}</div></div>
            <div className="bg-black/30 p-3 rounded-lg"><div className="text-xs text-gray-500">Memory</div><div className="font-bold">{govMetrics.memoryPressureScore.toFixed(0)}</div></div>
            <div className="bg-black/30 p-3 rounded-lg"><div className="text-xs text-gray-500">Payload</div><div className="font-bold">{govMetrics.payloadSizeScore.toFixed(0)}</div></div>
            <div className="bg-black/30 p-3 rounded-lg"><div className="text-xs text-gray-500">Rerenders</div><div className="font-bold">{govMetrics.rerenderStormScore.toFixed(0)}</div></div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-300">Degradation Stage</div>
              <div className="text-sm text-gray-500">Current Self-Protection Level</div>
            </div>
            <div className="text-lg font-bold text-amber-500">
              {govMetrics.currentStage === DegradationStage.STAGE_0_NORMAL && <span className="text-green-400">STAGE 0: NORMAL</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_1_MILD && <span>STAGE 1: MILD</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_2_MODERATE && <span>STAGE 2: MODERATE</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_3_SEVERE && <span className="text-orange-500">STAGE 3: SEVERE</span>}
              {govMetrics.currentStage === DegradationStage.STAGE_4_CRITICAL && <span className="text-red-500">STAGE 4: CRITICAL</span>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Queries" value={totalQueries} />
        <MetricCard title="Duplicate Queries" value={duplicateQueries} isWarning={duplicateQueries > 5} />
        <MetricCard title="Critical Queries" value={criticalQueries} isCritical={criticalQueries > 0} />
        <MetricCard title="Active Websockets" value={activeChannels} isWarning={activeChannels > 15} isCritical={activeChannels > 30} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="First Contentful Paint (FCP)" value={`${hydrationData.fcp.toFixed(0)} ms`} />
        <MetricCard title="Largest Contentful Paint (LCP)" value={`${hydrationData.lcp.toFixed(0)} ms`} />
        <MetricCard title="Time to First Byte (TTFB)" value={`${hydrationData.ttqb.toFixed(0)} ms`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-6 mt-6">
        <MetricCard title="Total JSON Payload" value={`${totalPayloadKB.toFixed(1)} KB`} isWarning={totalPayloadKB > 1024} isCritical={totalPayloadKB > 5120} />
        <MetricCard title="Total Rows Hydrated" value={totalRowsReturned} isWarning={totalRowsReturned > 1000} />
        <MetricCard title="Master Cache Hits" value={serverMetrics.cacheHits} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Master Cache Misses" value={serverMetrics.cacheMisses} isWarning={serverMetrics.cacheMisses > 10} />
        <MetricCard title="Cache Hit Ratio" value={`${serverMetrics.cacheRatio.toFixed(1)}%`} isCritical={serverMetrics.cacheRatio < 80} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-6 mt-6">
        <MetricCard title="Queue Depth (Pending)" value={serverMetrics.queue.pending} isWarning={serverMetrics.queue.pending > 50} isCritical={serverMetrics.queue.pending > 200} />
        <MetricCard title="Processing Events" value={serverMetrics.queue.processing} />
        <MetricCard title="Failed/Dead-letter Events" value={serverMetrics.queue.failed} isCritical={serverMetrics.queue.failed > 0} />
      </div>

      {violations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-red-600">Soft Governance Budget Violations</h2>
          <div className="overflow-x-auto border rounded-lg border-red-200">
            <table className="min-w-full divide-y divide-red-200 text-sm">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-left">Route</th>
                  <th className="px-4 py-3 text-right">Query Count</th>
                  <th className="px-4 py-3 text-right">Allowed Budget</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {violations.map((v, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-4 py-3 font-medium">{v.route}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">{v.count}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{v.budget}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(v.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Query Log</h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3 text-right">Rows</th>
                <th className="px-4 py-3 text-right">Payload</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Duplicate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics.slice(0, 50).map((m) => (
                <tr key={m.id} className={m.severity === 'critical' ? 'bg-red-50' : m.severity === 'slow' ? 'bg-orange-50' : m.severity === 'warning' ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-3 text-gray-500">{new Date(m.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 font-medium">{m.queryType.toUpperCase()}</td>
                  <td className="px-4 py-3">{m.tableOrFunction}</td>
                  <td className="px-4 py-3 text-right font-mono">{m.durationMs.toFixed(1)} ms</td>
                  <td className="px-4 py-3 text-right">{m.rowsReturned}</td>
                  <td className="px-4 py-3 text-right">{(m.payloadBytes / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      m.severity === 'critical' ? 'bg-red-200 text-red-800' :
                      m.severity === 'slow' ? 'bg-orange-200 text-orange-800' :
                      m.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {m.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-red-600 font-bold">{m.isDuplicate ? `YES (${m.duplicateCount})` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, isWarning, isCritical }: { title: string, value: string | number, isWarning?: boolean, isCritical?: boolean }) {
  let bgColor = 'bg-white';
  let textColor = 'text-gray-900';
  let borderColor = 'border-gray-200';

  if (isCritical) {
    bgColor = 'bg-red-50';
    textColor = 'text-red-700';
    borderColor = 'border-red-200';
  } else if (isWarning) {
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-700';
    borderColor = 'border-yellow-200';
  }

  return (
    <div className={`p-6 rounded-xl border shadow-sm ${bgColor} ${borderColor}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
