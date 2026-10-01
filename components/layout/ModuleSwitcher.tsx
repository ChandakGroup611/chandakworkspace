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
import type { ModuleInfo, UserModulesResult } from "@/lib/actions/module-switcher";
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
    fetch("/api/modules")
      .then((res) => res.json())
      .then((res: UserModulesResult) => {
        if (isMounted) {
          setData(res);
        }
      })
      .catch((err) => {
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
    return {
      color: "text-theme-btn-primary",
      bg: "bg-theme-btn-primary/10",
      border: "border-theme-btn-primary/30",
      dot: "bg-theme-btn-primary"
    };
  };

  const handleSetDefaultModule = async (e: React.MouseEvent, code: string, name: string) => {
    e.stopPropagation();
    try {
      setLoading(true);
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleCode: code, setAsDefault: true })
      });
      const resData = await res.json();
      if (resData.success) {
        if (data) {
          setData({
            ...data,
            modules: data.modules.map(m => ({
              ...m,
              is_default: m.code === code
            })),
            defaultModule: data.modules.find(m => m.code === code) || null,
            hasExplicitDefault: true
          });
        }
      }
    } catch (e) {
      console.error("[ModuleSwitcher] setDefault error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectModule = async (code: string) => {
    if (code === activeModuleCode) {
      setOpen(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleCode: code, setAsDefault: false })
      });
      const resData = await res.json();
      if (resData.success) {
        onCloseMobile?.();
        window.location.href = resData.redirectUrl || "/workspaces/tasks";
      } else {
        setLoading(false);
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
    route_path: activeModuleCode === "VEHICLE_DESK" ? "/vehicle/dashboard" : activeModuleCode === "DESIGN_TRACKING" ? "/design/dashboard" : "/workspaces/tasks",
    display_order: 1,
    is_active: true
  };

  const ActiveIcon = getModuleIcon(activeModule.code);
  const activeTheme = getModuleTheme(activeModule.code);

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
          <div className="absolute left-full ml-2 top-0 z-50 w-72 rounded-2xl bg-surface dark:bg-[#0B0F19] border border-border shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/50 flex items-center justify-between">
              <span>Switch Workspace</span>
              <ArrowRightLeft className="h-3 w-3" />
            </div>

            <div className="py-2 space-y-1.5">
              {data?.modules.map((mod) => {
                const ModIcon = getModuleIcon(mod.code);
                const modTheme = getModuleTheme(mod.code);
                const isCurrent = mod.code === activeModuleCode;

                return (
                  <div
                    key={mod.id}
                    onClick={() => handleSelectModule(mod.code)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? `${modTheme.bg} ${modTheme.color} font-bold`
                        : "text-foreground/80 hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ModIcon className={`h-4 w-4 shrink-0 ${modTheme.color}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{mod.name}</span>
                        {mod.is_default && (
                          <span className="text-[9px] text-amber-500 font-semibold">★ Default Login</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!mod.is_default && (
                        <button
                          type="button"
                          onClick={(e) => handleSetDefaultModule(e, mod.code, mod.name)}
                          title="Set as default login module"
                          className="p-1 rounded text-[10px] text-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        >
                          ☆ Set Default
                        </button>
                      )}
                      {isCurrent && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/50">
              <a
                href="/select-module"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface-hover"
              >
                <span>Change Default Module</span>
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
            ? "hover:border-theme-btn-primary/40 active:scale-[0.99] cursor-pointer"
            : "cursor-default border-transparent"
        } bg-surface/80 border-border shadow-xs`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-theme-btn-primary/10 text-theme-btn-primary shadow-xs">
            <ActiveIcon className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              Active Module
              {hasMultipleModules && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </span>
            <span className="text-xs font-semibold text-foreground truncate">
              {activeModule.name}
            </span>
          </div>
        </div>

        {hasMultipleModules && (
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${open ? "rotate-180 text-foreground" : "group-hover:text-foreground"}`} />
        )}
      </AppButton>

      {/* Dropdown Menu */}
      {open && hasMultipleModules && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-surface border border-border shadow-2xl p-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex items-center justify-between">
            <span>Switch Module</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated text-muted-foreground font-semibold">
              {data?.modules.length} Available
            </span>
          </div>

          <div className="py-2 space-y-1">
            {data?.modules.map((mod) => {
              const ModIcon = getModuleIcon(mod.code);
              const isCurrent = mod.code === activeModuleCode;

              return (
                <div
                  key={mod.id}
                  onClick={() => handleSelectModule(mod.code)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-theme-btn-primary/10 text-theme-btn-primary font-bold border border-theme-btn-primary/20 shadow-xs"
                      : "text-foreground hover:bg-elevated"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${isCurrent ? 'bg-theme-btn-primary text-white' : 'bg-elevated text-muted-foreground'}`}>
                      <ModIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate leading-tight font-medium">{mod.name}</span>
                      {mod.is_default && (
                        <span className="text-[9px] text-amber-500 font-semibold mt-0.5">★ Default Login</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!mod.is_default && (
                      <button
                        type="button"
                        onClick={(e) => handleSetDefaultModule(e, mod.code, mod.name)}
                        title="Set this as your default module on login"
                        className="px-2 py-0.5 rounded-md text-[10px] text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all font-medium"
                      >
                        ☆ Set Default
                      </button>
                    )}
                    {isCurrent && <Check className="h-3.5 w-3.5 text-theme-btn-primary shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between px-1">
            <a
              href="/select-module"
              onClick={() => onCloseMobile?.()}
              className="text-[11px] font-semibold text-theme-btn-primary hover:underline flex items-center gap-1 py-1"
            >
              <span>Manage Modules</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
