"use client";

import React, { useState } from "react";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { WidgetRegistry } from "./WidgetRegistry";
import { CustomizeDashboardModal } from "./CustomizeDashboardModal";
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground animate-pulse">Loading Premium Layout...</div>;
  }

  // Active widgets ordered by user preference
  const activeWidgets = layout.filter(w => w.order !== -1).sort((a, b) => a.order - b.order);

  return (
    <div className="w-full relative animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Workspace / Enterprise Overview</h1>
          <div className="flex items-center gap-4 mt-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> System Health: Excellent</span>
            <span>•</span>
            <span>{metrics.length} Active Items</span>
          </div>
        </div>
        <AppButton 
          variant="outline" 
          size="sm" 
          leftIcon={<Settings2 className="h-4 w-4" />}
          onClick={() => setIsCustomizeOpen(true)}
          className="bg-surface/50 backdrop-blur-md border-border/50 hover:bg-surface"
        >
          Customize
        </AppButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeWidgets.map(widgetConfig => {
          const WidgetComponent = WidgetRegistry[widgetConfig.type];
          if (!WidgetComponent) {
            console.warn(`Widget type ${widgetConfig.type} not found in registry.`);
            return null;
          }

          return (
            <div 
              key={widgetConfig.id} 
              className={cn(
                // Span classes
                widgetConfig.colSpan === 4 && "lg:col-span-4",
                widgetConfig.colSpan === 3 && "lg:col-span-3",
                widgetConfig.colSpan === 2 && "lg:col-span-2",
                widgetConfig.colSpan === 1 && "lg:col-span-1",
                "h-full"
              )}
            >
              <WidgetComponent metrics={metrics} kpis={kpis} {...widgetConfig.props} />
            </div>
          );
        })}
      </div>

      {activeWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 mt-8 text-center border border-dashed rounded-3xl border-border bg-surface/30 backdrop-blur-sm">
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
    </div>
  );
}
