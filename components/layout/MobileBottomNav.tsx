"use client";

/**
 * v1 always showed Task Workflow tabs (Tasks / Tickets / Reqs), even inside Vehicle Desk
 * and Design Tracking. Tabs now follow the active module. Also: solid surface instead of
 * a blurred translucent bar (blur was globally disabled), no glow/pulse on the active tab,
 * aria-current, and safe-area padding.
 * AMC (part of Task Workflow's admin area) gets its own tabs while inside /amc, with Home to go
 * back, instead of the Tasks / Tickets / Requirements set. Tap targets are at least 44px.
 */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Ticket, FileCheck2, Menu, Car, Calendar, Wrench, Layers, FileText, CheckCircle2, LineChart, Video, Wallet, Settings2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { label: string; href: string; icon: React.ElementType; match: (p: string) => boolean };

const TABS: Record<string, Tab[]> = {
  task: [
    { label: "Home", href: "/", icon: LayoutDashboard, match: (p) => p === "/" },
    { label: "Tasks", href: "/workspaces/tasks", icon: FolderKanban, match: (p) => p.startsWith("/workspaces") || p.startsWith("/tasks") },
    { label: "Tickets", href: "/tickets", icon: Ticket, match: (p) => p.startsWith("/tickets") || p.startsWith("/support") },
    { label: "Requirements", href: "/requirements", icon: FileCheck2, match: (p) => p.startsWith("/requirements") },
  ],
  vehicle: [
    { label: "Fleet", href: "/vehicle", icon: LayoutDashboard, match: (p) => p === "/vehicle" || p === "/vehicle/dashboard" },
    { label: "Vehicles", href: "/vehicle/inventory", icon: Car, match: (p) => p.startsWith("/vehicle/inventory") },
    { label: "Trips", href: "/vehicle/trips", icon: Calendar, match: (p) => p.startsWith("/vehicle/trips") },
    { label: "Service", href: "/vehicle/maintenance", icon: Wrench, match: (p) => p.startsWith("/vehicle/maintenance") },
  ],
  design: [
    { label: "Matrix", href: "/design/matrix", icon: Layers, match: (p) => p === "/design" || p.startsWith("/design/matrix") },
    { label: "Drawings", href: "/design/drawings", icon: FileText, match: (p) => p.startsWith("/design/drawings") },
    { label: "Approvals", href: "/design/approvals", icon: CheckCircle2, match: (p) => p.startsWith("/design/approvals") },
    { label: "Reports", href: "/design/reports", icon: LineChart, match: (p) => p.startsWith("/design/reports") },
  ],
  dashboards: [
    { label: "All", href: "/dashboards", icon: LayoutDashboard, match: (p) => p === "/dashboards" },
    { label: "IT", href: "/dashboards/it", icon: LineChart, match: (p) => p.startsWith("/dashboards/it") },
    { label: "Marketing", href: "/dashboards/mkt", icon: LineChart, match: (p) => p.startsWith("/dashboards/mkt") },
  ],
  amc: [
    { label: "Home", href: "/", icon: LayoutDashboard, match: (p) => p === "/" },
    { label: "Contracts", href: "/amc", icon: ShieldCheck, match: (p) => p === "/amc" },
    { label: "Analytics", href: "/amc/analytics", icon: LineChart, match: (p) => p.startsWith("/amc/analytics") },
    { label: "Reports", href: "/amc/reports", icon: FileText, match: (p) => p.startsWith("/amc/reports") },
  ],
  meet: [
    { label: "Overview", href: "/meet", icon: LayoutDashboard, match: (p) => p === "/meet" },
    { label: "Meetings", href: "/meet/meetings", icon: Video, match: (p) => p.startsWith("/meet/meetings") || p.startsWith("/meet/sessions") || p.startsWith("/meet/live") },
    { label: "My Work", href: "/meet/my-work", icon: CheckCircle2, match: (p) => p.startsWith("/meet/my-work") },
    { label: "Calendar", href: "/meet/calendar", icon: Calendar, match: (p) => p.startsWith("/meet/calendar") },
  ],
};

function getBudgetTabs(projectId?: string | null): Tab[] {
  const p = `/budget/${projectId && /^\d+$/.test(projectId) ? projectId : "1"}`;
  return [
    { label: "Projects", href: "/budget", icon: FolderKanban, match: (path) => path === "/budget" },
    { label: "Overview", href: `${p}/overview`, icon: LayoutDashboard, match: (path) => path.endsWith("/overview") },
    { label: "Entry", href: `${p}/entry`, icon: Layers, match: (path) => path.endsWith("/entry") || path.endsWith("/import") || path.endsWith("/compare") },
    { label: "Reports", href: `${p}/summary`, icon: LineChart, match: (path) => path.endsWith("/summary") || path.endsWith("/detail") || path.endsWith("/periods") || path.endsWith("/incurred") },
    { label: "Setup", href: `${p}/setup`, icon: Settings2, match: (path) => path.endsWith("/setup") || path.startsWith("/budget/admin") },
  ];
}

export default function MobileBottomNav({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname() || "/";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  let key = pathname.startsWith("/budget") ? "budget" : pathname.startsWith("/meet") ? "meet" : pathname.startsWith("/vehicle") ? "vehicle" : pathname.startsWith("/design") ? "design" : pathname.startsWith("/dashboards") ? "dashboards" : pathname.startsWith("/amc") ? "amc" : "task";
  if (pathname.startsWith("/settings") || pathname === "/profile") {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|; )active_module=([^;]*)/);
      const mod = m ? decodeURIComponent(m[1]) : "";
      if (mod === "CHANDAK_MEET") key = "meet";
      else if (mod === "ORG_BUDGET") key = "budget";
      else if (mod === "VEHICLE_DESK") key = "vehicle";
      else if (mod === "DESIGN_TRACKING") key = "design";
      else if (mod === "DASHBOARDS") key = "dashboards";
      else key = "task";
    }
  }

  let budgetPid: string | null = null;
  if (key === "budget") {
    const bm = pathname.match(/^\/budget\/(\d+)/);
    if (bm) budgetPid = bm[1];
    else if (typeof document !== "undefined") {
      const cm = document.cookie.match(/(?:^|; )active_budget_project=([^;]*)/);
      if (cm) budgetPid = decodeURIComponent(cm[1]);
    }
  }

  const tabs = key === "budget" ? getBudgetTabs(budgetPid) : TABS[key];

  const item = "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[11px] transition-colors";

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-[var(--z-mobile-nav)] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch gap-1 px-2">
        {tabs.map((t) => {
          const on = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={cn(item, on ? "font-semibold text-accent-soft-text" : "text-muted hover:text-foreground")}>
              <span className={cn("inline-flex h-7 w-12 items-center justify-center rounded-full", on && "bg-accent-soft")}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="max-w-[72px] truncate">{t.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={onOpenMobileMenu} className={cn(item, "text-muted hover:text-foreground")}>
          <span className="inline-flex h-7 w-12 items-center justify-center"><Menu className="h-5 w-5" aria-hidden /></span>
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
