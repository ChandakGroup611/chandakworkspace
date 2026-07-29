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
  LifeBuoy
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppButton } from "@/components/ui/AppButton";
import { useRenderLog } from "@/hooks/use-render-log";
import { onRenderCallback } from "@/utils/performance/profiler-utils";

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

const navGroups: NavGroup[] = [
  {
    label: "Core Operations",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "My Support Portal", href: "/support", icon: LifeBuoy, permission: "SUPPORT_PORTAL_VIEW" },
      { label: "ITSM Tickets", href: "/tickets", icon: Ticket, permission: "TICKETS_VIEW" },
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

export default function Sidebar() {
  useRenderLog("Sidebar", {});
  const pathname = usePathname() || "/";
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
  }, [pathname]);
  const [clientQuery, setClientQuery] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setClientQuery(window.location.search);
    }
  }, []);

  const { theme } = useTheme();
  const { hasPermission, roleCode } = usePermissions();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  const visibleNavTree = React.useMemo(() => {
    return navGroups.map(group => {
      const visibleItems = group.items.map(item => {
        if (!item.subItems) {
          if (roleCode === "SUPER_ADMIN" || !item.permission || hasPermission(item.permission)) {
            return item;
          }
          return null;
        }

        const visibleSubItems = roleCode === "SUPER_ADMIN" 
          ? item.subItems 
          : item.subItems.filter(sub => !sub.permission || hasPermission(sub.permission));
          
        if (visibleSubItems.length > 0) {
          return { ...item, subItems: visibleSubItems };
        }
        
        if (roleCode === "SUPER_ADMIN" || (!item.permission || hasPermission(item.permission))) {
           return { ...item, subItems: undefined };
        }
        
        return null;
      }).filter(Boolean) as NavItem[];
      
      if (visibleItems.length === 0) return null;
      return { ...group, items: visibleItems };
    }).filter(Boolean) as NavGroup[];
  }, [roleCode, hasPermission]);

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

  return (
    <Profiler id="Sidebar" onRender={onRenderCallback}>
      <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative z-40 flex flex-col h-full shrink-0 font-sans transition-all duration-300 select-none bg-surface border-r border-border/60 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.04)] ${ isCompact ? "w-20" : "w-64" }`}
    >
      {/* Sidebar Top Master Header */}
      <div className={`flex h-16 items-center justify-between px-4 border-b shrink-0 ${"border-border"}`}>
        {!isCompact ? (
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className={`flex items-center justify-center transition-all duration-300 h-10 w-10 shrink-0 bg-surface rounded-md p-1`}>
              <img src="/Chandak-Group-Final-Logo.svg" alt="Chandak Logo" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className={`text-[0.9375rem] font-bold tracking-tight truncate text-foreground`}>
                Chandak Workspace
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/" className="flex h-10 w-10 mx-auto shrink-0 items-center justify-center">
            <div className="h-10 w-full px-2 mb-2">
              <img src="/Chandak-Group-Final-Logo.svg" alt="Chandak Logo" className="h-full w-full object-contain drop-shadow-md" />
            </div>
          </Link>
        )}

        <AppButton
          variant="outline"
          size="icon-sm"
          onClick={() => setIsCompactState(!isCompactState)}
          className="absolute -right-3 top-5 rounded-full shadow-md transition-all hover:scale-125 duration-300 z-50 theme-card-structural text-muted hover:text-foreground hover:border-accent"
          title={isCompactState ? "Pin Sidebar Open" : "Minimize Navigation Shell"}
        >
          {isCompactState ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </AppButton>
      </div>

      {/* Navigation Group Links */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {visibleNavTree.map((group, groupIdx) => {
          const groupColorClass = groupIdx === 0 
            ? "text-blue-600 dark:text-blue-400" 
            : groupIdx === 1 
            ? "text-purple-600 dark:text-purple-400" 
            : "text-amber-600 dark:text-amber-400";

          return (
            <div key={groupIdx} className="flex flex-col mb-2">
              {!isCompact && (
                <div className="px-3 mb-2.5 flex items-center gap-1.5">
                  <div className={`w-1.5 h-3.5 rounded-full ${groupIdx === 0 ? "bg-blue-500" : groupIdx === 1 ? "bg-purple-500" : "bg-amber-500"}`} />
                  <span className={`text-[0.75rem] font-black tracking-wider uppercase ${groupColorClass}`}>
                    {group.label}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                const IconComponent = item.icon;
                
                const getModuleTheme = (href: string) => {
                  switch (href) {
                    case "/": return { text: "text-blue-500", activeBg: "from-blue-500/25 via-blue-500/15", border: "border-blue-500/50", shadow: "shadow-blue-500/20", line: "bg-blue-500 shadow-blue-500/40", hover: "hover:bg-blue-500/15 hover:border-blue-500/30 hover:text-blue-600" };
                    case "/support": return { text: "text-cyan-500", activeBg: "from-cyan-500/25 via-cyan-500/15", border: "border-cyan-500/50", shadow: "shadow-cyan-500/20", line: "bg-cyan-500 shadow-cyan-500/40", hover: "hover:bg-cyan-500/15 hover:border-cyan-500/30 hover:text-cyan-600" };
                    case "/tickets": return { text: "text-rose-500", activeBg: "from-rose-500/25 via-rose-500/15", border: "border-rose-500/50", shadow: "shadow-rose-500/20", line: "bg-rose-500 shadow-rose-500/40", hover: "hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-600" };
                    case "/requirements": return { text: "text-emerald-500", activeBg: "from-emerald-500/25 via-emerald-500/15", border: "border-emerald-500/50", shadow: "shadow-emerald-500/20", line: "bg-emerald-500 shadow-emerald-500/40", hover: "hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-600" };
                    case "/workspaces": return { text: "text-purple-500", activeBg: "from-purple-500/25 via-purple-500/15", border: "border-purple-500/50", shadow: "shadow-purple-500/20", line: "bg-purple-500 shadow-purple-500/40", hover: "hover:bg-purple-500/15 hover:border-purple-500/30 hover:text-purple-600" };
                    case "/sla": return { text: "text-cyan-500", activeBg: "from-cyan-500/25 via-cyan-500/15", border: "border-cyan-500/50", shadow: "shadow-cyan-500/20", line: "bg-cyan-500 shadow-cyan-500/40", hover: "hover:bg-cyan-500/15 hover:border-cyan-500/30 hover:text-cyan-600" };
                    case "/amc": return { text: "text-amber-500", activeBg: "from-amber-500/25 via-amber-500/15", border: "border-amber-500/50", shadow: "shadow-amber-500/20", line: "bg-amber-500 shadow-amber-500/40", hover: "hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-600" };
                    case "/users": return { text: "text-indigo-500", activeBg: "from-indigo-500/25 via-indigo-500/15", border: "border-indigo-500/50", shadow: "shadow-indigo-500/20", line: "bg-indigo-500 shadow-indigo-500/40", hover: "hover:bg-indigo-500/15 hover:border-indigo-500/30 hover:text-indigo-600" };
                    case "/iam": return { text: "text-violet-500", activeBg: "from-violet-500/25 via-violet-500/15", border: "border-violet-500/50", shadow: "shadow-violet-500/20", line: "bg-violet-500 shadow-violet-500/40", hover: "hover:bg-violet-500/15 hover:border-violet-500/30 hover:text-violet-600" };
                    case "/learning": return { text: "text-teal-500", activeBg: "from-teal-500/25 via-teal-500/15", border: "border-teal-500/50", shadow: "shadow-teal-500/20", line: "bg-teal-500 shadow-teal-500/40", hover: "hover:bg-teal-500/15 hover:border-teal-500/30 hover:text-teal-600" };
                    case "/settings": return { text: "text-rose-500", activeBg: "from-rose-500/25 via-rose-500/15", border: "border-rose-500/50", shadow: "shadow-rose-500/20", line: "bg-rose-500 shadow-rose-500/40", hover: "hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-600" };
                    case "/masters": return { text: "text-emerald-500", activeBg: "from-emerald-500/25 via-emerald-500/15", border: "border-emerald-500/50", shadow: "shadow-emerald-500/20", line: "bg-emerald-500 shadow-emerald-500/40", hover: "hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-600" };
                    default: return { text: "text-accent", activeBg: "from-accent/25 via-accent/15", border: "border-accent/50", shadow: "shadow-accent/20", line: "bg-accent shadow-accent/40", hover: "hover:bg-accent/15 hover:border-accent/30 hover:text-accent" };
                  }
                };

                const modTheme = getModuleTheme(item.href);
                let isBaseActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                if (item.href === '/requirements' && searchParams?.get('from') === 'approvals') {
                  isBaseActive = false;
                }
                const isTreeExpanded = !!expandedTrees[item.href];
                
                const dynamicBadge = item.badge;

                return (
                  <div key={item.href} className="space-y-0.5">
                    <div className="relative flex items-center">
                      <Link
                        href={item.href}
                        className={`group relative flex items-center transition-all duration-200 select-none cursor-pointer ${
                          isCompact 
                            ? "w-12 h-12 mx-auto justify-center rounded-2xl" 
                            : "flex-1 gap-3 rounded-xl py-2.5 px-3 text-sm font-medium overflow-hidden whitespace-nowrap"
                        } ${
                          isBaseActive 
                            ? `bg-gradient-to-r to-transparent font-bold shadow-md scale-[1.03] ${modTheme.activeBg} ${modTheme.border} ${modTheme.text} ${modTheme.shadow} border` 
                            : `text-foreground font-semibold hover:shadow-xs hover:scale-[1.02] active:scale-[0.96] border border-transparent transition-all duration-150 ${modTheme.hover}`
                        }`}
                      >
                        {/* Active Indicator Line */}
                        {isBaseActive && (
                          <div className={`absolute top-1/2 -translate-y-1/2 rounded-r shadow-sm ${modTheme.line} ${
                            isCompact ? "-left-2 h-6 w-1.5" : "-left-3 h-6 w-1"
                          }`} />
                        )}

                        {/* Content Wrapper */}
                        <div className={`flex items-center ${isCompact ? "justify-center w-full h-full" : "gap-3 w-full overflow-hidden"}`}>
                          {/* Dynamically Scaled Icon with OnHover and OnClick micro-animations */}
                          <IconComponent className={`shrink-0 transition-all duration-200 group-hover:scale-125 group-hover:rotate-3 ${
                            isCompact ? "h-6 w-6" : "h-4 w-4"
                          } ${
                            isBaseActive 
                              ? `${modTheme.text} font-bold drop-shadow-sm scale-110` 
                              : `${modTheme.text} opacity-90 group-hover:opacity-100 group-hover:drop-shadow-xs`
                          }`} />
                          
                          {!isCompact && (
                            <span className="flex-1 truncate transition-colors duration-150 text-inherit group-hover:font-bold">{item.label}</span>
                          )}
                          
                          {!isCompact && item.badge && (
                            <span className={`ml-auto text-[0.625rem] font-medium px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Expand Tree Toggle chevron button right side */}
                      {!isCompact && item.subItems && (
                        <AppButton
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => toggleTree(item.href, e)}
                          className="absolute right-2 !h-6 !w-6"
                        >
                          {isTreeExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                          )}
                        </AppButton>
                      )}

                      {/* Premium Interactive Module Popover Tooltip with Open Action Indicator button when minimized */}
                      {isCompact && (
                        <div className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 flex items-center gap-2 rounded-md px-2.5 py-1.5 shadow-md shrink-0 ${ "theme-card-structural text-foreground" }`}>
                          <span className="font-medium whitespace-nowrap text-xs">{item.label}</span>
                        </div>
                      )}
                    </div>

                    {/* RENDER EXPANDED SUB-ITEMS TREE CONTAINER */}
                    {!isCompact && item.subItems && isTreeExpanded && (
                      <div className={`pl-2.5 pr-1 py-1.5 space-y-1.5 relative border-l-2 ml-5 ${modTheme.border}`}>
                        {item.subItems.map((sub) => {
                          
                          let isSubActive = pathname === sub.href;
                          if (sub.href === '/requirements/approvals' && searchParams?.get('from') === 'approvals') {
                            isSubActive = true;
                          } else if (sub.href === '/requirements' && searchParams?.get('from') === 'approvals') {
                            isSubActive = false;
                          }
                          
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setClientQuery(`?scope=${sub.scopeParam}`)}
                              className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[0.8125rem] font-semibold transition-all duration-150 select-none cursor-pointer overflow-hidden ${
                                isSubActive 
                                  ? `bg-gradient-to-r to-transparent font-bold shadow-xs scale-[1.02] border ${modTheme.activeBg} ${modTheme.border} ${modTheme.text}` 
                                  : `text-muted-foreground hover:scale-[1.02] hover:shadow-xs active:scale-[0.96] border border-transparent ${modTheme.hover}`
                              }`}
                            >
                              {/* Submodule Bullet Indicator Dot */}
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${
                                isSubActive 
                                  ? `shadow-xs scale-125 bg-current` 
                                  : `opacity-40 group-hover:opacity-100 group-hover:scale-125 bg-current`
                              }`} />
                              
                              <span className="truncate flex-1 text-inherit">{sub.label}</span>
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
      </div>

    </aside>
    </Profiler>
  );
}




