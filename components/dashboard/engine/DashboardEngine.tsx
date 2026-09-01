"use client";

import React, { useState } from "react";
import { useDashboardConfig, DASHBOARD_PRESETS } from "@/hooks/useDashboardConfig";
import { WidgetRegistry } from "./WidgetRegistry";
import { CustomizeDashboardModal } from "./CustomizeDashboardModal";
import { MetricsListModal, DrillDownFilter } from "../widgets/MetricsListModal";
import { AppButton } from "@/components/ui/AppButton";
import { Settings2, AlertTriangle, Layers, Sparkles, SlidersHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

class WidgetErrorBoundary extends React.Component<{ children: React.ReactNode, type: string }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[DashboardEngine] Widget "${this.props.type}" crashed:`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 border border-danger/20 bg-danger/5 rounded-2xl text-center">
          <AlertTriangle className="w-8 h-8 text-danger/50 mb-3" />
          <h3 className="text-sm font-semibold text-danger">Widget Unavailable</h3>
          <p className="text-xs text-danger/70 mt-1 max-w-[200px] truncate">{this.state.error?.message || "An error occurred"}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface DashboardEngineProps {
  metrics: any[];
  kpis?: any;
}

export function DashboardEngine({ metrics, kpis }: DashboardEngineProps) {
  const { layout, loading, activePreset, applyPreset, saveLayout, resetToDefault } = useDashboardConfig();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [drillDownFilter, setDrillDownFilter] = useState<DrillDownFilter | null>(null);

  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const presetRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presetRef.current && !presetRef.current.contains(event.target as Node)) {
        setPresetDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDrillDown = (filter: DrillDownFilter) => {
    setDrillDownFilter(filter);
    setIsListModalOpen(true);
  };

  const handleOpenGeneralList = () => {
    setDrillDownFilter(null);
    setIsListModalOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground animate-pulse">Loading Next-Gen Layout...</div>;
  }

  // Active widgets ordered by user preference
  const activeWidgets = layout.filter(w => w.order !== -1).sort((a, b) => a.order - b.order);

  // Group widgets into strategic enterprise sections
  const sections = [
    {
      title: "Executive Command & Action Center",
      types: ["executive_digest", "sla_countdown", "kpi", "upcoming_deadlines", "recent_tickets", "activity_feed"]
    },
    {
      title: "Operational & Departmental Intelligence",
      types: ["departmental_health", "bottleneck_radar", "risk_intelligence", "status_comparison", "resolution_velocity", "sla_governance", "workload_intelligence", "charts"]
    },
    {
      title: "Execution & Team Velocity",
      types: ["kanban", "team_performance"]
    }
  ];

  const renderSection = (title: string, allowedTypes: string[]) => {
    const sectionWidgets = activeWidgets.filter(w => allowedTypes.includes(w.type));
    if (sectionWidgets.length === 0) return null;

    return (
      <div key={title} className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
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
                <WidgetErrorBoundary type={widgetConfig.type}>
                  <WidgetComponent 
                    metrics={metrics} 
                    kpis={kpis} 
                    {...widgetConfig.props} 
                    onOpenList={handleOpenGeneralList}
                    onDrillDown={handleDrillDown}
                  />
                </WidgetErrorBoundary>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div id="dashboard-export-area" className="w-full relative animate-in fade-in duration-700 bg-background/50 p-2 rounded-xl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Workspace / Enterprise Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Live operational command center with department hierarchy & SLA governance</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Selector Dropdown */}
          <div className="relative" ref={presetRef}>
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              rightIcon={<ChevronDown className="h-3 w-3 opacity-60" />}
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="text-xs theme-card-structural"
            >
              Preset: <strong className="ml-1 text-foreground">{DASHBOARD_PRESETS[activePreset]?.name || "Custom"}</strong>
            </AppButton>

            {presetDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-2xl theme-card-structural border border-border/80 z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1.5 border-b border-border/40">
                  Switch Dashboard Layout Preset
                </div>
                <div className="py-1 space-y-0.5">
                  {Object.entries(DASHBOARD_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        applyPreset(key);
                        setPresetDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col",
                        activePreset === key ? "bg-primary/15 text-primary font-bold" : "hover:bg-surface text-foreground"
                      )}
                    >
                      <span className="font-semibold">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal line-clamp-1">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customize Button */}
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<Settings2 className="h-4 w-4" />}
            onClick={() => setIsCustomizeOpen(true)}
            className="theme-card-structural hover:bg-background/80 whitespace-nowrap text-xs"
          >
            Customize
          </AppButton>
        </div>
      </div>

      {/* Sections rendering */}
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
        onClose={() => {
          setIsListModalOpen(false);
          setDrillDownFilter(null);
        }} 
        metrics={metrics}
        filter={drillDownFilter}
      />
    </div>
  );
}
