"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { 
  FolderKanban, 
  Car, 
  Compass, 
  Layers, 
  ChevronDown, 
  Check, 
  Sparkles,
  ExternalLink,
  ArrowRightLeft
} from "lucide-react";
import { getUserAllowedModules, setActiveModule, ModuleInfo, UserModulesResult } from "@/lib/actions/module-switcher";
import { AppButton } from "@/components/ui/AppButton";

interface ModuleSwitcherProps {
  isCompact?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export default function ModuleSwitcher({ isCompact = false, onCloseMobile, className = "" }: ModuleSwitcherProps) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserModulesResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect current active module based on route, or stored cookie
  const activeModuleCode = React.useMemo(() => {
    if (pathname.startsWith("/vehicle")) return "VEHICLE_DESK";
    if (pathname.startsWith("/design")) return "DESIGN_TRACKING";
    return data?.activeModuleCode || "TASK_WORKFLOW";
  }, [pathname, data]);

  useEffect(() => {
    let isMounted = true;
    getUserAllowedModules().then((res) => {
      if (isMounted) {
        setData(res);
      }
    }).catch(err => {
      console.error("[ModuleSwitcher] error fetching modules:", err);
    });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const getModuleIcon = (code: string) => {
    switch (code) {
      case "TASK_WORKFLOW":
        return FolderKanban;
      case "VEHICLE_DESK":
        return Car;
      case "DESIGN_TRACKING":
        return Compass;
      default:
        return Layers;
    }
  };

  const getModuleTheme = (code: string) => {
    switch (code) {
      case "TASK_WORKFLOW":
        return {
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          dot: "bg-blue-500"
        };
      case "VEHICLE_DESK":
        return {
          color: "text-amber-500",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          dot: "bg-amber-500"
        };
      case "DESIGN_TRACKING":
        return {
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          dot: "bg-emerald-500"
        };
      default:
        return {
          color: "text-purple-500",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
          dot: "bg-purple-500"
        };
    }
  };

  const handleSelectModule = async (code: string) => {
    if (code === activeModuleCode) {
      setOpen(false);
      return;
    }

    try {
      setLoading(true);
      const res = await setActiveModule(code, false);
      if (res.success) {
        onCloseMobile?.();
        window.location.href = res.redirectUrl;
      }
    } catch (e) {
      console.error("[ModuleSwitcher] switch error:", e);
      setLoading(false);
    }
  };

  const activeModule = data?.modules.find(m => m.code === activeModuleCode) || {
    code: activeModuleCode,
    name: activeModuleCode === "VEHICLE_DESK" 
      ? "Vehicle Module" 
      : activeModuleCode === "DESIGN_TRACKING" 
      ? "Design Tracking" 
      : "Workspace Module",
    description: null,
    icon: "FolderKanban",
    route_path: activeModuleCode === "VEHICLE_DESK" ? "/vehicle" : activeModuleCode === "DESIGN_TRACKING" ? "/design" : "/",
    display_order: 1,
    is_active: true
  };

  const ActiveIcon = getModuleIcon(activeModule.code);
  const activeTheme = getModuleTheme(activeModule.code);

  // If user only has access to 1 module and cannot switch, render simple badge
  const hasMultipleModules = (data?.modules?.length || 0) > 1;

  if (isCompact) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <AppButton
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => hasMultipleModules && setOpen(!open)}
          title={`Active: ${activeModule.name}${hasMultipleModules ? ' (Click to switch module)' : ''}`}
          className={`h-9 w-9 mx-auto rounded-xl flex items-center justify-center transition-all ${
            hasMultipleModules 
              ? "hover:scale-105 active:scale-95 cursor-pointer" 
              : "cursor-default"
          } ${activeTheme.bg} ${activeTheme.color} border ${activeTheme.border}`}
        >
          <ActiveIcon className="h-4 w-4" />
        </AppButton>

        {open && hasMultipleModules && (
          <div className="absolute left-full ml-2 top-0 z-50 w-64 rounded-2xl bg-surface dark:bg-[#0B0F19] border border-border shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50 flex items-center justify-between">
              <span>Switch Workspace</span>
              <ArrowRightLeft className="h-3 w-3" />
            </div>

            <div className="py-1.5 space-y-1">
              {data?.modules.map((mod) => {
                const ModIcon = getModuleIcon(mod.code);
                const modTheme = getModuleTheme(mod.code);
                const isCurrent = mod.code === activeModuleCode;

                return (
                  <AppButton
                    key={mod.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleSelectModule(mod.code)}
                    disabled={loading}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                      isCurrent
                        ? `${modTheme.bg} ${modTheme.color} font-bold`
                        : "text-foreground/80 hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <ModIcon className={`h-4 w-4 shrink-0 ${modTheme.color}`} />
                    <span className="flex-1 truncate">{mod.name}</span>
                    {isCurrent && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </AppButton>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-border/50">
              <a
                href="/select-module"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
              >
                <span>Select on Login Portal</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <AppButton
        type="button"
        variant="ghost"
        onClick={() => hasMultipleModules && setOpen(!open)}
        disabled={!hasMultipleModules}
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all text-left group ${
          hasMultipleModules
            ? "hover:border-accent/40 active:scale-[0.99] cursor-pointer"
            : "cursor-default border-transparent"
        } ${activeTheme.bg} ${activeTheme.border}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${activeTheme.bg} ${activeTheme.color} shadow-sm`}>
            <ActiveIcon className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80 flex items-center gap-1">
              Active Module
              {hasMultipleModules && (
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              )}
            </span>
            <span className="text-xs font-bold text-foreground truncate">
              {activeModule.name}
            </span>
          </div>
        </div>

        {hasMultipleModules && (
          <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-foreground" : "group-hover:text-foreground"}`} />
        )}
      </AppButton>

      {/* Dropdown Menu */}
      {open && hasMultipleModules && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-surface dark:bg-[#0B0F19] border border-border shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50 flex items-center justify-between">
            <span>Available Modules</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-foreground/70 font-medium">
              {data?.modules.length} Access
            </span>
          </div>

          <div className="py-1.5 space-y-1">
            {data?.modules.map((mod) => {
              const ModIcon = getModuleIcon(mod.code);
              const modTheme = getModuleTheme(mod.code);
              const isCurrent = mod.code === activeModuleCode;

              return (
                <AppButton
                  key={mod.id}
                  type="button"
                  variant="ghost"
                  onClick={() => handleSelectModule(mod.code)}
                  disabled={loading}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                    isCurrent
                      ? `${modTheme.bg} ${modTheme.color} font-bold shadow-sm`
                      : "text-foreground/80 hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${modTheme.bg} ${modTheme.color}`}>
                    <ModIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate leading-tight">{mod.name}</span>
                    {mod.is_default && (
                      <span className="text-[9px] text-amber-500 font-medium leading-none mt-0.5">★ Default</span>
                    )}
                  </div>
                  {isCurrent && <Check className="h-3.5 w-3.5 shrink-0" />}
                </AppButton>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between px-1">
            <a
              href="/select-module"
              onClick={() => onCloseMobile?.()}
              className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1 py-1"
            >
              <span>Switch on Login</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>

            <span className="text-[10px] text-muted">
              Auto-persisted
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
