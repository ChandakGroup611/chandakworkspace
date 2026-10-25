"use client";

/**
 * ModuleSwitcher v2
 * - Radix Popover: keyboard + touch accessible, and portalled, so the menu is no longer
 *   clipped by the sidebar (v1 used absolute positioning inside an overflow container).
 * - Module rows are real buttons (v1: clickable <div>s with a <button> nested inside).
 * - With only one module the control is a plain label; v1 rendered a *disabled* button
 *   at 50% opacity, so the current module always looked greyed out.
 * - Module list is fetched once per session, not on every route change.
 * - Active-module icon uses --btn-primary-text (v1 forced white, unreadable on the
 *   yellow / cyan / emerald primaries of the old themes).
 */
import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { FolderKanban, Car, Compass, Layers, LineChart, Video, ChevronsUpDown, Check, Star, Loader2, ExternalLink } from "lucide-react";
import type { UserModulesResult } from "@/lib/actions/module-switcher";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  TASK_WORKFLOW: FolderKanban,
  VEHICLE_DESK: Car,
  DESIGN_TRACKING: Compass,
  DASHBOARDS: LineChart,
  CHANDAK_MEET: Video,
};
const FALLBACK_NAMES: Record<string, string> = {
  TASK_WORKFLOW: "Task Workflow",
  VEHICLE_DESK: "Vehicle Desk",
  DESIGN_TRACKING: "Design Tracking",
  DASHBOARDS: "Dashboards",
  CHANDAK_MEET: "Chandak Meet",
};
const FALLBACK_ROUTES: Record<string, string> = {
  TASK_WORKFLOW: "/",
  VEHICLE_DESK: "/vehicle",
  DESIGN_TRACKING: "/design/matrix",
  DASHBOARDS: "/dashboards",
  CHANDAK_MEET: "/meet",
};
const CORE = new Set(Object.keys(ICONS));

let modulesCache: Promise<UserModulesResult | null> | null = null;
function loadModules() {
  if (!modulesCache) {
    modulesCache = fetch("/api/modules")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return modulesCache;
}

function moduleFromPath(pathname: string) {
  if (pathname.startsWith("/vehicle")) return "VEHICLE_DESK";
  if (pathname.startsWith("/design")) return "DESIGN_TRACKING";
  if (pathname.startsWith("/dashboards")) return "DASHBOARDS";
  if (pathname.startsWith("/meet")) return "CHANDAK_MEET";
  if (pathname.startsWith("/settings") || pathname === "/profile") {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|; )active_module=([^;]*)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
    }
  }
  return "TASK_WORKFLOW";
}

export default function ModuleSwitcher({ isCompact = false, onCloseMobile, className = "" }: { isCompact?: boolean; onCloseMobile?: () => void; className?: string }) {
  const pathname = usePathname() || "/";
  const activeCode = moduleFromPath(pathname);
  const [data, setData] = useState<UserModulesResult | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadModules().then((res) => {
      if (alive && res) setData({ ...res, modules: (res.modules || []).filter((m) => CORE.has(m.code)) });
    });
    return () => { alive = false; };
  }, []);

  // keep the cookie in sync when the user crosses module boundaries (do not overwrite on shared preference routes)
  useEffect(() => {
    if (pathname.startsWith("/settings") || pathname === "/profile") {
      return;
    }
    const m = document.cookie.match(/(?:^|; )active_module=([^;]*)/);
    if ((m ? m[1] : null) !== activeCode) {
      document.cookie = `active_module=${activeCode}; path=/; max-age=2592000; SameSite=Lax`;
    }
  }, [activeCode, pathname]);

  const modules = data?.modules ?? [];
  const active = useMemo(
    () => modules.find((m) => m.code === activeCode) ?? { code: activeCode, name: FALLBACK_NAMES[activeCode] ?? "Workspace" },
    [modules, activeCode]
  );
  const ActiveIcon = ICONS[active.code] ?? Layers;
  const canSwitch = modules.length > 1;

  const selectModule = async (code: string) => {
    if (code === activeCode) return setOpen(false);
    setBusy(code);
    try {
      const res = await fetch("/api/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleCode: code, setAsDefault: false }) });
      const json = await res.json();
      if (json.success) {
        onCloseMobile?.();
        window.location.href = json.redirectUrl || FALLBACK_ROUTES[code] || "/";
        return;
      }
    } catch (e) {
      console.error("[ModuleSwitcher] switch failed", e);
    }
    setBusy(null);
  };

  const setDefault = async (code: string) => {
    setBusy(`default:${code}`);
    try {
      const res = await fetch("/api/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleCode: code, setAsDefault: true }) });
      const json = await res.json();
      if (json.success && data) {
        setData({ ...data, modules: data.modules.map((m) => ({ ...m, is_default: m.code === code })), defaultModule: data.modules.find((m) => m.code === code) || null, hasExplicitDefault: true });
        modulesCache = null;
      }
    } catch (e) {
      console.error("[ModuleSwitcher] set default failed", e);
    } finally {
      setBusy(null);
    }
  };

  const iconTile = (Icon: React.ElementType, on: boolean) => (
    <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md", on ? "bg-primary text-primary-foreground" : "bg-sidebar-hover text-sidebar-muted")}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );

  const trigger = isCompact ? (
    <button
      type="button"
      disabled={!canSwitch}
      aria-label={`Current module: ${active.name}${canSwitch ? ". Switch module" : ""}`}
      title={active.name}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-active text-sidebar-active-foreground enabled:hover:brightness-95 disabled:cursor-default"
    >
      <ActiveIcon className="h-4 w-4" aria-hidden />
    </button>
  ) : (
    <button
      type="button"
      disabled={!canSwitch}
      aria-label={canSwitch ? `Current module: ${active.name}. Switch module` : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border px-2 py-1.5 text-left transition-colors disabled:cursor-default",
        canSwitch && "hover:bg-sidebar-hover"
      )}
    >
      {iconTile(ActiveIcon, true)}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] leading-4 text-sidebar-muted">Module</span>
        <span className="truncate text-[13px] font-semibold leading-5 text-sidebar-foreground">{active.name}</span>
      </span>
      {canSwitch && <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-muted" aria-hidden />}
    </button>
  );

  return (
    <Popover.Root open={open && canSwitch} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={isCompact ? "right" : "bottom"}
          align="start"
          sideOffset={8}
          className={cn("z-[var(--z-popover)] w-72 rounded-[10px] border border-border bg-elevated p-1.5 text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0", className)}
        >
          <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
            <span className="theme-label">Switch module</span>
            <span className="text-[11px] text-muted tabular">{modules.length} available</span>
          </div>
          <ul className="space-y-0.5">
            {modules.map((m) => {
              const Icon = ICONS[m.code] ?? Layers;
              const current = m.code === activeCode;
              return (
                <li key={m.code} className={cn("flex items-center gap-1 rounded-md pr-1", current ? "bg-accent-soft" : "hover:bg-surface-hover")}>
                  <button
                    type="button"
                    onClick={() => selectModule(m.code)}
                    aria-current={current ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left"
                  >
                    <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md", current ? "bg-primary text-primary-foreground" : "bg-sunken text-muted")}>
                      {busy === m.code ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[13px]", current ? "font-semibold text-accent-soft-text" : "font-medium")}>{m.name}</span>
                      {m.is_default && <span className="block text-[11px] text-muted">Opens after login</span>}
                    </span>
                    {current && <Check className="h-4 w-4 shrink-0 text-accent-soft-text" aria-hidden />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefault(m.code)}
                    disabled={!!m.is_default || busy === `default:${m.code}`}
                    aria-label={m.is_default ? `${m.name} is your default module` : `Make ${m.name} my default module`}
                    title={m.is_default ? "Default after login" : "Set as default after login"}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:bg-sunken hover:text-foreground disabled:cursor-default"
                  >
                    <Star className={cn("h-3.5 w-3.5", m.is_default && "fill-warning text-warning")} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-border pt-1">
            <a href="/select-module?choose=1" onClick={() => onCloseMobile?.()} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-accent-soft-text hover:bg-surface-hover">
              Manage modules <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
