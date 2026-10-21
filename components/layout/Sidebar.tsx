/* eslint-disable no-restricted-syntax */
"use client";


import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { 
  LayoutDashboard, 
  Ticket, 
  FileCheck2, 
  ShieldAlert, 
  Settings, 
  Database, 
  FolderKanban, 
  ChevronLeft, 
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Users,
  ChevronDown,
  BookOpen,
  LineChart,
  Trash2,
  LifeBuoy,
  Car,
  Compass,
  Wrench,
  Package,
  Calendar,
  Layers,
  PlusCircle,
  Clock,
  Settings2,
  FileText,
  CheckCircle2,
  RotateCcw,
  Building2,
  Send,
  HelpCircle,
  Key,
  FolderTree,
  X
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useFleetPermissions } from "@/hooks/useFleetPermissions";
import { FleetFunctionalModule } from "@/types/vehicleRbacTypes";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getTheme } from "@/components/theme/theme-registry";
import ModuleSwitcher from "./ModuleSwitcher";
import { cn } from "@/lib/utils";

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

export function isItemActive(itemHref: string, pathname: string, searchParams?: URLSearchParams | null): boolean {
  if (itemHref === "/") {
    return pathname === "/";
  }
  if (itemHref === "/design/matrix") {
    return pathname === "/design" || pathname === "/design/matrix" || pathname === "/design/dashboard";
  }
  if (itemHref === "/vehicle") {
    return pathname === "/vehicle" || pathname === "/vehicle/dashboard";
  }
  if (itemHref === "/design/masters") {
    return (
      pathname === "/design/masters" ||
      pathname === "/design/projects" ||
      pathname === "/design/sub-projects" ||
      pathname === "/design/categories" ||
      pathname === "/design/packages" ||
      pathname === "/design/sub-packages" ||
      pathname === "/design/authorities" ||
      pathname === "/design/templates"
    );
  }
  if (itemHref === "/requirements" && searchParams?.get("from") === "approvals") {
    return false;
  }
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

export function isSubActive(subHref: string, pathname: string, searchParams?: URLSearchParams | null): boolean {
  const currentView = searchParams?.get("view");
  const currentFrom = searchParams?.get("from");
  const currentWsId = searchParams?.get("workspaceId");

  if (subHref.startsWith("/?view=")) {
    const targetView = subHref.split("view=")[1];
    return pathname === "/" && (currentView === targetView || (!currentView && targetView === "overview"));
  }
  if (subHref === "/requirements/approvals") {
    return pathname === "/requirements/approvals" || (pathname === "/requirements" && currentFrom === "approvals");
  }
  if (subHref === "/requirements") {
    return pathname === "/requirements" && currentFrom !== "approvals";
  }
  if (subHref === "/workspaces/tasks") {
    return pathname === "/workspaces/tasks" && !currentWsId;
  }
  if (subHref === "/workspaces") {
    return pathname === "/workspaces" || (pathname === "/workspaces/tasks" && !!currentWsId);
  }
  if (subHref === "/design/projects") {
    return pathname === "/design/projects" || pathname === "/design/masters";
  }
  return pathname === subHref;
}

export default function Sidebar({ isOpenMobile, onCloseMobile }: { isOpenMobile?: boolean; onCloseMobile?: () => void }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const themeMeta = getTheme(theme);
  const isDarkRail = themeMeta.sidebarTone === "dark";

  // Collapse state remembered in localStorage
  const [isCompactState, setIsCompactState] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("app_sidebar_compact");
      if (stored === "true") {
        setIsCompactState(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sidebar:toggle", { detail: { compact: true } }));
        }
      }
    } catch {}
  }, []);

  const toggleCompact = () => {
    setIsCompactState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("app_sidebar_compact", String(next));
      } catch {}
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sidebar:toggle", { detail: { compact: next } }));
      }
      return next;
    });
  };

  // When minimized, gliding mouse over sidebar gracefully expands it to reveal full module names and links
  const isCompact = isCompactState && !isHovered;

  // Auto-detect active module context based on current path
  const activeModuleCode = useMemo(() => {
    if (pathname.startsWith("/vehicle")) return "VEHICLE_DESK";
    if (pathname.startsWith("/design")) return "DESIGN_TRACKING";
    if (pathname.startsWith("/dashboards")) return "DASHBOARDS";
    return "TASK_WORKFLOW";
  }, [pathname]);

  const navGroups = useMemo(() => {
    if (activeModuleCode === "VEHICLE_DESK") return vehicleNavGroups;
    if (activeModuleCode === "DESIGN_TRACKING") return designNavGroups;
    if (activeModuleCode === "DASHBOARDS") return dashboardsNavGroups;
    return taskNavGroups;
  }, [activeModuleCode]);

  const moduleHomeHref = useMemo(() => {
    if (activeModuleCode === "VEHICLE_DESK") return "/vehicle";
    if (activeModuleCode === "DESIGN_TRACKING") return "/design";
    if (activeModuleCode === "DASHBOARDS") return "/dashboards";
    return "/";
  }, [activeModuleCode]);

  // Accordion rule: only ONE module with submodules can be open at a time.
  // Initial state detects the matching parent tree based on active route.
  const [openTreeHref, setOpenTreeHref] = useState<string | null>(() => {
    const activeItem = navGroups.flatMap((g) => g.items).find((item) =>
      item.href !== "/" && (
        isItemActive(item.href, pathname, searchParams) ||
        item.subItems?.some((s) => isSubActive(s.href, pathname, searchParams))
      )
    );
    return activeItem?.subItems ? activeItem.href : null;
  });

  // Sync accordion with active route on navigation (collapsing other modules)
  useEffect(() => {
    const activeItem = navGroups.flatMap((g) => g.items).find((item) =>
      item.href !== "/" && (
        isItemActive(item.href, pathname, searchParams) ||
        item.subItems?.some((s) => isSubActive(s.href, pathname, searchParams))
      )
    );
    if (activeItem && activeItem.subItems) {
      setOpenTreeHref(activeItem.href);
    } else {
      setOpenTreeHref(null);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname, searchParams, navGroups]);

  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const { canReadModule, hasAnyFleetAccess } = useFleetPermissions();

  const isSuperAdmin = useMemo(() => {
    const code = (roleCode || "").toUpperCase();
    return ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN_ROLE", "ROLE_ADMIN", "ADMIN"].includes(code) || hasPermission("SUPER_ADMIN");
  }, [roleCode, hasPermission]);

  const visibleNavTree = useMemo(() => {
    return navGroups.map((group) => {
      const visibleItems = group.items.map((item) => {
        if (activeModuleCode === "VEHICLE_DESK") {
          if (item.fleetModule) {
            const isAllowed = canReadModule(item.fleetModule);
            if (!isAllowed) return null;
          } else if (item.href === "/vehicle") {
            if (!hasAnyFleetAccess) return null;
          }
          return item;
        }

        if (!item.subItems) {
          if (isSuperAdmin) return item;
          if (!item.permission) return item;
          if (permsLoading) return item;
          return hasPermission(item.permission) ? item : null;
        }

        const visibleSubItems = isSuperAdmin
          ? item.subItems
          : item.subItems.filter((sub) => {
              if (!sub.permission) return true;
              if (permsLoading) return true;
              return hasPermission(sub.permission);
            });
          
        if (visibleSubItems.length > 0) {
          return { ...item, subItems: visibleSubItems };
        }
        
        if (isSuperAdmin || !item.permission || hasPermission(item.permission)) {
           return { ...item, subItems: undefined };
        }
        
        return null;
      }).filter(Boolean) as NavItem[];
      
      if (visibleItems.length === 0) return null;
      return { ...group, items: visibleItems };
    }).filter(Boolean) as NavGroup[];
  }, [navGroups, activeModuleCode, canReadModule, hasAnyFleetAccess, isSuperAdmin, hasPermission, permsLoading]);

  const toggleTree = (href: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Accordion: opening another module automatically collapses the previously open module
    setOpenTreeHref((prev) => (prev === href ? null : href));
  };

  const renderNavList = (inMobile = false) => {
    const compactMode = isCompact && !inMobile;

    return (
      <div className="flex-1 px-2.5 pt-2 pb-6 space-y-3 overflow-y-auto overflow-x-hidden">
        {visibleNavTree.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col">
            {!compactMode && (
              <div className="px-3 py-1 mb-1">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-sidebar-muted">
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const hasMatchingSubItem = item.subItems?.some((s) => isSubActive(s.href, pathname, searchParams));
                const itemDirectlyActive = !hasMatchingSubItem && isItemActive(item.href, pathname, searchParams);
                const isParentGroup = !!item.subItems && hasMatchingSubItem;
                const isExpanded = openTreeHref === item.href;

                return (
                  <div key={item.href} className="space-y-0.5">
                    <div className="relative flex items-center">
                      <Link
                        href={item.href}
                        title={compactMode ? item.label : undefined}
                        aria-label={compactMode ? item.label : undefined}
                        aria-current={itemDirectlyActive ? "page" : undefined}
                        onClick={(e) => {
                          if (inMobile) onCloseMobile?.();
                          if (item.subItems) {
                            if (itemDirectlyActive || hasMatchingSubItem) {
                              toggleTree(item.href, e);
                            } else {
                              setOpenTreeHref(item.href);
                            }
                          }
                        }}
                        className={cn(
                          "relative flex items-center rounded-lg text-xs font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          compactMode
                            ? "w-10 h-10 mx-auto justify-center"
                            : "flex-1 gap-2.5 py-2 px-2.5",
                          itemDirectlyActive
                            ? "bg-sidebar-active text-sidebar-active-foreground font-semibold"
                            : isParentGroup
                            ? "text-sidebar-foreground font-bold hover:bg-sidebar-hover"
                            : "text-sidebar-foreground hover:bg-sidebar-hover"
                        )}
                      >
                        {/* 3px Active Indicator Bar (only on the exactly active item) */}
                        {itemDirectlyActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sidebar-indicator"
                          />
                        )}

                        <IconComponent className={cn("shrink-0", compactMode ? "h-4 w-4" : "h-4 w-4")} />

                        {!compactMode && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}

                        {!compactMode && item.badge && (
                          <span
                            className={cn(
                              "ml-auto text-[10px] font-medium px-1.5 py-0.2 rounded-full",
                              item.badgeColor || "bg-sunken text-subtle"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>

                      {/* Accordion expand chevron button */}
                      {!compactMode && item.subItems && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          onClick={(e) => toggleTree(item.href, e)}
                          className="h-6 w-6 ml-1 flex items-center justify-center rounded text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200",
                              isExpanded ? "rotate-0" : "-rotate-90"
                            )}
                          />
                        </button>
                      )}
                    </div>

                    {/* Sub items tree */}
                    {!compactMode && item.subItems && isExpanded && (
                      <div className="pl-6 pr-1 py-0.5 space-y-0.5 relative border-l border-sidebar-border ml-4 mt-0.5">
                        {item.subItems.map((sub) => {
                          const subActive = isSubActive(sub.href, pathname, searchParams);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              aria-current={subActive ? "page" : undefined}
                              onClick={() => {
                                if (inMobile) onCloseMobile?.();
                              }}
                              className={cn(
                                "relative flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                subActive
                                  ? "bg-sidebar-active text-sidebar-active-foreground font-semibold"
                                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover font-normal"
                              )}
                            >
                              {subActive && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r bg-sidebar-indicator"
                                />
                              )}
                              <span className="truncate flex-1">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Off-Canvas Drawer powered by Radix Dialog */}
      <DialogPrimitive.Root open={isOpenMobile} onOpenChange={(open) => !open && onCloseMobile?.()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)] transition-opacity animate-in fade-in-0 duration-250 md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-[var(--z-modal)] w-[280px] max-w-[85vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-250 md:hidden focus:outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/Chandak_Group_Official_Logo.png"
                  alt="Chandak Logo"
                  className={cn("h-7 w-auto object-contain", isDarkRail && "brightness-0 invert")}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.endsWith(".png")) target.src = "/Chandak_Group_Official_Logo.svg";
                  }}
                />
                <DialogPrimitive.Title className="text-xs font-bold tracking-tight text-sidebar-foreground truncate">
                  Chandak Workspace
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close
                type="button"
                aria-label="Close menu"
                className="p-1 rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>

            {/* Mobile Module Switcher */}
            <div className="p-3 border-b border-sidebar-border shrink-0">
              <ModuleSwitcher onCloseMobile={onCloseMobile} />
            </div>

            {/* Mobile Nav List */}
            {renderNavList(true)}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Desktop Persistent Left Nav Rail */}
      <aside
        onMouseEnter={() => {
          if (isCompactState) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (isCompactState) setIsHovered(false);
        }}
        className={cn(
          "hidden md:flex relative z-[var(--z-sidebar)] flex-col h-full shrink-0 font-sans transition-[width] duration-200 select-none bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          isCompact ? "w-16" : "w-[240px]"
        )}
      >
        {/* Top Header */}
        <div className={cn("flex flex-col shrink-0 p-3 pb-2 gap-3 border-b border-sidebar-border relative", isCompact && "items-center px-2")}>
          {/* Quick toggle chevron on the rail border */}
          <button
            type="button"
            onClick={toggleCompact}
            className="hidden md:flex absolute -right-3 top-4 rounded-full shadow-sm bg-surface border border-border text-sidebar-muted hover:text-sidebar-foreground hover:bg-surface-hover h-6 w-6 items-center justify-center z-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={isCompactState ? "Pin Sidebar Open" : "Minimize Navigation Shell"}
            aria-label={isCompactState ? "Pin Sidebar Open" : "Minimize Navigation Shell"}
          >
            {isCompactState ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {!isCompact ? (
            <Link href={moduleHomeHref} className="flex flex-col gap-1 items-center justify-center pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
              <div className="h-[46px] w-[180px] flex items-center justify-center shrink-0">
                <img
                  src="/Chandak_Group_Official_Logo.png"
                  alt="Chandak Logo"
                  className={cn("max-h-full max-w-full object-contain", isDarkRail && "brightness-0 invert")}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.endsWith(".png")) target.src = "/Chandak_Group_Official_Logo.svg";
                  }}
                />
              </div>
              <span className="text-xs font-bold tracking-tight text-sidebar-foreground">
                Chandak Workspace
              </span>
            </Link>
          ) : (
            <Link
              href={moduleHomeHref}
              title="Chandak Workspace"
              aria-label="Chandak Workspace"
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src="/chandak-40-icon.png"
                alt="Chandak Logo"
                className={cn("h-7 w-7 object-contain", isDarkRail && "brightness-0 invert")}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src.endsWith(".png")) target.src = "/chandak-40-icon.svg";
                }}
              />
            </Link>
          )}

          {/* Module Switcher */}
          <div className="w-full">
            <ModuleSwitcher isCompact={isCompact} />
          </div>
        </div>

        {/* Scrollable Nav Items */}
        {renderNavList(false)}
      </aside>
    </>
  );
}
