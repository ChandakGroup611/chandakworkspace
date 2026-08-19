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
      className={`relative z-40 flex flex-col h-full shrink-0 font-sans transition-all duration-300 select-none bg-surface/40 border-r border-border/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${ isCompact ? "w-16" : "w-[240px]" }`}
    >
      {/* Sidebar Top Master Header */}
      <div className={`flex h-14 items-center justify-between px-4 shrink-0`}>
        {!isCompact ? (
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <div className={`flex items-center justify-center transition-all duration-300 h-8 w-8 shrink-0 bg-white rounded-md p-1 shadow-sm border border-border/30`}>
              <img src="/Chandak-Group-Final-Logo.svg" alt="Chandak Logo" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className={`text-[14px] font-semibold tracking-tight truncate text-foreground`}>
                Chandak Workspace
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/" className="flex h-10 w-10 mx-auto shrink-0 items-center justify-center">
            <div className="h-10 w-10 mx-auto flex items-center justify-center bg-white rounded-lg p-1 shadow-xs border border-border/30 mb-2">
              <img src="/Chandak-Group-Final-Logo.svg" alt="Chandak Logo" className="h-full w-full object-contain" />
            </div>
          </Link>
        )}

        <AppButton
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCompactState(!isCompactState)}
          className="absolute -right-3 top-4 rounded-full shadow-md transition-all hover:scale-110 duration-200 z-50 bg-surface border border-border/50 text-muted hover:text-accent hover:border-accent/50"
          title={isCompactState ? "Pin Sidebar Open" : "Minimize Navigation Shell"}
        >
          {isCompactState ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </AppButton>
      </div>

      {/* Navigation Group Links */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {visibleNavTree.map((group, groupIdx) => {
          const groupColorClass = groupIdx === 0 
            ? "text-accent dark:text-accent" 
            : groupIdx === 1 
            ? "text-theme-icon" 
            : "text-warning dark:text-warning";

          return (
            <div key={groupIdx} className="flex flex-col mb-2">
              {!isCompact && (
                <div className="px-3 mb-2 mt-5 flex items-center gap-1.5">
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
                        className={`group relative flex items-center transition-all duration-200 select-none cursor-pointer ${
                          isCompact 
                            ? "w-10 h-10 mx-auto justify-center rounded-xl" 
                            : "flex-1 gap-3 rounded-r-xl py-2 px-3 text-sm overflow-hidden whitespace-nowrap"
                        } ${modTheme.activeBg} ${modTheme.text}`}
                      >
                        {/* Content Wrapper */}
                        <div className={`flex items-center ${isCompact ? "justify-center w-full h-full" : "gap-3 w-full overflow-hidden"}`}>
                          <IconComponent className={`shrink-0 transition-transform duration-200 ${
                            isCompact ? "h-5 w-5" : "h-4 w-4"
                          } ${modTheme.iconColor}`} />
                          
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

                    {!isCompact && item.subItems && isTreeExpanded && (
                      <div className={`pl-9 pr-1 py-1 space-y-1 relative animate-in slide-in-from-top-2 fade-in duration-200`}>
                        {/* The vertical chain line */}
                        <div className="absolute left-[1.125rem] top-0 bottom-3 w-[1px] bg-gradient-to-b from-border/80 via-border/40 to-transparent" />
                        
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
                              className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-r-lg text-xs transition-all duration-300 select-none cursor-pointer overflow-hidden ${
                                isSubActive 
                                  ? `font-bold text-accent bg-accent/5 border-l-[3px] border-accent` 
                                  : `text-muted hover:bg-surface/50 hover:text-foreground border-l-[3px] border-transparent`
                              }`}
                            >
                              {/* The horizontal branch line */}
                              <div className={`absolute -left-[14px] top-1/2 w-3 h-[1px] transition-colors duration-300 ${isSubActive ? 'bg-accent' : 'bg-border/60 group-hover:bg-border'}`} />
                              <span className="truncate flex-1 text-inherit transform group-hover:translate-x-1 transition-transform duration-200">{sub.label}</span>
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




