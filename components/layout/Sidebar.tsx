"use client";

/**
 * Sidebar v2 — what changed (nav data and permission rules are unchanged from v1)
 * - Uses the --sidebar-* tokens, so themes can have a dark navigation rail on a light page.
 *   v1 used .theme-card-structural, which gave the rail rounded corners and, in some themes,
 *   overflow:hidden that clipped the collapse button and the compact module menu.
 * - Collapsed mode no longer expands on mouse hover. v1 widened the rail on hover AND
 *   broadcast that to the layout, so the whole page reflowed every time the mouse crossed it.
 *   Collapsed state is remembered.
 * - Exactly one item looks "active". v1 highlighted every expanded group as active too.
 * - No hover bold / slide / icon rotate (text jitter).
 * - aria-current, aria-expanded, nav landmark, labelled icon buttons, Esc closes mobile menu.
 * - Removed React <Profiler> + useRenderLog from the production render path.
 */
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard, Ticket, FileCheck2, ShieldAlert, Settings, Database, FolderKanban,
  ChevronLeft, ShieldCheck, ChevronRight, UserCheck, Users, ChevronDown, BookOpen, LineChart,
  Trash2, LifeBuoy, Car, Wrench, Package, Calendar, Layers, PlusCircle, Clock, Settings2,
  FileText, CheckCircle2, RotateCcw, Building2, Send, HelpCircle, Key, FolderTree, X,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useFleetPermissions } from "@/hooks/useFleetPermissions";
import type { FleetFunctionalModule } from "@/types/vehicleRbacTypes";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getTheme } from "@/components/theme/theme-registry";
import { cn } from "@/lib/utils";
import ModuleSwitcher from "./ModuleSwitcher";

const COMPACT_KEY = "app_sidebar_compact";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  permission?: string;
  fleetModule?: FleetFunctionalModule;
  subItems?: {
    label: string;
    href: string;
    scopeParam?: string;
    permission?: string;
    fleetModule?: FleetFunctionalModule;
  }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const taskNavGroups: NavGroup[] = [
  {
    label: "Core Operations",
    items: [
      { 
        label: "Dashboard", 
        href: "/", 
        icon: LayoutDashboard,
        subItems: [
          { label: "Overview", href: "/?view=overview" },
          { label: "My Portfolio", href: "/?view=portfolio" }
        ]
      },
      { label: "My Support Portal", href: "/support", icon: LifeBuoy, permission: "SUPPORT_PORTAL_VIEW" },
      { label: "Ticket Tracking", href: "/tickets", icon: Ticket, permission: "TICKETS_VIEW" },
      { 
        label: "Requirements", 
        href: "/requirements", 
        icon: FileCheck2,
        permission: "REQUIREMENTS_VIEW",
        subItems: [
          { label: "Requirements Master", href: "/requirements", permission: "REQUIREMENTS_VIEW" },
          { label: "Requirement Approvals", href: "/requirements/approvals", permission: "REQUIREMENTS_APPROVALS_VIEW" },
          { label: "Reports & Analytics", href: "/requirements/reports", permission: "REQUIREMENTS_REPORTS_VIEW" }
        ]
      },
      { 
        label: "Workspaces", 
        href: "/workspaces", 
        icon: FolderKanban, 
        permission: "WORKSPACES_VIEW",
        subItems: [
          { label: "Workspace Master", href: "/workspaces", permission: "WORKSPACES_VIEW" },
          { label: "Enrolled Workspaces", href: "/workspaces/enrolled", permission: "ENROLLED_WORKSPACES_VIEW" },
          { label: "Workspace Tasks", href: "/workspaces/tasks", permission: "TASKS_VIEW" },
          { label: "Transfer Tasks", href: "/workspaces/transfer-tasks", permission: "TASKS_TRANSFER_VIEW" },
          { label: "Data Migration", href: "/migration", permission: "DATA_MIGRATION_VIEW" },
          { label: "Reports & Analytics", href: "/workspaces/reports", permission: "REPORTS_VIEW" }
        ]
      },
    ]
  },
  {
    label: "Governance & Analysis",
    items: [
      { label: "SLA Monitoring", href: "/sla", icon: ShieldAlert, permission: "SLA_VIEW" },
      { label: "AMC & Subscriptions", href: "/amc", icon: ShieldCheck, permission: "AMC_VIEW" },
      { label: "User Master", href: "/users", icon: Users, permission: "USERS_VIEW" },
      { label: "RBAC Access Policies", href: "/rbac", icon: Key, permission: "USERS_VIEW" },
      { label: "IAM Controls", href: "/iam", icon: UserCheck, permission: "IAM_VIEW" },
      { label: "Learning Hub", href: "/learning", icon: BookOpen },
    ]
  },
  {
    label: "System Base",
    items: [
      { 
        label: "Master Entities", 
        href: "/masters", 
        icon: Database,
        permission: "MASTERS_VIEW",
        subItems: [
          { label: "Company Master", href: "/masters/companies", permission: "COMPANIES_VIEW" },
          { label: "Vendor / Provider Master", href: "/masters/vendors", permission: "MASTERS_VIEW" },
          { label: "System Master", href: "/masters", permission: "SYSTEM_MASTERS_VIEW" }
        ]
      },
      { label: "Trash Data", href: "/compliance", icon: Trash2, permission: "TRASH_VIEW" },
      { 
        label: "Settings", 
        href: "/settings", 
        icon: Settings,
        permission: "SETTINGS_MANAGE",
        subItems: [
          { label: "Design Gallery", href: "/settings", permission: "SETTINGS_THEME_VIEW" },
          { label: "Identity & Access", href: "/settings/identity", permission: "SETTINGS_IDENTITY_VIEW" },
          { label: "Communication Center", href: "/settings/communication", permission: "SETTINGS_COMMUNICATION_VIEW" },
          { label: "Notifications", href: "/settings/notifications", permission: "SETTINGS_NOTIFICATIONS_VIEW" },
          { label: "Billing & Subscription", href: "/subscription", permission: "SETTINGS_MANAGE" }
        ]
      },
    ]
  }
];

const vehicleNavGroups: NavGroup[] = [
  {
    label: "Fleet Operations",
    items: [
      { label: "Fleet Dashboard", href: "/vehicle", icon: LayoutDashboard },
      { label: "Vehicle Inventory", href: "/vehicle/inventory", icon: Car, fleetModule: "VEHICLES" },
      { label: "Register Vehicle", href: "/vehicle/register", icon: PlusCircle, fleetModule: "REGISTER" },
      { label: "Daily Trip Sheets", href: "/vehicle/trips", icon: Calendar, fleetModule: "TRIPS" },
      { label: "Driver Roster", href: "/vehicle/drivers", icon: Users, fleetModule: "DRIVERS" },
      { label: "Traveler Allocations", href: "/vehicle/travelers", icon: UserCheck, fleetModule: "TRAVELERS" },
    ]
  },
  {
    label: "Service & Assets",
    items: [
      { label: "Document Vault", href: "/vehicle/documents", icon: FileCheck2, fleetModule: "VEHICLES" },
      { label: "Service Bills & Job Cards", href: "/vehicle/maintenance", icon: Wrench, fleetModule: "MAINTENANCE" },
      { label: "Parts & Accessories", href: "/vehicle/parts", icon: Package, fleetModule: "PARTS" },
      { label: "Insurance Vendor Master", href: "/vehicle/vendors", icon: ShieldCheck, fleetModule: "VENDORS" },
      { label: "Compliance & Alerts", href: "/vehicle/alerts", icon: ShieldAlert, fleetModule: "ALERTS" },
    ]
  },
  {
    label: "Analytics & System",
    items: [
      { label: "Fleet Reports", href: "/vehicle/reports", icon: LineChart, fleetModule: "REPORTS" },
      { label: "My Assigned Vehicles", href: "/vehicle/my-garage", icon: LifeBuoy, fleetModule: "MY_GARAGE" },
      { label: "Fleet Guidelines / SOPs", href: "/vehicle/learning", icon: BookOpen, fleetModule: "LEARNING" },
      { label: "RBAC Access Policies", href: "/vehicle/rbac", icon: Key, fleetModule: "RBAC" },
      { label: "Fleet Settings", href: "/vehicle/settings", icon: Settings, fleetModule: "SETTINGS" },
    ]
  }
];

// Department dashboards: each link opens the dashboard engine through /dashboards/<key>
// (full-page reload, so plain links; the engine page has its own "Portal home" button).
const dashboardsNavGroups: NavGroup[] = [
  {
    label: "Dashboards",
    items: [
      { label: "All Dashboards", href: "/dashboards", icon: LayoutDashboard },
      { label: "IT Budget & Expense", href: "/dashboards/it", icon: LineChart, permission: "DASH_IT_VIEW" },
      { label: "Marketing Budget", href: "/dashboards/mkt", icon: LineChart, permission: "DASH_MKT_VIEW" },
      { label: "Admin Access", href: "/dashboards/adm", icon: LineChart, permission: "DASH_ADM_VIEW" },
    ]
  }
];

const designNavGroups: NavGroup[] = [
  {
    label: "Tender & Pre-Construction",
    items: [
      { label: "Building Section Matrix", href: "/design/building-matrix", icon: Building2 },
      { label: "Tender Design Matrix", href: "/design/matrix", icon: Layers },
      { label: "Look-Ahead Forecast", href: "/design/look-ahead", icon: Clock },
      { label: "Statutory Liaisoning", href: "/design/liaisoning", icon: ShieldCheck },
      { label: "Design Stages Roadmap", href: "/design/stages", icon: Calendar },
    ]
  },
  {
    label: "Drawings & Site Execution",
    items: [
      { label: "DMS Folder Vault", href: "/design/dms", icon: FolderTree },
      { label: "Drawing Register", href: "/design/drawings", icon: FileText },
      { label: "Design Approvals", href: "/design/approvals", icon: CheckCircle2 },
      { label: "Revision History", href: "/design/revisions", icon: RotateCcw },
      { label: "GFC Site Handover", href: "/design/handover", icon: Building2 },
      { label: "Transmittals & Slips", href: "/design/transmittals", icon: Send },
      { label: "RFI & Site Queries", href: "/design/rfis", icon: HelpCircle },
    ]
  },
  {
    label: "Directory & Governance",
    items: [
      { label: "Learning & Lifecycle Guide", href: "/design/learning", icon: BookOpen },
      { label: "Consultant Directory", href: "/design/consultants", icon: Users },
      { label: "Design Analytics", href: "/design/reports", icon: LineChart },
      { label: "RBAC Access Policies", href: "/design/rbac", icon: Key, permission: "USERS_VIEW" },
      { 
        label: "Masters Setup", 
        href: "/design/masters", 
        icon: Settings2, 
        permission: "MASTERS_VIEW",
        subItems: [
          { label: "Project Master", href: "/design/projects", permission: "MASTERS_VIEW" },
          { label: "Sub-Project Master", href: "/design/sub-projects", permission: "MASTERS_VIEW" },
          { label: "Consultant Master", href: "/design/consultants", permission: "MASTERS_VIEW" },
          { label: "Package Master", href: "/design/packages", permission: "MASTERS_VIEW" },
          { label: "Sub Package Master", href: "/design/sub-packages", permission: "MASTERS_VIEW" },
          { label: "Statutory Authorities", href: "/design/authorities", permission: "MASTERS_VIEW" },
          { label: "Backup & Templates", href: "/design/templates", permission: "MASTERS_VIEW" }
        ]
      },
    ]
  }
];

/* ---------- active-route rules (same behaviour as v1, pulled out of the render loop) ---------- */
function isItemActive(item: NavItem, pathname: string, searchParams: URLSearchParams | null) {
  if (item.href === "/requirements" && searchParams?.get("from") === "approvals") return false;
  switch (item.href) {
    case "/": return pathname === "/";
    case "/design/matrix": return ["/design", "/design/matrix", "/design/dashboard"].includes(pathname);
    case "/vehicle": return pathname === "/vehicle" || pathname === "/vehicle/dashboard";
    case "/design/masters":
      return ["/design/masters", "/design/projects", "/design/sub-projects", "/design/categories", "/design/packages", "/design/sub-packages", "/design/authorities", "/design/templates"].includes(pathname);
    default: return pathname === item.href || pathname.startsWith(item.href + "/");
  }
}

function isSubActive(href: string, pathname: string, sp: URLSearchParams | null) {
  const view = sp?.get("view"), from = sp?.get("from"), ws = sp?.get("workspaceId");
  if (href.startsWith("/?view=")) {
    const target = href.split("view=")[1];
    return pathname === "/" && (view === target || (!view && target === "overview"));
  }
  if (href === "/requirements/approvals") return pathname === href || (pathname === "/requirements" && from === "approvals");
  if (href === "/requirements") return pathname === href && from !== "approvals";
  if (href === "/workspaces/tasks") return pathname === href && !ws;
  if (href === "/workspaces") return pathname === href || (pathname === "/workspaces/tasks" && !!ws);
  if (href === "/design/projects") return pathname === href || pathname === "/design/masters";
  return pathname === href;
}

function useModuleContext(pathname: string) {
  return useMemo(() => {
    if (pathname.startsWith("/vehicle")) return { code: "VEHICLE_DESK", groups: vehicleNavGroups, home: "/vehicle" };
    if (pathname.startsWith("/design")) return { code: "DESIGN_TRACKING", groups: designNavGroups, home: "/design" };
    if (pathname.startsWith("/dashboards")) return { code: "DASHBOARDS", groups: dashboardsNavGroups, home: "/dashboards" };
    return { code: "TASK_WORKFLOW", groups: taskNavGroups, home: "/" };
  }, [pathname]);
}

function Logo({ compact, invert }: { compact: boolean; invert: boolean }) {
  const src = compact ? "/chandak-40-icon.png" : "/Chandak_Group_Official_Logo.png";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Chandak Group"
      className={cn("max-h-full max-w-full object-contain", invert && !compact && "brightness-0 invert")}
      onError={(e) => {
        const t = e.currentTarget;
        if (t.src.endsWith(".png")) t.src = t.src.replace(/\.png$/, ".svg");
      }}
    />
  );
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: { isOpenMobile?: boolean; onCloseMobile?: () => void }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const { code: activeModuleCode, groups: navGroups, home: moduleHomeHref } = useModuleContext(pathname);
  const { theme } = useTheme();
  const darkRail = getTheme(theme).sidebarTone === "dark";

  const [isCompact, setIsCompact] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // remember collapsed state
  useEffect(() => {
    try { setIsCompact(localStorage.getItem(COMPACT_KEY) === "1"); } catch { /* ignore */ }
  }, []);
  const toggleCompact = () => {
    setIsCompact((c) => {
      const next = !c;
      try { localStorage.setItem(COMPACT_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("sidebar:toggle", { detail: { compact: next } }));
      return next;
    });
  };

  // open the group that contains the current page; close the mobile drawer on navigation
  useEffect(() => {
    const owner = navGroups.flatMap((g) => g.items).find((i) => i.subItems && (isItemActive(i, pathname, searchParams) || i.subItems.some((s) => isSubActive(s.href, pathname, searchParams))));
    if (owner) setExpanded((p) => ({ ...p, [owner.href]: true }));
    onCloseMobile?.();
  }, [pathname, navGroups]);

  /* ---------- permissions (unchanged from v1) ---------- */
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const { canReadModule, hasAnyFleetAccess } = useFleetPermissions();

  const isSuperAdmin = useMemo(() => {
    const code = (roleCode || "").toUpperCase();
    return ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN_ROLE", "ROLE_ADMIN", "ADMIN"].includes(code) || hasPermission("SUPER_ADMIN");
  }, [roleCode, hasPermission]);

  const visibleNavTree = useMemo(() => {
    return navGroups
      .map((group) => {
        const items = group.items
          .map((item) => {
            if (activeModuleCode === "VEHICLE_DESK") {
              if (item.fleetModule) return canReadModule(item.fleetModule) ? item : null;
              if (item.href === "/vehicle" && !hasAnyFleetAccess) return null;
              return item;
            }
            if (!item.subItems) {
              if (isSuperAdmin || !item.permission || permsLoading) return item;
              return hasPermission(item.permission) ? item : null;
            }
            const subs = isSuperAdmin ? item.subItems : item.subItems.filter((s) => !s.permission || permsLoading || hasPermission(s.permission));
            if (subs.length > 0) return { ...item, subItems: subs };
            if (isSuperAdmin || !item.permission || hasPermission(item.permission)) return { ...item, subItems: undefined };
            return null;
          })
          .filter(Boolean) as NavItem[];
        return items.length ? { ...group, items } : null;
      })
      .filter(Boolean) as NavGroup[];
  }, [navGroups, activeModuleCode, canReadModule, hasAnyFleetAccess, isSuperAdmin, hasPermission, permsLoading]);

  const renderNav = (compact: boolean) => (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-24 pt-1 md:pb-4">
      {visibleNavTree.map((group, gi) => (
        <div key={group.label} className={cn(gi > 0 && "mt-4")}>
          {compact ? (
            gi > 0 && <div className="mx-3 mb-2 h-px bg-sidebar-border" aria-hidden />
          ) : (
            // ui-audit-ignore-next-line overline group label in the nav rail
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-sidebar-muted">{group.label}</div>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item, pathname, searchParams);
              const childActive = !!item.subItems?.some((s) => isSubActive(s.href, pathname, searchParams));
              const isOpen = expanded[item.href] ?? false;
              const showSelf = active && !childActive; // the leaf that owns the page gets the indicator

              return (
                <li key={item.href}>
                  <div className="relative flex items-center">
                    <Link
                      href={item.href}
                      title={compact ? item.label : undefined}
                      aria-label={compact ? item.label : undefined}
                      aria-current={showSelf ? "page" : undefined}
                      onClick={() => {
                        onCloseMobile?.();
                        if (item.subItems) setExpanded((p) => ({ ...p, [item.href]: true }));
                      }}
                      className={cn(
                        "group relative flex min-w-0 items-center rounded-md text-[13.5px] transition-colors",
                        compact ? "mx-auto h-10 w-10 justify-center" : "h-9 flex-1 gap-3 pl-3 pr-9",
                        showSelf
                          ? "bg-sidebar-active font-semibold text-sidebar-active-foreground"
                          : childActive
                            ? "font-semibold text-sidebar-foreground hover:bg-sidebar-hover"
                            : "text-sidebar-foreground hover:bg-sidebar-hover"
                      )}
                    >
                      {showSelf && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sidebar-indicator" aria-hidden />}
                      <Icon className={cn("h-4 w-4 shrink-0", showSelf || childActive ? "opacity-100" : "opacity-75")} aria-hidden />
                      {!compact && <span className="truncate">{item.label}</span>}
                      {!compact && item.badge && (
                        <span className="ml-auto rounded px-1.5 text-[11px] font-medium leading-5 bg-sidebar-hover text-sidebar-muted tabular">{item.badge}</span>
                      )}
                    </Link>
                    {!compact && item.subItems && (
                      <button
                        type="button"
                        onClick={() => setExpanded((p) => ({ ...p, [item.href]: !isOpen }))}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`}
                        className="absolute right-1 inline-flex h-7 w-7 items-center justify-center rounded text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                      >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !isOpen && "-rotate-90")} aria-hidden />
                      </button>
                    )}
                  </div>

                  {!compact && item.subItems && isOpen && (
                    <ul className="relative mb-1 ml-[22px] mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                      {item.subItems.map((sub) => {
                        const on = isSubActive(sub.href, pathname, searchParams);
                        return (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              aria-current={on ? "page" : undefined}
                              onClick={() => onCloseMobile?.()}
                              className={cn(
                                "relative flex h-8 items-center rounded-md px-2.5 text-[13px] transition-colors",
                                on ? "bg-sidebar-active font-semibold text-sidebar-active-foreground" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                              )}
                            >
                              {on && <span className="absolute -left-[9px] top-1.5 bottom-1.5 w-[2px] rounded bg-sidebar-indicator" aria-hidden />}
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {permsLoading && !roleCode && (
        <div className="space-y-2 px-3 pt-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded-md bg-sidebar-hover" />)}
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Mobile drawer: real dialog (focus trap, Esc, aria-modal) */}
      <Dialog.Root open={!!isOpenMobile} onOpenChange={(o) => { if (!o) onCloseMobile?.(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)] md:hidden data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-[var(--z-modal)] flex w-[288px] max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg outline-none md:hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-left duration-200 pb-[env(safe-area-inset-bottom)]">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Chandak Workspace menu</Dialog.Description>
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
              <div className="h-8 w-32"><Logo compact={false} invert={darkRail} /></div>
              <Dialog.Close aria-label="Close menu" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground">
                <X className="h-4 w-4" aria-hidden />
              </Dialog.Close>
            </div>
            <div className="border-b border-sidebar-border p-3">
              <ModuleSwitcher onCloseMobile={onCloseMobile} />
            </div>
            {renderNav(false)}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Desktop rail */}
      <aside
        className={cn(
          "relative z-[var(--z-sidebar)] hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          isCompact ? "w-[64px]" : "w-[248px]"
        )}
      >
        <div className={cn("flex shrink-0 flex-col gap-3", isCompact ? "items-center px-2 pb-2 pt-4" : "px-3 pb-3 pt-4")}>
          <Link href={moduleHomeHref} aria-label="Chandak Workspace home" className={cn("flex items-center", isCompact ? "h-9 w-9 justify-center" : "h-11 px-1")}>
            <Logo compact={isCompact} invert={darkRail} />
          </Link>
          <ModuleSwitcher isCompact={isCompact} />
        </div>

        {renderNav(isCompact)}

        <div className={cn("shrink-0 border-t border-sidebar-border p-2", isCompact && "flex justify-center")}>
          <button
            type="button"
            onClick={toggleCompact}
            aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={isCompact}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
              !isCompact && "w-full"
            )}
          >
            {isCompact ? <ChevronRight className="h-4 w-4" aria-hidden /> : <><ChevronLeft className="h-4 w-4" aria-hidden /><span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
