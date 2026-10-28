"use client";

/**
 * v1 always showed Task Workflow tabs (Tasks / Tickets / Reqs), even inside Vehicle Desk
 * and Design Tracking. Tabs now follow the active module. Also: solid surface instead of
 * a blurred translucent bar (blur was globally disabled), no glow/pulse on the active tab,
 * aria-current, and safe-area padding.
 */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Ticket, FileCheck2, Menu, Car, Calendar, Wrench, Layers, FileText, CheckCircle2, LineChart, Video, Wallet, Settings2 } from "lucide-react";
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
  meet: [
    { label: "Overview", href: "/meet", icon: LayoutDashboard, match: (p) => p === "/meet" },
    { label: "Meetings", href: "/meet/meetings", icon: Video, match: (p) => p.startsWith("/meet/meetings") || p.startsWith("/meet/sessions") || p.startsWith("/meet/live") },
    { label: "My Work", href: "/meet/my-work", icon: CheckCircle2, match: (p) => p.startsWith("/meet/my-work") },
    { label: "Calendar", href: "/meet/calendar", icon: Calendar, match: (p) => p.startsWith("/meet/calendar") },
  ],
  budget: [
    { label: "Projects", href: "/budget", icon: Wallet, match: (p) => p === "/budget" || /^\/budget\/\d+/.test(p) },
    { label: "Access", href: "/budget/admin/access", icon: Settings2, match: (p) => p.startsWith("/budget/admin/access") },
    { label: "Fields", href: "/budget/admin/fields", icon: Layers, match: (p) => p.startsWith("/budget/admin/fields") },
  ],
};

export default function MobileBottomNav({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname() || "/";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  let key = pathname.startsWith("/budget") ? "budget" : pathname.startsWith("/meet") ? "meet" : pathname.startsWith("/vehicle") ? "vehicle" : pathname.startsWith("/design") ? "design" : pathname.startsWith("/dashboards") ? "dashboards" : "task";
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
  const tabs = TABS[key];

  const item = "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[11px] transition-colors";

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
