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
  { id: "kpi_main", type: "kpi", colSpan: 4, rowSpan: 1, order: 1 },
  { id: "health_sla", type: "sla_governance", colSpan: 2, rowSpan: 2, order: 2 },
  { id: "health_workload", type: "workload_intelligence", colSpan: 2, rowSpan: 2, order: 3 },
  { id: "charts_row", type: "charts", colSpan: 4, rowSpan: 2, order: 4 },
  { id: "kanban_board", type: "kanban", colSpan: 4, rowSpan: 2, order: 5 },
  { id: "recent_tickets", type: "recent_tickets", colSpan: 2, rowSpan: 2, order: 6 },
  { id: "activity_feed", type: "activity_feed", colSpan: 1, rowSpan: 2, order: 7 },
  { id: "upcoming_deadlines", type: "upcoming_deadlines", colSpan: 1, rowSpan: 2, order: 8 },
  { id: "team_performance", type: "team_performance", colSpan: 4, rowSpan: 2, order: 9 },
];

export function useDashboardConfig(dashboardCode: string = 'DEFAULT_COMMAND_CENTER') {
  const [layout, setLayout] = useState<DashboardWidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLayout = useCallback(() => {
    setLoading(true);
    const storageKey = `dashboard_layout_${dashboardCode}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsedLayout: DashboardWidgetConfig[] = JSON.parse(saved);
        // We could merge missing default widgets here if necessary
        setLayout(parsedLayout.sort((a, b) => a.order - b.order));
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

  const saveLayout = async (newLayout: DashboardWidgetConfig[]) => {
    const storageKey = `dashboard_layout_${dashboardCode}`;
    localStorage.setItem(storageKey, JSON.stringify(newLayout));
    setLayout(newLayout.sort((a, b) => a.order - b.order));
  };

  const resetToDefault = async () => {
    const storageKey = `dashboard_layout_${dashboardCode}`;
    localStorage.removeItem(storageKey);
    setLayout(DEFAULT_DASHBOARD_LAYOUT);
  };

  return {
    layout,
    loading,
    saveLayout,
    resetToDefault
  };
}
