"use client";

import React, { useState } from "react";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { WidgetRegistry } from "./WidgetRegistry";
import { CustomizeDashboardModal } from "./CustomizeDashboardModal";
import { MetricsListModal } from "../widgets/MetricsListModal";
import { AppButton } from "@/components/ui/AppButton";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardEngineProps {
  metrics: any[];
  kpis?: any;
}

export function DashboardEngine({ metrics, kpis }: DashboardEngineProps) {
  const { layout, loading, saveLayout, resetToDefault } = useDashboardConfig();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground animate-pulse">Loading Premium Layout...</div>;
  }

  // Active widgets ordered by user preference
  const activeWidgets = layout.filter(w => w.order !== -1).sort((a, b) => a.order - b.order);

  // Group widgets into logical sections that reflect the new prioritized sequence
  const sections = [
    {
      title: "Action Center",
      types: ["kpi", "upcoming_deadlines", "recent_tickets", "activity_feed"]
    },
    {
      title: "Analytics & Insights",
      types: ["risk_intelligence", "status_comparison", "resolution_velocity", "sla_governance", "workload_intelligence", "charts"]
    },
    {
      title: "Execution & Operations",
      types: ["kanban", "team_performance"]
    }
  ];

  const renderSection = (title: string, allowedTypes: string[]) => {
    const sectionWidgets = activeWidgets.filter(w => allowedTypes.includes(w.type));
    if (sectionWidgets.length === 0) return null;

    return (
      <div key={title} className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
          <div className="h-px bg-border/50 flex-1"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sectionWidgets.map(widgetConfig => {
            const WidgetComponent = WidgetRegistry[widgetConfig.type];
            if (!WidgetComponent) {
              console.warn(`Widget type ${widgetConfig.type} not found in registry.`);
              return null;
            }

            return (
              <div 
                key={widgetConfig.id} 
                className={cn(
                  widgetConfig.colSpan === 4 && "lg:col-span-4",
                  widgetConfig.colSpan === 3 && "lg:col-span-3",
                  widgetConfig.colSpan === 2 && "lg:col-span-2",
                  widgetConfig.colSpan === 1 && "lg:col-span-1",
                  "h-full"
                )}
              >
                <WidgetComponent metrics={metrics} kpis={kpis} {...widgetConfig.props} onOpenList={() => setIsListModalOpen(true)} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div id="dashboard-export-area" className="w-full relative animate-in fade-in duration-700 bg-background/50 p-2 rounded-xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Workspace / Enterprise Overview</h1>
          <div className="flex items-center gap-4 mt-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success animate-pulse"></span> System Health: Excellent</span>
            <span>•</span>
            <span>{metrics.length} Active Items</span>
          </div>
        </div>
        <AppButton 
          variant="outline" 
          size="sm" 
          leftIcon={<Settings2 className="h-4 w-4" />}
          onClick={() => setIsCustomizeOpen(true)}
          className="theme-card-structural /50 hover:bg-background/80"
        >
          Customize
        </AppButton>
      </div>

      {sections.map(section => renderSection(section.title, section.types))}

      {activeWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 mt-8 text-center border-dashed rounded-3xl theme-card-structural /30 border-border">
          <Settings2 className="w-12 h-12 mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground">Dashboard is Empty</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            All widgets have been hidden. Click customize to add enterprise widgets back to your command center.
          </p>
          <AppButton variant="primary" className="mt-6" onClick={() => setIsCustomizeOpen(true)}>
            Customize Dashboard
          </AppButton>
        </div>
      )}

      {isCustomizeOpen && (
        <CustomizeDashboardModal 
          isOpen={isCustomizeOpen} 
          onClose={() => setIsCustomizeOpen(false)} 
          layout={layout}
          onSave={saveLayout}
          onReset={resetToDefault}
        />
      )}

      <MetricsListModal 
        isOpen={isListModalOpen} 
        onClose={() => setIsListModalOpen(false)} 
        metrics={metrics} 
      />
    </div>
  );
}
