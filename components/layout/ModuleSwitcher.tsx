/* eslint-disable no-restricted-syntax */
"use client";


import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { 
  FolderKanban, 
  Car, 
  Compass, 
  Layers, 
  LineChart,
  ChevronDown, 
  Check, 
  ExternalLink,
  Star
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import type { UserModulesResult } from "@/lib/actions/module-switcher";
import { cn } from "@/lib/utils";

interface ModuleSwitcherProps {
  isCompact?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

// Module-level cached promise: fetch once per session, not on every route change
let cachedModulesPromise: Promise<UserModulesResult> | null = null;
function getCachedModules(): Promise<UserModulesResult> {
  if (!cachedModulesPromise) {
    cachedModulesPromise = fetch("/api/modules")
      .then((res) => res.json())
      .catch((err) => {
        cachedModulesPromise = null;
        throw err;
      });
  }
  return cachedModulesPromise;
}

const CORE_MAIN_MODULE_CODES = new Set(["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING", "DASHBOARDS"]);

export default function ModuleSwitcher({ isCompact = false, onCloseMobile, className = "" }: ModuleSwitcherProps) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<UserModulesResult | null>(null);

  // Auto-detect current active module strictly based on route
  const activeModuleCode = React.useMemo(() => {
    if (pathname.startsWith("/vehicle")) return "VEHICLE_DESK";
    if (pathname.startsWith("/design")) return "DESIGN_TRACKING";
    if (pathname.startsWith("/dashboards")) return "DASHBOARDS";
    return "TASK_WORKFLOW";
  }, [pathname]);

  // Synchronize client-side active_module cookie when navigating across module boundaries
  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )active_module=([^;]*)/);
      const currentCookie = match ? match[1] : null;
      if (currentCookie !== activeModuleCode) {
        document.cookie = `active_module=${activeModuleCode}; path=/; max-age=2592000; SameSite=Lax`;
      }
    }
  }, [activeModuleCode]);

  useEffect(() => {
    let isMounted = true;
    getCachedModules()
      .then((res: UserModulesResult) => {
        if (isMounted) {
          const filteredModules = (res.modules || []).filter((m) => CORE_MAIN_MODULE_CODES.has(m.code));
          setData({
            ...res,
            modules: filteredModules,
          });
        }
      })
      .catch((err) => {
        console.error("[ModuleSwitcher] error fetching modules:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getModuleIcon = (code: string) => {
    switch (code) {
      case "TASK_WORKFLOW":
        return FolderKanban;
      case "VEHICLE_DESK":
        return Car;
      case "DESIGN_TRACKING":
        return Compass;
      case "DASHBOARDS":
        return LineChart;
      default:
        return Layers;
    }
  };

  const handleSetDefaultModule = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleCode: code, setAsDefault: true }),
      });
      const resData = await res.json();
      if (resData.success) {
        if (data) {
          const updated = {
            ...data,
            modules: data.modules.map((m) => ({
              ...m,
              is_default: m.code === code,
            })),
            defaultModule: data.modules.find((m) => m.code === code) || null,
            hasExplicitDefault: true,
          };
          setData(updated);
          cachedModulesPromise = Promise.resolve(updated);
        }
      }
    } catch (e) {
      console.error("[ModuleSwitcher] setDefault error:", e);
    }
  };

  const handleSelectModule = async (code: string) => {
    if (code === activeModuleCode) {
      setOpen(false);
      return;
    }

    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleCode: code, setAsDefault: false }),
      });
      const resData = await res.json();
      if (resData.success) {
        onCloseMobile?.();
        window.location.href =
          resData.redirectUrl ||
          (code === "VEHICLE_DESK"
            ? "/vehicle"
            : code === "DESIGN_TRACKING"
            ? "/design/matrix"
            : code === "DASHBOARDS"
            ? "/dashboards"
            : "/");
      }
    } catch (e) {
      console.error("[ModuleSwitcher] switch error:", e);
    }
  };

  const activeModule = data?.modules.find((m) => m.code === activeModuleCode) || {
    code: activeModuleCode,
    name:
      activeModuleCode === "VEHICLE_DESK"
        ? "Vehicle Module"
        : activeModuleCode === "DESIGN_TRACKING"
        ? "Design Tracking"
        : activeModuleCode === "DASHBOARDS"
        ? "Dashboards"
        : "Workspace Module",
    description: null,
    icon: "FolderKanban",
    route_path:
      activeModuleCode === "VEHICLE_DESK"
        ? "/vehicle"
        : activeModuleCode === "DESIGN_TRACKING"
        ? "/design/matrix"
        : activeModuleCode === "DASHBOARDS"
        ? "/dashboards"
        : "/",
    display_order: 1,
    is_active: true,
  };

  const ActiveIcon = getModuleIcon(activeModule.code);
  const hasMultipleModules = (data?.modules?.length || 0) > 1;

  // Single module presentation: Render a clean, non-interactive label (not a 50% opacity disabled button)
  if (!hasMultipleModules) {
    if (isCompact) {
      return (
        <div
          className={cn("h-9 w-9 mx-auto rounded-lg flex items-center justify-center bg-accent-soft text-accent-soft-text border border-border/40", className)}
          title={`Active: ${activeModule.name}`}
        >
          <ActiveIcon className="h-4 w-4" />
        </div>
      );
    }

    return (
      <div className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/50 bg-sunken select-none", className)}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-accent-soft text-accent-soft-text">
          <ActiveIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Active Module
          </span>
          <span className="text-xs font-semibold text-foreground truncate">
            {activeModule.name}
          </span>
        </div>
      </div>
    );
  }

  // Multiple modules presentation with Radix Popover (portalled to prevent clipping)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {isCompact ? (
          <button
            type="button"
            aria-label={`Current module: ${activeModule.name}. Click to switch module`}
            className={cn(
              "h-9 w-9 mx-auto rounded-lg flex items-center justify-center transition-colors bg-accent-soft text-accent-soft-text border border-border hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          >
            <ActiveIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={`Current module: ${activeModule.name}. Click to switch module`}
            className={cn(
              "w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-primary text-primary-foreground shadow-xs">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
                  Active Module
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                <span className="text-xs font-semibold text-foreground truncate">
                  {activeModule.name}
                </span>
              </div>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform duration-200 shrink-0", open && "rotate-180 text-foreground")} />
          </button>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          side={isCompact ? "right" : "bottom"}
          sideOffset={8}
          className="z-[var(--z-popover)] w-72 rounded-xl bg-elevated border border-border p-2 shadow-xl outline-none animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border flex items-center justify-between">
            <span>Switch Module</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sunken text-subtle font-semibold tabular-nums">
              {data?.modules.length} Available
            </span>
          </div>

          <div className="py-1.5 space-y-1">
            {data?.modules.map((mod) => {
              const ModIcon = getModuleIcon(mod.code);
              const isCurrent = mod.code === activeModuleCode;

              return (
                <div
                  key={mod.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-1.5 rounded-lg transition-colors",
                    isCurrent
                      ? "bg-selected border border-border/50"
                      : "hover:bg-surface-hover"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectModule(mod.code)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded py-0.5"
                  >
                    <div
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                        isCurrent
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-sunken text-muted"
                      )}
                    >
                      <ModIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={cn("text-xs leading-snug font-semibold truncate", isCurrent ? "text-foreground" : "text-subtle")}>
                        {mod.name}
                      </span>
                      {mod.is_default && (
                        <span className="text-[10px] text-warning-text font-medium flex items-center gap-0.5">
                          Default Login
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleSetDefaultModule(e, mod.code)}
                      title={mod.is_default ? "Default login module" : "Set as default login module"}
                      aria-label={mod.is_default ? "Default login module" : `Set ${mod.name} as default login module`}
                      className={cn(
                        "p-1 rounded text-muted hover:text-warning transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        mod.is_default && "text-warning"
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", mod.is_default && "fill-current")} />
                    </button>
                    {isCurrent && (
                      <Check className="h-3.5 w-3.5 text-primary ml-0.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between px-2">
            <a
              href="/select-module"
              onClick={() => onCloseMobile?.()}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 py-1"
            >
              <span>Manage Modules</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
