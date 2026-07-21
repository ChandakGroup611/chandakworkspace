"use client";

import React from "react";
import dynamic from "next/dynamic";

// Base wrappers
const ExecutiveKPIWidget = dynamic(() => import("../widgets/ExecutiveKPIWidget").then(m => m.ExecutiveKPIWidget), { ssr: false, loading: () => <div className="h-32 bg-surface/50 rounded-2xl animate-pulse" /> });
const ChartWidget = dynamic(() => import("../widgets/ChartWidget").then(m => m.ChartWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const KanbanWidget = dynamic(() => import("../widgets/KanbanWidget").then(m => m.KanbanWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const DataTableWidget = dynamic(() => import("../widgets/DataTableWidget").then(m => m.DataTableWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const ActivityFeedWidget = dynamic(() => import("../widgets/ActivityFeedWidget").then(m => m.ActivityFeedWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const DeadlinesWidget = dynamic(() => import("../widgets/DeadlinesWidget").then(m => m.DeadlinesWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const PerformanceWidget = dynamic(() => import("../widgets/PerformanceWidget").then(m => m.PerformanceWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const SlaGovernanceWidget = dynamic(() => import("../widgets/SlaGovernanceWidget").then(m => m.SlaGovernanceWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const WorkloadIntelligenceWidget = dynamic(() => import("../widgets/WorkloadIntelligenceWidget").then(m => m.WorkloadIntelligenceWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });

const StatusComparisonWidget = dynamic(() => import("../widgets/StatusComparisonWidget").then(m => m.StatusComparisonWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const RiskIntelligenceWidget = dynamic(() => import("../widgets/RiskIntelligenceWidget").then(m => m.RiskIntelligenceWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });
const ResolutionVelocityWidget = dynamic(() => import("../widgets/ResolutionVelocityWidget").then(m => m.ResolutionVelocityWidget), { ssr: false, loading: () => <div className="h-64 bg-surface/50 rounded-2xl animate-pulse" /> });

export const WidgetRegistry: Record<string, React.ComponentType<any>> = {
  kpi: ExecutiveKPIWidget,
  charts: ChartWidget,
  kanban: KanbanWidget,
  recent_tickets: DataTableWidget,
  activity_feed: ActivityFeedWidget,
  upcoming_deadlines: DeadlinesWidget,
  team_performance: PerformanceWidget,
  sla_governance: SlaGovernanceWidget,
  workload_intelligence: WorkloadIntelligenceWidget,
  status_comparison: StatusComparisonWidget,
  risk_intelligence: RiskIntelligenceWidget,
  resolution_velocity: ResolutionVelocityWidget,
};
