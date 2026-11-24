"use client";

/**
 * Sidebar v2 — what changed (nav data and permission rules are unchanged from v1)
 * - Uses the --sidebar-* tokens, so themes can have a dark navigation rail on a light page.
 *   v1 used .theme-card-structural, which gave the rail rounded corners and, in some themes,
 *   overflow:hidden that clipped the collapse button and the compact module menu.
 * - Collapse/expand with the arrow at the top of the rail (remembered). When collapsed, hovering
 *   the rail opens it as an overlay above the page, so the page itself doesn't reflow; it closes
 *   again when the pointer (or keyboard focus) leaves.
 * - Only one module group is open at a time: opening one closes the others.

 * - Exactly one item looks "active". v1 highlighted every expanded group as active too.
 * - No hover bold / slide / icon rotate (text jitter).
 * - aria-current, aria-expanded, nav landmark, labelled icon buttons, Esc closes mobile menu.
 * - Removed React <Profiler> + useRenderLog from the production render path.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard, Ticket, FileCheck2, ShieldAlert, Settings, Database, FolderKanban,
  ChevronsLeft, ShieldCheck, ChevronsRight, UserCheck, Users, ChevronDown, BookOpen, LineChart,
  Trash2, LifeBuoy, Car, Wrench, Package, Calendar, Layers, PlusCircle, Clock, Settings2,
  FileText, CheckCircle2, RotateCcw, Building2, Send, HelpCircle, Key, FolderTree, X, Tag,
  Video, StickyNote, Wallet, DoorOpen, Zap,
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
    label: "Core operations",
    items: [
      { 
        label: "Dashboard", 
        href: "/", 
        icon: LayoutDashboard,
        subItems: [
          { label: "Overview", href: "/?view=overview" },
          { label: "My portfolio", href: "/?view=portfolio" }
        ]
      },
      { label: "My support portal", href: "/support", icon: LifeBuoy, permission: "SUPPORT_PORTAL_VIEW" },
      {
        label: "Ticket tracking",
        href: "/tickets",
        icon: Ticket,
        permission: "TICKETS_VIEW",
        subItems: [
          { label: "All tickets", href: "/tickets", permission: "TICKETS_VIEW" },
          { label: "Reports and analytics", href: "/tickets/reports", permission: "TICKETS_VIEW" }
        ]
      },
      { 
        label: "Requirements", 
        href: "/requirements", 
        icon: FileCheck2,
        permission: "REQUIREMENTS_VIEW",
        subItems: [
          { label: "All requirements", href: "/requirements", permission: "REQUIREMENTS_VIEW" },
          { label: "Requirement approvals", href: "/requirements/approvals", permission: "REQUIREMENTS_APPROVALS_VIEW" },
          { label: "Reports and analytics", href: "/requirements/reports", permission: "REQUIREMENTS_REPORTS_VIEW" }
        ]
      },
      { 
        label: "Workspaces", 
        href: "/workspaces", 
        icon: FolderKanban, 
        permission: "WORKSPACES_VIEW",
        subItems: [
          { label: "All workspaces", href: "/workspaces", permission: "WORKSPACES_VIEW" },
          { label: "Enrolled workspaces", href: "/workspaces/enrolled", permission: "ENROLLED_WORKSPACES_VIEW" },
          { label: "Workspace tasks", href: "/workspaces/tasks", permission: "TASKS_VIEW" },
          { label: "Transfer tasks", href: "/workspaces/transfer-tasks", permission: "TASKS_TRANSFER_VIEW" },
          { label: "Data migration", href: "/migration", permission: "DATA_MIGRATION_VIEW" },
          { label: "Reports and analytics", href: "/workspaces/reports", permission: "REPORTS_VIEW" }
        ]
      },
    ]
  },
  {
    label: "Governance and analysis",
    items: [
      { label: "SLA monitoring", href: "/sla", icon: ShieldAlert, permission: "SLA_VIEW" },
      { 
        label: "AMC & subscriptions", 
        href: "/amc", 
        icon: ShieldCheck, 
        permission: "AMC_VIEW",
        subItems: [
          { label: "Home", href: "/amc", permission: "AMC_VIEW" },
          { label: "Register", href: "/amc/register", permission: "AMC_VIEW" },
          { label: "Payments & renewals", href: "/amc/transactions", permission: "AMC_VIEW" },
          { label: "Reports and analytics", href: "/amc/reports", permission: "AMC_VIEW" }
        ]
      },
      { label: "Organization Budget", href: "/budget", icon: Wallet },
      { label: "Users", href: "/users", icon: Users, permission: "USERS_VIEW" },
      { label: "RBAC access policies", href: "/rbac", icon: Key, permission: "USERS_VIEW" },
      { label: "IAM controls", href: "/iam", icon: UserCheck, permission: "IAM_VIEW" },
      { label: "Learning hub", href: "/learning", icon: BookOpen },
    ]
  },
  {
    label: "System base",
    items: [
      { 
        label: "Masters", 
        href: "/masters", 
        icon: Database,
        permission: "MASTERS_VIEW",
        subItems: [
          { label: "Companies", href: "/masters/companies", permission: "COMPANIES_VIEW" },
          { label: "Vendors", href: "/masters/vendors", permission: "MASTERS_VIEW" },
          { label: "Budget masters", href: "/budget/masters", permission: "MASTERS_VIEW" },
          { label: "System masters", href: "/masters", permission: "SYSTEM_MASTERS_VIEW" }
        ]
      },
      { label: "Trash", href: "/compliance", icon: Trash2, permission: "TRASH_VIEW" },
      { 
        label: "Settings", 
        href: "/settings", 
        icon: Settings,
        permission: "SETTINGS_MANAGE",
        subItems: [
          { label: "Design gallery", href: "/settings", permission: "SETTINGS_THEME_VIEW" },
          { label: "Identity and access", href: "/settings/identity", permission: "SETTINGS_IDENTITY_VIEW" },
          { label: "Communication centre", href: "/settings/communication", permission: "SETTINGS_COMMUNICATION_VIEW" },
          { label: "Notifications", href: "/settings/notifications", permission: "SETTINGS_NOTIFICATIONS_VIEW" },
          { label: "Billing and subscription", href: "/subscription", permission: "SETTINGS_MANAGE" }
        ]
      },
    ]
  }
];

const vehicleNavGroups: NavGroup[] = [
  {
    label: "Fleet operations",
    items: [
      { label: "Fleet dashboard", href: "/vehicle", icon: LayoutDashboard },
      { label: "Vehicle inventory", href: "/vehicle/inventory", icon: Car, fleetModule: "VEHICLES" },
      { label: "Register vehicle", href: "/vehicle/register", icon: PlusCircle, fleetModule: "REGISTER" },
      { label: "Daily trip sheets", href: "/vehicle/trips", icon: Calendar, fleetModule: "TRIPS" },
      { label: "Driver roster", href: "/vehicle/drivers", icon: Users, fleetModule: "DRIVERS" },
      { label: "Traveller allocations", href: "/vehicle/travelers", icon: UserCheck, fleetModule: "TRAVELERS" },
      { label: "Vehicle sales & disposals", href: "/vehicle/sales", icon: Tag, fleetModule: "SALES" },
    ]
  },
  {
    label: "Service and assets",
    items: [
      { label: "Document vault", href: "/vehicle/documents", icon: FileCheck2, fleetModule: "VEHICLES" },
      { label: "Service bills and job cards", href: "/vehicle/maintenance", icon: Wrench, fleetModule: "MAINTENANCE" },
      { label: "Parts and accessories", href: "/vehicle/parts", icon: Package, fleetModule: "PARTS" },
      { label: "Insurance vendors", href: "/vehicle/vendors", icon: ShieldCheck, fleetModule: "VENDORS" },
      { label: "Compliance and alerts", href: "/vehicle/alerts", icon: ShieldAlert, fleetModule: "ALERTS" },
    ]
  },
  {
    label: "Analytics and system",
    items: [
      { label: "Fleet reports", href: "/vehicle/reports", icon: LineChart, fleetModule: "REPORTS" },
      { label: "My assigned vehicles", href: "/vehicle/my-garage", icon: LifeBuoy, fleetModule: "MY_GARAGE" },
      { label: "Fleet guidelines and SOPs", href: "/vehicle/learning", icon: BookOpen, fleetModule: "LEARNING" },
      { label: "RBAC access policies", href: "/vehicle/rbac", icon: Key, fleetModule: "RBAC" },
      { label: "Fleet settings", href: "/vehicle/settings", icon: Settings, fleetModule: "SETTINGS" },
    ]
  }
];

// Department dashboards: each link opens the dashboard engine through /dashboards/<key>
// (full-page reload, so plain links; the engine page has its own "Portal home" button).
const dashboardsNavGroups: NavGroup[] = [
  {
    label: "Dashboards",
    items: [
      { label: "All dashboards", href: "/dashboards", icon: LayoutDashboard },
      { label: "IT budget and expense", href: "/dashboards/it", icon: LineChart, permission: "DASH_IT_VIEW" },
      { label: "Marketing budget", href: "/dashboards/mkt", icon: LineChart, permission: "DASH_MKT_VIEW" },
      { label: "Admin access", href: "/dashboards/adm", icon: LineChart, permission: "DASH_ADM_VIEW" },
      { label: "Engineering budget", href: "/dashboards/engg", icon: LineChart, permission: "DASH_ENGG_VIEW" },
      { label: "Sales (Salesforce)", href: "/dashboards/sfdc", icon: LineChart, permission: "DASH_SFDC_VIEW" },
      { label: "Workspace admin", href: "/dashboards/cws", icon: LineChart, permission: "DASH_CWS_VIEW" },
      { label: "Organization Budget", href: "/budget", icon: Wallet },
      { label: "RBAC access policies", href: "/rbac?module=DASHBOARDS", icon: Key, permission: "DASH_ADM_VIEW" },
    ]
  }
];

const designNavGroups: NavGroup[] = [
  {
    label: "Tender and pre-construction",
    items: [
      { label: "Building section matrix", href: "/design/building-matrix", icon: Building2 },
      { label: "Tender design matrix", href: "/design/matrix", icon: Layers },
      { label: "Look-ahead forecast", href: "/design/look-ahead", icon: Clock },
      { label: "Statutory liaisoning", href: "/design/liaisoning", icon: ShieldCheck },
      { label: "Design stages roadmap", href: "/design/stages", icon: Calendar },
    ]
  },
  {
    label: "Drawings and site execution",
    items: [
      { label: "DMS folders", href: "/design/dms", icon: FolderTree },
      { label: "Drawing register", href: "/design/drawings", icon: FileText },
      { label: "Design approvals", href: "/design/approvals", icon: CheckCircle2 },
      { label: "Revision history", href: "/design/revisions", icon: RotateCcw },
      { label: "GFC site handover", href: "/design/handover", icon: Building2 },
      { label: "Transmittals and slips", href: "/design/transmittals", icon: Send },
      { label: "RFIs and site queries", href: "/design/rfis", icon: HelpCircle },
    ]
  },
  {
    label: "Directory and governance",
    items: [
      { label: "Learning and lifecycle guide", href: "/design/learning", icon: BookOpen },
      { label: "Consultant directory", href: "/design/consultants", icon: Users },
      { label: "Design analytics", href: "/design/reports", icon: LineChart },
      { label: "RBAC access policies", href: "/design/rbac", icon: Key, permission: "USERS_VIEW" },
      { 
        label: "Masters setup", 
        href: "/design/masters", 
        icon: Settings2, 
        permission: "MASTERS_VIEW",
        subItems: [
          { label: "Projects", href: "/design/projects", permission: "MASTERS_VIEW" },
          { label: "Sub-projects", href: "/design/sub-projects", permission: "MASTERS_VIEW" },
          { label: "Consultants", href: "/design/consultants", permission: "MASTERS_VIEW" },
          { label: "Packages", href: "/design/packages", permission: "MASTERS_VIEW" },
          { label: "Sub-packages", href: "/design/sub-packages", permission: "MASTERS_VIEW" },
          { label: "Statutory authorities", href: "/design/authorities", permission: "MASTERS_VIEW" },
          { label: "Backup and templates", href: "/design/templates", permission: "MASTERS_VIEW" }
        ]
      },
    ]
  }
];

const meetNavGroups: NavGroup[] = [
  {
    // Chandak Meet redesign: one short menu. "Live session mode" is no longer a menu item —
    // people join from Home or the meeting page (the /meet/live route still works).
    label: "Meetings",
    items: [
      { label: "Home", href: "/meet", icon: LayoutDashboard },
      { label: "Meetings", href: "/meet/meetings", icon: Video },
      { label: "Calendar", href: "/meet/calendar", icon: Calendar },
      { label: "Points & tasks", href: "/meet/my-work", icon: CheckCircle2 },
      { label: "Minutes & notes", href: "/meet/notes", icon: StickyNote },
      { label: "Decisions", href: "/meet/decisions", icon: ShieldCheck },
    ]
  },
  {
    label: "Admin",
    items: [
      { label: "Reports", href: "/meet/reports", icon: LineChart },
      { label: "Rooms", href: "/meet/rooms", icon: DoorOpen },
      { label: "Automations", href: "/meet/automations", icon: Zap },
      { label: "Settings", href: "/meet/admin", icon: Settings2 },
      { label: "Access & roles", href: "/meet/settings/rbac", icon: Key },
    ]
  }
];

function getActiveBudgetProject(pathname: string): string | null {
  const m = pathname.match(/^\/budget\/(\d+)/);
  if (m) return m[1];
  if (pathname === "/budget" || pathname === "/budget/") return null;
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/(?:^|; )active_budget_project=([^;]*)/);
    if (cookieMatch && /^\d+$/.test(decodeURIComponent(cookieMatch[1]))) {
      return decodeURIComponent(cookieMatch[1]);
    }
  }
  return null;
}

function getBudgetRouteAction(path: string): string {
  if (path === "/budget" || path === "/budget/") return "home";
  if (path.startsWith("/budget/masters") || path.startsWith("/budget/admin/masters")) return "masters";
  if (path === "/budget/admin" || path === "/budget/admin/") return "admin:masters";
  const adminMatch = path.match(/^\/budget\/admin\/([^/?#]+)/);
  if (adminMatch) return `admin:${adminMatch[1]}`;
  const projTabMatch = path.match(/^\/budget\/\d+\/([^/?#]+)/);
  if (projTabMatch) return projTabMatch[1];
  const projOnlyMatch = path.match(/^\/budget\/(\d+)\/?$/);
  if (projOnlyMatch) return "overview";
  const tabMatch = path.match(/^\/budget\/([^/?#]+)/);
  if (tabMatch && !/^\d+$/.test(tabMatch[1])) return tabMatch[1];
  return "home";
}

function getBudgetNavGroups(projectId?: string | null): NavGroup[] {
  const p = projectId && /^\d+$/.test(projectId) ? `/budget/${projectId}` : "/budget";
  const to = (t: string) => (p === "/budget" ? `/budget/${t}` : `${p}/${t}`);
  return [
    {
      label: "Budget",
      items: [
        { label: "Portfolio overview", href: "/budget", icon: FolderKanban },
        { label: "Budgets registry", href: to("budgets"), icon: FileText },
        { label: "Create budget", href: "/budget/create", icon: PlusCircle },
        { label: "Project overview", href: to("overview"), icon: LayoutDashboard },
      ]
    },
    {
      label: "Prepare budget",
      items: [
        { label: "Budget sheet", href: to("entry"), icon: Layers },
        { label: "Tower workings", href: to("workings"), icon: Building2 },
        { label: "Schedules", href: to("schedules"), icon: Calendar },
        { label: "Import Excel", href: to("import"), icon: Package },
      ]
    },
    {
      label: "Actuals",
      items: [
        { label: "Cost incurred", href: to("incurred"), icon: CheckCircle2 },
      ]
    },
    {
      label: "Reports",
      items: [
        { label: "Summary", href: to("summary"), icon: LineChart },
        { label: "Detail", href: to("detail"), icon: FileText },
        { label: "Compare versions", href: to("compare"), icon: RotateCcw },
        { label: "Periodic breakdown", href: to("periods"), icon: Clock },
      ]
    },
    {
      label: "Masters & setup",
      items: [
        { label: "Budget masters", href: "/budget/masters", icon: Database },
        { label: "Project hierarchy", href: to("setup"), icon: Settings2 },
        { label: "Access & roles", href: "/budget/admin/access", icon: Key },
        { label: "Workflow guide", href: to("guide"), icon: BookOpen },
      ]
    }
  ];
}

/* ---------- active-route rules (same behaviour as v1, pulled out of the render loop) ---------- */
function isItemActive(item: NavItem, pathname: string, searchParams: URLSearchParams | null) {
  if (item.href === "/requirements" && searchParams?.get("from") === "approvals") return false;
  if (pathname.startsWith("/budget") && item.href.startsWith("/budget")) {
    const currentAction = getBudgetRouteAction(pathname);
    const itemAction = getBudgetRouteAction(item.href);
    return Boolean(currentAction && itemAction && currentAction === itemAction);
  }

  const [baseHref, query] = item.href.split("?");
  if (query) {
    if (pathname === baseHref) {
      const itemParams = new URLSearchParams(query);
      let allMatch = true;
      itemParams.forEach((val, key) => {
        if (searchParams?.get(key) !== val) allMatch = false;
      });
      return allMatch;
    }
    return false;
  }

  switch (item.href) {
    case "/": return pathname === "/";
    case "/meet": return pathname === "/meet";
    case "/design/matrix": return ["/design", "/design/matrix", "/design/dashboard"].includes(pathname);
    case "/vehicle": return pathname === "/vehicle" || pathname === "/vehicle/dashboard";
    case "/design/masters":
      return ["/design/masters", "/design/projects", "/design/sub-projects", "/design/categories", "/design/packages", "/design/sub-packages", "/design/authorities", "/design/templates"].includes(pathname);
    case "/amc":
      return pathname.startsWith("/amc");
    default:
      return pathname === item.href || pathname.startsWith(item.href + "/");
  }
}

function isSubActive(href: string, pathname: string, sp: URLSearchParams | null) {
  if (href === "/amc") return pathname === "/amc";
  if (href === "/amc/register") return pathname.startsWith("/amc/register") || pathname.startsWith("/amc/contracts") || pathname.startsWith("/amc/subscriptions");
  if (href === "/amc/transactions") return pathname.startsWith("/amc/transactions");
  if (href === "/amc/reports") return pathname.startsWith("/amc/reports") || pathname.startsWith("/amc/analytics");
  if (href === "/budget/masters") return pathname.startsWith("/budget/masters") || pathname.startsWith("/budget/admin/masters");
  if (pathname.startsWith("/budget") && href.startsWith("/budget")) {
    const currentAction = getBudgetRouteAction(pathname);
    const hrefAction = getBudgetRouteAction(href);
    return Boolean(currentAction && hrefAction && currentAction === hrefAction);
  }
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

function getActiveModuleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )active_module=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function useModuleContext(pathname: string) {
  return useMemo(() => {
    if (pathname.startsWith("/budget")) {
      const pId = getActiveBudgetProject(pathname);
      return { code: "ORG_BUDGET", groups: getBudgetNavGroups(pId), home: "/budget" };
    }
    if (pathname.startsWith("/meet")) return { code: "CHANDAK_MEET", groups: meetNavGroups, home: "/meet" };
    if (pathname.startsWith("/vehicle")) return { code: "VEHICLE_DESK", groups: vehicleNavGroups, home: "/vehicle" };
    if (pathname.startsWith("/design")) return { code: "DESIGN_TRACKING", groups: designNavGroups, home: "/design" };
    if (pathname.startsWith("/dashboards")) return { code: "DASHBOARDS", groups: dashboardsNavGroups, home: "/dashboards" };
    
    // Shared global preference and account routes (/settings, /profile): preserve user's active module
    if (pathname.startsWith("/settings") || pathname === "/profile") {
      const activeCookie = getActiveModuleCookie();
      if (activeCookie === "CHANDAK_MEET") return { code: "CHANDAK_MEET", groups: meetNavGroups, home: "/meet" };
      if (activeCookie === "ORG_BUDGET") {
        const pId = getActiveBudgetProject(pathname);
        return { code: "ORG_BUDGET", groups: getBudgetNavGroups(pId), home: "/budget" };
      }
      if (activeCookie === "VEHICLE_DESK") return { code: "VEHICLE_DESK", groups: vehicleNavGroups, home: "/vehicle" };
      if (activeCookie === "DESIGN_TRACKING") return { code: "DESIGN_TRACKING", groups: designNavGroups, home: "/design" };
      if (activeCookie === "DASHBOARDS") return { code: "DASHBOARDS", groups: dashboardsNavGroups, home: "/dashboards" };
      return { code: "TASK_WORKFLOW", groups: taskNavGroups, home: "/" };
    }

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
      className={cn("max-h-full max-w-full object-contain sidebar-logo", invert && "brightness-0 invert")}
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
  const { theme, mode } = useTheme();
  const darkRail = getTheme(theme).sidebarTone === "dark" || mode === "dark";

  const [isCompact, setIsCompact] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTogglingRef = useRef(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // accordion: one module group open at a time
  const openOnly = (href: string) => setExpanded({ [href]: true });

  // when collapsed, the rail opens on hover (after a short delay, so passing the mouse across doesn't flicker it)
  const showFull = !isCompact || hoverOpen;
  const scheduleHover = (open: boolean) => {
    if (!isCompact || isTogglingRef.current) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      // keep the rail open while its module menu (a portalled popover) is open
      if (!open && document.querySelector("[data-radix-popper-content-wrapper]")) return;
      if (open && isTogglingRef.current) return;
      setHoverOpen(open);
    }, open ? 120 : 220);
  };
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  // remember collapsed state
  useEffect(() => {
    try { setIsCompact(localStorage.getItem(COMPACT_KEY) === "1"); } catch { /* ignore */ }
  }, []);
  const toggleCompact = () => {
    isTogglingRef.current = true;
    setIsCompact((c) => {
      const next = !c;
      setHoverOpen(false);
      try { localStorage.setItem(COMPACT_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("sidebar:toggle", { detail: { compact: next } }));
      return next;
    });
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 400);
  };

  // open the group that contains the current page; close the mobile drawer on navigation
  useEffect(() => {
    const owner = navGroups.flatMap((g) => g.items).find((i) => i.subItems && (isItemActive(i, pathname, searchParams) || i.subItems.some((s) => isSubActive(s.href, pathname, searchParams))));
    if (owner) openOnly(owner.href);
    setHoverOpen(false);
    onCloseMobile?.();
  }, [pathname, navGroups]);

  // synchronize active budget project cookie
  useEffect(() => {
    const m = pathname.match(/^\/budget\/(\d+)/);
    if (m && typeof document !== "undefined") {
      document.cookie = `active_budget_project=${m[1]}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [pathname]);

  /* ---------- permissions (unchanged from v1) ---------- */
  const { hasPermission, roleCode, loading: permsLoading, tickedDashboards = [] } = usePermissions();
  const { canReadModule, hasAnyFleetAccess } = useFleetPermissions();

  const isSuperAdmin = useMemo(() => {
    const code = (roleCode || "").toUpperCase();
    return ["SUPER_ADMIN", "ROLE_SUPER_ADMIN"].includes(code) || hasPermission("SUPER_ADMIN");
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
            if (activeModuleCode === "DASHBOARDS") {
              if (item.href === "/dashboards") return item;
              if (item.href === "/budget") return item;
              const dashKey = item.href.replace("/dashboards/", "");
              if (isSuperAdmin || tickedDashboards.includes(dashKey)) return item;
              return null;
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
  }, [navGroups, activeModuleCode, canReadModule, hasAnyFleetAccess, isSuperAdmin, hasPermission, permsLoading, tickedDashboards]);

  const renderNav = (compact: boolean) => (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-24 pt-1 md:pb-4">
      {visibleNavTree.map((group, gi) => (
        <div key={group.label} className={cn(gi > 0 && "mt-4")}>
          {compact ? (
            gi > 0 && <div className="mx-3 mb-2 h-px bg-sidebar-border" aria-hidden />
          ) : (
            // ui-audit-ignore-next-line overline group label in the nav rail
            <div className="px-3 pb-1.5 text-[11px] font-semibold text-sidebar-muted">{group.label}</div>
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
                      prefetch={false}
                      title={compact ? item.label : undefined}
                      aria-label={compact ? item.label : undefined}
                      aria-current={showSelf ? "page" : undefined}
                      onClick={() => {
                        onCloseMobile?.();
                        if (item.subItems) openOnly(item.href);
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
                        onClick={() => (isOpen ? setExpanded({}) : openOnly(item.href))}
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
                              prefetch={false}
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

      {/* Desktop rail: adjusts width responsively so header and search bar adapt seamlessly */}
      <aside
        className={cn(
          "relative z-[var(--z-sidebar)] hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out select-none md:flex",
          showFull ? "w-[248px]" : "w-[64px]"
        )}
        onMouseEnter={() => scheduleHover(true)}
        onMouseLeave={() => scheduleHover(false)}
        onFocusCapture={() => { if (isCompact && !isTogglingRef.current) { if (hoverTimer.current) clearTimeout(hoverTimer.current); setHoverOpen(true); } }}
        onBlurCapture={(e) => { if (isCompact && !e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleHover(false); }}
      >
        {/* collapse / expand arrow on the rail edge */}
        <button
          type="button"
          onClick={toggleCompact}
          aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={isCompact}
          title={isCompact ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-7 z-50 inline-flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted shadow-sm transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isCompact ? <ChevronsRight className="h-3.5 w-3.5" aria-hidden /> : <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />}
        </button>

        <div className={cn("flex shrink-0 flex-col gap-3", showFull ? "px-3 pb-3 pt-4" : "items-center px-2 pb-2 pt-4")}>
          <Link href={moduleHomeHref} prefetch={false} aria-label="Chandak Workspace home" className={cn("flex items-center", showFull ? "h-11 px-1" : "h-9 w-9 justify-center")}>
            <Logo compact={!showFull} invert={darkRail} />
          </Link>
          <ModuleSwitcher isCompact={!showFull} />
        </div>

        {renderNav(!showFull)}
      </aside>
    </>
  );
}
