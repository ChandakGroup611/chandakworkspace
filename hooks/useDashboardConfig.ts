"use client";

import { useState, useEffect, useCallback } from "react";

export interface DashboardWidgetConfig {
  id: string; // unique ID for the widget instance
  type: string; // widget type (e.g., 'kpi', 'chart')
  colSpan: 1 | 2 | 3 | 4; // grid column span
  rowSpan: number; // grid row span
  order: number; // display order
  props?: Record<string, any>; // custom props for the widget
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetConfig[] = [
  { id: "executive_digest", type: "executive_digest", colSpan: 4, rowSpan: 2, order: 1 },
  { id: "kpi_main", type: "kpi", colSpan: 4, rowSpan: 1, order: 2 },
  { id: "sla_countdown", type: "sla_countdown", colSpan: 4, rowSpan: 2, order: 3 },
  { id: "departmental_health", type: "departmental_health", colSpan: 4, rowSpan: 2, order: 4 },
  { id: "bottleneck_radar", type: "bottleneck_radar", colSpan: 4, rowSpan: 2, order: 5 },
  { id: "upcoming_deadlines", type: "upcoming_deadlines", colSpan: 4, rowSpan: 2, order: 6 },
  { id: "recent_tickets", type: "recent_tickets", colSpan: 2, rowSpan: 2, order: 7 },
  { id: "activity_feed", type: "activity_feed", colSpan: 2, rowSpan: 2, order: 8 },
  { id: "risk_intel", type: "risk_intelligence", colSpan: 2, rowSpan: 2, order: 9 },
  { id: "status_comp", type: "status_comparison", colSpan: 2, rowSpan: 2, order: 10 },
  { id: "reso_velo", type: "resolution_velocity", colSpan: 4, rowSpan: 2, order: 11 },
  { id: "health_sla", type: "sla_governance", colSpan: 2, rowSpan: 2, order: 12 },
  { id: "health_workload", type: "workload_intelligence", colSpan: 2, rowSpan: 2, order: 13 },
  { id: "charts_row", type: "charts", colSpan: 4, rowSpan: 2, order: 14 },
  { id: "kanban_board", type: "kanban", colSpan: 4, rowSpan: 2, order: 15 },
  { id: "team_performance", type: "team_performance", colSpan: 4, rowSpan: 2, order: 16 },
];

export const DASHBOARD_PRESETS: Record<string, { name: string; description: string; layout: DashboardWidgetConfig[] }> = {
  executive: {
    name: "Executive Overview",
    description: "High-level strategic briefing, KPIs, SLA radar, and departmental health",
    layout: DEFAULT_DASHBOARD_LAYOUT
  },
  sla_command: {
    name: "SLA Incident Command",
    description: "Live SLA countdowns, breached deliverables, and risk metrics",
    layout: [
      { id: "sla_countdown", type: "sla_countdown", colSpan: 4, rowSpan: 2, order: 1 },
      { id: "executive_digest", type: "executive_digest", colSpan: 4, rowSpan: 2, order: 2 },
      { id: "health_sla", type: "sla_governance", colSpan: 2, rowSpan: 2, order: 3 },
      { id: "risk_intel", type: "risk_intelligence", colSpan: 2, rowSpan: 2, order: 4 },
      { id: "kpi_main", type: "kpi", colSpan: 4, rowSpan: 1, order: 5 },
      { id: "recent_tickets", type: "recent_tickets", colSpan: 2, rowSpan: 2, order: 6 },
      { id: "activity_feed", type: "activity_feed", colSpan: 2, rowSpan: 2, order: 7 },
    ]
  },
  manager_standup: {
    name: "Manager & Team Standup",
    description: "Department throughput, team velocity, and active kanban board",
    layout: [
      { id: "departmental_health", type: "departmental_health", colSpan: 4, rowSpan: 2, order: 1 },
      { id: "team_performance", type: "team_performance", colSpan: 4, rowSpan: 2, order: 2 },
      { id: "bottleneck_radar", type: "bottleneck_radar", colSpan: 4, rowSpan: 2, order: 3 },
      { id: "kpi_main", type: "kpi", colSpan: 4, rowSpan: 1, order: 4 },
      { id: "upcoming_deadlines", type: "upcoming_deadlines", colSpan: 4, rowSpan: 2, order: 5 },
      { id: "kanban_board", type: "kanban", colSpan: 4, rowSpan: 2, order: 6 },
    ]
  },
  bottleneck_audit: {
    name: "Bottleneck & Review Audit",
    description: "Deep dive into stage durations, aging approvals, and stalled items",
    layout: [
      { id: "bottleneck_radar", type: "bottleneck_radar", colSpan: 4, rowSpan: 2, order: 1 },
      { id: "executive_digest", type: "executive_digest", colSpan: 4, rowSpan: 2, order: 2 },
      { id: "reso_velo", type: "resolution_velocity", colSpan: 4, rowSpan: 2, order: 3 },
      { id: "status_comp", type: "status_comparison", colSpan: 2, rowSpan: 2, order: 4 },
      { id: "departmental_health", type: "departmental_health", colSpan: 4, rowSpan: 2, order: 5 },
      { id: "risk_intel", type: "risk_intelligence", colSpan: 2, rowSpan: 2, order: 6 },
    ]
  }
};

export function useDashboardConfig(dashboardCode: string = 'DEFAULT_COMMAND_CENTER') {
  const [layout, setLayout] = useState<DashboardWidgetConfig[]>([]);
  const [activePreset, setActivePreset] = useState<string>("executive");
  const [loading, setLoading] = useState(true);

  const fetchLayout = useCallback(() => {
    setLoading(true);
    const storageKey = `dashboard_layout_v3_${dashboardCode}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsedLayout: DashboardWidgetConfig[] = JSON.parse(saved);
        
        // Ensure all default widget types exist in layout even if user had older layout saved
        const existingIds = new Set(parsedLayout.map(l => l.id));
        const missingDefaults = DEFAULT_DASHBOARD_LAYOUT.filter(d => !existingIds.has(d.id));
        
        const merged = [...parsedLayout, ...missingDefaults.map(m => ({ ...m, order: m.order }))];
        setLayout(merged.sort((a, b) => {
          if (a.order === -1 && b.order === -1) return 0;
          if (a.order === -1) return 1;
          if (b.order === -1) return -1;
          return a.order - b.order;
        }));
      } catch (e) {
        console.error("Failed to parse dashboard layout, resetting to default", e);
        setLayout(DEFAULT_DASHBOARD_LAYOUT);
      }
    } else {
      setLayout(DEFAULT_DASHBOARD_LAYOUT);
    }
    setLoading(false);
  }, [dashboardCode]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const saveLayout = useCallback((newLayout: DashboardWidgetConfig[]) => {
    setLayout(newLayout);
    const storageKey = `dashboard_layout_v3_${dashboardCode}`;
    localStorage.setItem(storageKey, JSON.stringify(newLayout));
  }, [dashboardCode]);

  const applyPreset = useCallback((presetKey: string) => {
    const preset = DASHBOARD_PRESETS[presetKey];
    if (preset) {
      setActivePreset(presetKey);
      saveLayout(preset.layout);
    }
  }, [saveLayout]);

  const resetToDefault = useCallback(() => {
    setLayout(DEFAULT_DASHBOARD_LAYOUT);
    setActivePreset("executive");
    const storageKey = `dashboard_layout_v3_${dashboardCode}`;
    localStorage.removeItem(storageKey);
  }, [dashboardCode]);

  return {
    layout,
    activePreset,
    loading,
    saveLayout,
    applyPreset,
    resetToDefault
  };
}
