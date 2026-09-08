"use client";

import React, { useState } from "react";
import { useDashboardConfig, DASHBOARD_PRESETS } from "@/hooks/useDashboardConfig";
import { WidgetRegistry } from "./WidgetRegistry";
import { CustomizeDashboardModal } from "./CustomizeDashboardModal";
import { MetricsListModal, DrillDownFilter } from "../widgets/MetricsListModal";
import { AppButton } from "@/components/ui/AppButton";
import { Settings2, AlertTriangle, Layers, Sparkles, SlidersHorizontal, LayoutDashboard, ChevronDown, ChevronUp, ChevronsUpDown, CheckCircle2, TrendingUp } from "lucide-react";
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

const SECTIONS = [
  {
    id: "executive_center",
    title: "Executive Command & Action Center",
    description: "Digest, KPI Cards, SLA Countdown, Deadlines & Live Feed",
    icon: Sparkles,
    types: ["executive_digest", "sla_countdown", "kpi", "upcoming_deadlines", "recent_tickets", "activity_feed"]
  },
  {
    id: "operational_intelligence",
    title: "Operational & Departmental Intelligence",
    description: "Department Health, Bottleneck Radar, Workload & Resolution Velocity",
    icon: SlidersHorizontal,
    types: ["departmental_health", "bottleneck_radar", "risk_intelligence", "status_comparison", "resolution_velocity", "sla_governance", "workload_intelligence", "charts"]
  },
  {
    id: "execution_velocity",
    title: "Execution & Active Sprint Velocity",
    description: "Active Sprint Kanban Board, Flow Stages & Team Throughput",
    icon: LayoutDashboard,
    types: ["kanban", "team_performance"]
  }
];

export function DashboardEngine({ metrics, kpis }: DashboardEngineProps) {
  const { layout, loading, activePreset, applyPreset, saveLayout, resetToDefault } = useDashboardConfig();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [drillDownFilter, setDrillDownFilter] = useState<DrillDownFilter | null>(null);

  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const presetRef = React.useRef<HTMLDivElement>(null);

  // Collapsed sections state: sectionId -> boolean
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const expandAllSections = () => {
    setCollapsedSections({});
  };

  const collapseAllSections = () => {
    const allCollapsed: Record<string, boolean> = {};
    SECTIONS.forEach(s => {
      allCollapsed[s.id] = true;
    });
    setCollapsedSections(allCollapsed);
  };

  const allAreCollapsed = SECTIONS.every(s => collapsedSections[s.id]);

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

  const renderSection = (section: typeof SECTIONS[0]) => {
    const sectionWidgets = activeWidgets.filter(w => section.types.includes(w.type));
    if (sectionWidgets.length === 0) return null;

    const isCollapsed = !!collapsedSections[section.id];
    const IconComp = section.icon;

    return (
      <div key={section.id} id={`section-${section.id}`} className="mb-8 scroll-mt-20">
        {/* Card / Pill Section Header */}
        <div 
          onClick={() => toggleSection(section.id)}
          className={cn(
            "flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none group shadow-xs",
            isCollapsed 
              ? "bg-surface/70 hover:bg-surface border-border/70 hover:border-theme-btn-primary/30" 
              : "bg-surface/90 border-border/80 mb-5 hover:border-theme-btn-primary/40 shadow-sm"
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection(section.id); } }}
          aria-expanded={!isCollapsed}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-theme-btn-primary/10 text-theme-icon shrink-0 group-hover:scale-105 transition-transform">
              <IconComp className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground truncate">
                  {section.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20 shrink-0">
                  {sectionWidgets.length} {sectionWidgets.length === 1 ? 'KPI / Widget' : 'KPIs & Widgets'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {section.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[11px] font-semibold text-muted-foreground hidden md:inline group-hover:text-foreground transition-colors">
              {isCollapsed ? "Click to Expand" : "Click to Minimize"}
            </span>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-surface-hover text-foreground group-hover:bg-theme-btn-primary group-hover:text-white transition-all shadow-xs">
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Section Widgets Grid */}
        {!isCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-top-2 duration-200">
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
                    widgetConfig.colSpan === 4 && "col-span-1 md:col-span-2 lg:col-span-4",
                    widgetConfig.colSpan === 3 && "col-span-1 md:col-span-2 lg:col-span-3",
                    widgetConfig.colSpan === 2 && "col-span-1 md:col-span-2 lg:col-span-2",
                    widgetConfig.colSpan === 1 && "col-span-1",
                    "h-full min-w-0"
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
        )}
      </div>
    );
  };

  return (
    <div id="dashboard-export-area" className="w-full relative animate-in fade-in duration-700 bg-background/50 p-1 sm:p-2 rounded-xl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground">Workspace Overview</h1>
          <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">Live operational command center with department hierarchy & SLA governance</p>
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
          {/* Preset Selector Dropdown */}
          <div className="relative flex-1 sm:flex-initial" ref={presetRef}>
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              rightIcon={<ChevronDown className="h-3 w-3 opacity-60" />}
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="text-xs theme-card-structural w-full sm:w-auto justify-between"
            >
              Preset: <strong className="ml-1 text-foreground truncate">{DASHBOARD_PRESETS[activePreset]?.name || "Custom"}</strong>
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
            className="theme-card-structural hover:bg-background/80 whitespace-nowrap text-xs shrink-0"
          >
            Customize
          </AppButton>
        </div>
      </div>

      {/* Top Section KPI Quick Navigation & Accordion Pill Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-4 flex-nowrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
          KPI Sections:
        </span>

        {SECTIONS.map(s => {
          const isCollapsed = !!collapsedSections[s.id];
          const sectionWidgets = activeWidgets.filter(w => s.types.includes(w.type));
          if (sectionWidgets.length === 0) return null;
          const IconComp = s.icon;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                // If collapsed, open it and scroll to it
                if (isCollapsed) {
                  setCollapsedSections(prev => ({ ...prev, [s.id]: false }));
                }
                setTimeout(() => {
                  const el = document.getElementById(`section-${s.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border select-none active:scale-95",
                !isCollapsed 
                  ? "bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/30 shadow-xs" 
                  : "bg-surface text-muted-foreground hover:text-foreground border-border/60 hover:bg-surface/60"
              )}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{s.title.split('&')[0].trim()}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold border",
                !isCollapsed ? "bg-theme-btn-primary text-white border-transparent" : "bg-surface-hover text-muted-foreground border-border/40"
              )}>
                {sectionWidgets.length}
              </span>
              <span className="opacity-60 text-[10px]">
                {isCollapsed ? "▸" : "▾"}
              </span>
            </button>
          );
        })}

        <div className="ml-auto shrink-0 flex items-center gap-1.5 pl-2">
          <AppButton
            variant="ghost"
            size="sm"
            onClick={allAreCollapsed ? expandAllSections : collapseAllSections}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2.5 rounded-lg border border-border/40"
          >
            {allAreCollapsed ? "Expand All Sections" : "Minimize All Sections"}
          </AppButton>
        </div>
      </div>

      {/* Sections rendering */}
      {SECTIONS.map(section => renderSection(section))}

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
