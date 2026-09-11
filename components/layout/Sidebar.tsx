"use client";

import React, { useState, useEffect, Profiler } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  Sparkles,
  UserCheck,
  Users,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  BookOpen,
  LineChart,
  Trash2,
  LifeBuoy,
  Car,
  Compass,
  Wrench,
  Package,
  Calendar,
  Layers
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppButton } from "@/components/ui/AppButton";
import { useRenderLog } from "@/hooks/use-render-log";
import { onRenderCallback } from "@/utils/performance/profiler-utils";
import ModuleSwitcher from "./ModuleSwitcher";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  permission?: string;
  subItems?: {
    label: string;
    href: string;
    scopeParam?: string;
    permission?: string;
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
      { label: "IAM Controls", href: "/iam", icon: UserCheck, permission: "IAM_VIEW" },
      { label: "Learning Hub", href: "/learning", icon: BookOpen, permission: "LEARNING_VIEW" },
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
      { label: "Vehicle Inventory", href: "/vehicle/inventory", icon: Car },
      { label: "Daily Trip Sheets", href: "/vehicle/trips", icon: Calendar },
      { label: "Driver Roster", href: "/vehicle/drivers", icon: Users },
      { label: "Traveler Allocations", href: "/vehicle/travelers", icon: UserCheck },
    ]
  },
  {
    label: "Service & Assets",
    items: [
      { label: "Maintenance & Job Cards", href: "/vehicle/maintenance", icon: Wrench },
      { label: "Parts & Accessories", href: "/vehicle/parts", icon: Package },
      { label: "Compliance & Alerts", href: "/vehicle/alerts", icon: ShieldAlert },
    ]
  },
  {
    label: "Analytics & System",
    items: [
      { label: "Fleet Reports", href: "/vehicle/reports", icon: LineChart },
      { label: "My Assigned Vehicles", href: "/vehicle/my-garage", icon: LifeBuoy },
      { label: "Fleet Guidelines / SOPs", href: "/vehicle/learning", icon: BookOpen },
      { label: "Fleet Settings", href: "/vehicle/settings", icon: Settings },
    ]
  }
];

const designNavGroups: NavGroup[] = [
  {
    label: "Design Management",
    items: [
      { label: "Design Dashboard", href: "/design", icon: LayoutDashboard },
      { label: "Drawing Register", href: "/design/drawings", icon: FolderKanban },
      { label: "Approvals & Reviews", href: "/design/approvals", icon: FileCheck2 },
      { label: "Revision History", href: "/design/revisions", icon: LineChart },
    ]
  },
  {
    label: "Execution & Governance",
    items: [
      { label: "Site Handover & GFC", href: "/design/handover", icon: ShieldCheck },
      { label: "Consultant Directory", href: "/design/consultants", icon: Users },
      { label: "Design Reports", href: "/design/reports", icon: BookOpen },
      { label: "Design Settings", href: "/design/settings", icon: Settings },
    ]
  }
];

export default function Sidebar({ isOpenMobile, onCloseMobile }: { isOpenMobile?: boolean; onCloseMobile?: () => void }) {
  useRenderLog("Sidebar", {});
  const pathname = usePathname() || "/";

  // Auto-detect active module context based on current path
  const activeModuleCode = React.useMemo(() => {
    if (pathname.startsWith("/vehicle")) return "VEHICLE_DESK";
    if (pathname.startsWith("/design")) return "DESIGN_TRACKING";
    return "TASK_WORKFLOW";
  }, [pathname]);

  const navGroups = React.useMemo(() => {
    if (activeModuleCode === "VEHICLE_DESK") return vehicleNavGroups;
    if (activeModuleCode === "DESIGN_TRACKING") return designNavGroups;
    return taskNavGroups;
  }, [activeModuleCode]);

  const moduleHomeHref = React.useMemo(() => {
    if (activeModuleCode === "VEHICLE_DESK") return "/vehicle";
    if (activeModuleCode === "DESIGN_TRACKING") return "/design";
    return "/";
  }, [activeModuleCode]);
  const searchParams = useSearchParams();
  const [isCompactState, setIsCompactState] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Accordion state
  const [expandedTrees, setExpandedTrees] = useState<Record<string, boolean>>({});

  // Sync accordion with active route on navigation
  useEffect(() => {
    const activeItem = navGroups.flatMap(g => g.items).find(item => 
      item.href !== "/" && pathname.startsWith(item.href)
    );
    if (activeItem && activeItem.subItems) {
      setExpandedTrees({ [activeItem.href]: true });
    } else {
      setExpandedTrees({});
    }
    // Auto-close mobile drawer on route change
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname]);
  const [clientQuery, setClientQuery] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setClientQuery(window.location.search);
    }
  }, []);

  const { theme } = useTheme();
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  const visibleNavTree = React.useMemo(() => {
    return navGroups.map(group => {
      const visibleItems = group.items.map(item => {
        const isSuperAdmin = roleCode === "SUPER_ADMIN";

        if (!item.subItems) {
          if (isSuperAdmin) return item;
          if (!item.permission) return item;
          if (permsLoading) return null;
          return hasPermission(item.permission) ? item : null;
        }

        const visibleSubItems = isSuperAdmin
          ? item.subItems
          : item.subItems.filter(sub => {
              if (!sub.permission) return true;
              if (permsLoading) return false;
              return hasPermission(sub.permission);
            });
          
        if (visibleSubItems.length > 0) {
          return { ...item, subItems: visibleSubItems };
        }
        
        if (isSuperAdmin || (!item.permission && !permsLoading) || (item.permission && !permsLoading && hasPermission(item.permission))) {
           return { ...item, subItems: undefined };
        }
        
        return null;
      }).filter(Boolean) as NavItem[];
      
      if (visibleItems.length === 0) return null;
      return { ...group, items: visibleItems };
    }).filter(Boolean) as NavGroup[];
  }, [roleCode, hasPermission, permsLoading]);

  // When minimized, simply gliding mouse over sidebar gracefully expands it to reveal full module names and links temporarily
  const isCompact = isCompactState && !isHovered;

  const toggleTree = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Accordion behavior: toggle the target, close everything else
    setExpandedTrees(prev => ({ [href]: !prev[href] }));
  };

  // Broadcast compact state to outer layout so main content can adapt
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ev = new CustomEvent("sidebar:toggle", { detail: { compact: isCompactState && !isHovered } });
      window.dispatchEvent(ev);
    }
  }, [isCompactState, isHovered]);

  const navContent = (
    <>
      {/* Navigation Group Links */}
      <div className="flex-1 px-3 pt-2 pb-24 md:pb-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {visibleNavTree.map((group, groupIdx) => {
          const groupColorClass = groupIdx === 0 
            ? "text-accent dark:text-accent" 
            : groupIdx === 1 
            ? "text-theme-icon" 
            : "text-warning dark:text-warning";

          return (
            <div key={groupIdx} className="flex flex-col mb-2">
              {(!isCompact || isOpenMobile) && (
                <div className={`px-3 mb-2 ${groupIdx === 0 ? "mt-1" : "mt-5"} flex items-center gap-1.5`}>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted/70">
                    {group.label}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                const IconComponent = item.icon;
                
                let isBaseActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                if (item.href === '/requirements' && searchParams?.get('from') === 'approvals') {
                  isBaseActive = false;
                }
                
                const isTreeExpanded = !!expandedTrees[item.href] || isBaseActive;

                // Combine in chain: If tree is expanded, show the parent as active
                const showAsActive = isBaseActive || isTreeExpanded;

                const getModuleTheme = (href: string) => {
                  return {
                    text: showAsActive ? "text-accent font-semibold" : "text-muted",
                    activeBg: showAsActive ? "bg-accent/10 shadow-[inset_3px_0_0_var(--color-accent)]" : "border-l-[3px] border-transparent hover:bg-surface/50",
                    iconColor: showAsActive ? "text-accent drop-shadow-[0_0_8px_var(--color-accent)]" : "text-muted group-hover:text-foreground transition-colors"
                  };
                };

                const modTheme = getModuleTheme(item.href);
                
                const dynamicBadge = item.badge;

                return (
                  <div key={item.href} className="space-y-1 relative">
                    <div className="relative flex items-center">
                      <Link
                        href={item.href}
                        onClick={() => onCloseMobile?.()}
                        className={`group relative flex items-center transition-all duration-200 select-none cursor-pointer active:scale-[0.98] ${
                          isCompact && !isOpenMobile
                            ? "w-10 h-10 mx-auto justify-center rounded-xl hover:bg-surface/80" 
                            : "flex-1 gap-3 rounded-r-xl py-2 px-3 text-sm overflow-hidden whitespace-nowrap"
                        } ${modTheme.activeBg} ${modTheme.text}`}
                      >
                        {/* Content Wrapper */}
                        <div className={`flex items-center ${isCompact && !isOpenMobile ? "justify-center w-full h-full" : "gap-3 w-full overflow-hidden"}`}>
                          <IconComponent className={`shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:-rotate-3 ${
                            isCompact && !isOpenMobile ? "h-5 w-5" : "h-4 w-4"
                          } ${modTheme.iconColor}`} />
                          
                          {(!isCompact || isOpenMobile) && (
                            <span className="flex-1 truncate transition-colors duration-150 text-inherit group-hover:font-bold group-hover:translate-x-0.5 transform">{item.label}</span>
                          )}
                          
                          {(!isCompact || isOpenMobile) && item.badge && (
                            <span className={`ml-auto text-[0.625rem] font-medium px-2 py-0.5 rounded-full transition-transform group-hover:scale-105 ${item.badgeColor || 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Expand Tree Toggle chevron button right side */}
                      {(!isCompact || isOpenMobile) && item.subItems && (
                        <AppButton
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => toggleTree(item.href, e)}
                          className="absolute right-2 !h-6 !w-6 active:scale-90 transition-transform"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isTreeExpanded ? "rotate-0" : "-rotate-90"}`} />
                        </AppButton>
                      )}

                      {/* Premium Interactive Module Popover Tooltip when minimized */}
                      {isCompact && !isOpenMobile && (
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-200 z-50 flex items-center gap-2 rounded-md px-2.5 py-1.5 shadow-lg border border-border bg-surface text-foreground shrink-0 animate-in fade-in zoom-in-95">
                          <span className="font-medium whitespace-nowrap text-xs">{item.label}</span>
                        </div>
                      )}
                    </div>

                    {(!isCompact || isOpenMobile) && item.subItems && isTreeExpanded && (
                      <div className="pl-9 pr-1 py-1 space-y-1 relative animate-in slide-in-from-top-2 fade-in duration-200">
                        {/* The vertical chain line */}
                        <div className="absolute left-[1.125rem] top-0 bottom-3 w-[1px] bg-gradient-to-b from-border/80 via-border/40 to-transparent" />
                        
                        {item.subItems.map((sub) => {
                          let isSubActive = pathname === sub.href;
                          if (sub.href === '/requirements/approvals' && searchParams?.get('from') === 'approvals') {
                            isSubActive = true;
                          } else if (sub.href === '/requirements' && searchParams?.get('from') === 'approvals') {
                            isSubActive = false;
                          } else if (sub.href === '/workspaces' && pathname === '/workspaces/tasks' && searchParams?.get('workspaceId')) {
                            isSubActive = true;
                          } else if (sub.href === '/workspaces/tasks' && pathname === '/workspaces/tasks' && searchParams?.get('workspaceId')) {
                            isSubActive = false;
                          }
                          
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => {
                                setClientQuery(`?scope=${sub.scopeParam}`);
                                onCloseMobile?.();
                              }}
                              className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-r-lg text-xs transition-all duration-200 select-none cursor-pointer overflow-hidden active:scale-[0.98] ${
                                isSubActive 
                                  ? `font-bold text-accent bg-accent/5 border-l-[3px] border-accent` 
                                  : `text-muted hover:bg-surface/50 hover:text-foreground border-l-[3px] border-transparent`
                              }`}
                            >
                              <div className={`absolute -left-[14px] top-1/2 w-3 h-[1px] transition-colors duration-200 ${isSubActive ? 'bg-accent' : 'bg-border/60 group-hover:bg-border'}`} />
                              <span className="truncate flex-1 text-inherit transform group-hover:translate-x-1.5 transition-transform duration-200">{sub.label}</span>
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
        );
      })}

      {permsLoading && !roleCode && (
        <div className="space-y-4 px-3 pt-2 animate-pulse" aria-hidden="true">
          <div className="h-2.5 w-24 bg-muted/20 rounded mb-2"></div>
          <div className="space-y-1.5">
            <div className="h-9 w-full bg-muted/10 rounded-lg"></div>
            <div className="h-9 w-full bg-muted/10 rounded-lg"></div>
            <div className="h-9 w-full bg-muted/10 rounded-lg"></div>
          </div>
          <div className="h-2.5 w-28 bg-muted/20 rounded mb-2 mt-4"></div>
          <div className="space-y-1.5">
            <div className="h-9 w-full bg-muted/10 rounded-lg"></div>
            <div className="h-9 w-full bg-muted/10 rounded-lg"></div>
          </div>
        </div>
      )}
      </div>
    </>
  );

  return (
    <Profiler id="Sidebar" onRender={onRenderCallback}>
      {/* Mobile Off-Canvas Drawer Backdrop & Container */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => onCloseMobile?.()}
          />
          {/* Drawer Menu */}
          <div className="relative z-50 w-[280px] max-w-[85vw] bg-surface dark:bg-[#0B0F19] h-full flex flex-col shadow-2xl border-r border-border animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <img src="/Chandak_Group_Official_Logo.png" alt="Chandak Logo" className="h-8 w-auto dark:brightness-0 dark:invert" />
                <span className="text-sm font-bold text-foreground">Chandak Workspace</span>
              </div>
              <AppButton
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onCloseMobile?.()}
                className="text-muted hover:text-foreground hover:bg-surface-hover"
              >
                <ChevronLeft className="h-5 w-5" />
              </AppButton>
            </div>
            {/* Mobile Module Switcher */}
            <div className="px-3 pt-2 pb-2 border-b border-border/40">
              <ModuleSwitcher onCloseMobile={onCloseMobile} />
            </div>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Aside Navigation */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex relative z-40 flex-col h-full shrink-0 font-sans transition-all duration-300 select-none theme-card-structural border-r border-border/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${ isCompact ? "w-16" : "w-[240px]" }`}
      >
        {/* Sidebar Top Master Header */}
        <div className={`flex ${!isCompact ? 'flex-col pt-5 pb-1 px-3 gap-2.5' : 'h-auto py-3 flex-col items-center justify-center px-2 gap-2'} shrink-0`}>
          {!isCompact ? (
            <Link href={moduleHomeHref} className="flex flex-col gap-1 overflow-hidden items-center justify-center pt-1">
              <div className={`flex items-center justify-center transition-all duration-300 h-[58px] w-[200px] mx-auto shrink-0 px-1`}>
                <img src="/Chandak_Group_Official_Logo.png" alt="Chandak Logo" className="max-h-full max-w-full object-contain dark:brightness-0 dark:invert" style={{ imageRendering: '-webkit-optimize-contrast' }} />
              </div>
              <div className="flex flex-col min-w-0 justify-center items-center px-1">
                <span className={`text-[14px] font-bold tracking-tight truncate text-foreground`}>
                  Chandak Workspace
                </span>
              </div>
            </Link>
          ) : (
            <Link href={moduleHomeHref} className="flex h-10 w-10 mx-auto shrink-0 items-center justify-center mt-1">
              <div className="h-9 w-9 mx-auto flex items-center justify-center rounded-lg overflow-hidden px-1">
                <img src="/chandak-40-icon.png" alt="Chandak 40 Years Logo" className="max-h-full max-w-full object-contain" style={{ imageRendering: '-webkit-optimize-contrast' }} />
              </div>
            </Link>
          )}

          {/* Module Switcher */}
          {!isCompact ? (
            <div className="w-full">
              <ModuleSwitcher />
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <ModuleSwitcher isCompact={true} />
            </div>
          )}

          <AppButton
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCompactState(!isCompactState)}
            className="absolute -right-3 top-4 rounded-full shadow-md transition-all hover:scale-110 duration-200 z-50 theme-card-structural text-muted hover:text-accent hover:border-accent/50"
            title={isCompactState ? "Pin Sidebar Open" : "Minimize Navigation Shell"}
          >
            {isCompactState ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </AppButton>
        </div>

        {navContent}
      </aside>
    </Profiler>
  );
}




