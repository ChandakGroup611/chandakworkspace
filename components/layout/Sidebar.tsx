"use client";

import React, { useState, useEffect, Profiler } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Ticket, 
  FileCheck2, 
  ShieldAlert, 
  Settings, 
  Database, 
  FolderKanban, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  UserCheck,
  Users,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  BookOpen,
  LineChart
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/components/theme/ThemeProvider";
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
      { label: "ITSM Tickets", href: "/tickets", icon: Ticket, permission: "TICKETS_VIEW" },
      { 
        label: "Workspaces", 
        href: "/workspaces", 
        icon: FolderKanban, 
        permission: "WORKSPACES_VIEW",
        subItems: [
          { label: "Workspace Master", href: "/workspaces" },
          { label: "Reports & Analytics", href: "/workspaces/reports" }
        ]
      },
    ]
  },
  {
    label: "Governance & Analysis",
    items: [
      { label: "Requirements", href: "/requirements", icon: FileCheck2 },
      { label: "SLA Monitoring", href: "/sla", icon: ShieldAlert },
      { label: "User Master", href: "/users", icon: Users },
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
        subItems: [
          { label: "Company Master", href: "/masters/companies" },
          { label: "System Master", href: "/masters" }
        ]
      },
      { label: "Compliance Hub", href: "/compliance", icon: Settings },
      { 
        label: "Settings", 
        href: "/settings", 
        icon: Settings,
        subItems: [
          { label: "Design Gallery", href: "/settings" },
          { label: "Email Config", href: "/settings/email" },
          { label: "Notifications", href: "/settings/notifications" }
        ]
      },
    ]
  }
];

export default function Sidebar() {
  useRenderLog("Sidebar", {});
  const pathname = usePathname();
  const [isCompactState, setIsCompactState] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Default expanding the tree context if user accesses master route mapping
  const [expandedTrees, setExpandedTrees] = useState<Record<string, boolean>>({
    "/masters": true
  });
  const [clientQuery, setClientQuery] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setClientQuery(window.location.search);
    }
  }, []);

  const { theme } = useTheme();
  const { hasPermission, roleCode } = usePermissions();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);

  // When minimized, simply gliding mouse over sidebar gracefully expands it to reveal full module names and links temporarily
  const isCompact = isCompactState && !isHovered;

  const toggleTree = (href: string, e: React.MouseEvent) => {
    // If clicking on chevron or item, ensure it toggles local view state smoothly
    setExpandedTrees(prev => ({ ...prev, [href]: !prev[href] }));
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
      className={`relative z-40 flex flex-col shrink-0 transition-all duration-300 border-r select-none ${
        isCompact ? "w-16" : "w-64"
      } ${
        isLight 
          ? "bg-white border-gray-200 shadow-sm" 
          : "bg-[#0A0D14] border-white/5"
      }`}
    >
      {/* Sidebar Top Master Header */}
      <div className={`flex h-16 items-center justify-between px-4 border-b shrink-0 ${isLight ? "border-gray-100" : "border-white/5"}`}>
        {!isCompact ? (
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-bold tracking-tight truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                ADIOS Platform
              </span>
              <span className="text-[0.7rem] font-mono font-semibold text-blue-500 tracking-wider truncate uppercase">
                {roleCode === "SUPER_ADMIN" ? "Governance Master" : "Enterprise Stack"}
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/" className="flex h-8 w-8 mx-auto shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </Link>
        )}

        {/* Global Compact Minimize Handle Trigger */}
        <button
          onClick={() => setIsCompactState(!isCompactState)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full border shadow-md transition-all hover:scale-125 duration-300 z-50 ${
            isLight 
              ? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-400" 
              : "bg-[#111522] border-white/10 text-gray-400 hover:text-white hover:border-blue-500"
          }`}
          title={isCompactState ? "Pin Sidebar Open" : "Minimize Navigation Shell"}
        >
          {isCompactState ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>

      {/* Navigation Group Links */}
      <div className={`flex-1 px-3 py-4 space-y-6 ${isCompact ? "overflow-visible" : "overflow-y-auto scrollbar-thin"}`}>
        {navGroups.map((group, groupIdx) => {
          // Dynamic Access Logic: Super Admin bypass or granular permission check
          const visibleItems = roleCode === "SUPER_ADMIN" 
            ? group.items 
            : group.items.filter(item => !item.permission || hasPermission(item.permission));
            
          if (visibleItems.length === 0) return null;
          
          return (
            <div key={groupIdx} className="flex flex-col">
              {!isCompact && (
                <span className={`px-3 mb-2 text-[0.8rem] font-semibold tracking-wider uppercase ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                  {group.label}
                </span>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                const IconComponent = item.icon;
                const isBaseActive = pathname === item.href;
                const isTreeExpanded = expandedTrees[item.href];
                
                const dynamicBadge = item.badge;

                return (
                  <div key={item.href} className="space-y-0.5">
                    <div className="relative flex items-center">
                      <Link
                        href={item.href}
                        className={`group relative flex-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                          isBaseActive 
                            ? (isLight ? "bg-blue-50 text-blue-700 font-semibold" : "bg-white/10 text-white shadow-sm font-semibold") 
                            : (isLight ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-gray-200")
                        } ${isCompact ? "justify-center" : ""}`}
                      >
                        {isBaseActive && (
                          <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-blue-500 transition-all group-hover:h-6" />
                        )}
                        
                        {/* Responsive dynamically scaled icon */}
                        <IconComponent className={`shrink-0 transition-all duration-200 group-hover:scale-110 ${
                          isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
                        } ${
                          isBaseActive ? "text-blue-500" : (isLight ? "text-gray-400 group-hover:text-gray-600" : "text-gray-400 group-hover:text-gray-300")
                        }`} />
                        
                        {!isCompact && (
                          <span className="flex-1 truncate transition-colors duration-150">{item.label}</span>
                        )}
                        
                        {!isCompact && item.badge && (
                          <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]'}`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>

                      {/* Expand Tree Toggle chevron button right side */}
                      {!isCompact && item.subItems && (
                        <button
                          type="button"
                          onClick={(e) => toggleTree(item.href, e)}
                          className={`absolute right-2 p-1 rounded-lg transition-colors ${
                            isLight ? "hover:bg-gray-200/60 text-gray-400" : "hover:bg-white/10 text-gray-500"
                          }`}
                        >
                          {isTreeExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Premium Interactive Module Popover Tooltip with Open Action Indicator button when minimized */}
                      {isCompact && (
                        <div className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 flex items-center gap-2 rounded-xl px-3 py-2 shadow-2xl border backdrop-blur-xl shrink-0 ${
                          isLight ? "bg-white border-gray-200 text-gray-800 shadow-gray-200/50" : "bg-[#0f172a] border-white/10 text-white shadow-black/80"
                        }`}>
                          <span className="font-semibold whitespace-nowrap text-xs">{item.label}</span>
                          {dynamicBadge && (
                            <span className={`text-[0.7rem] px-1 py-0.2 rounded font-bold uppercase border ${
                              isLight ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {dynamicBadge}
                            </span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ml-1 transition-all flex items-center gap-0.5 ${
                            isLight ? "bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-600" : "bg-white/5 hover:bg-blue-500 hover:text-white text-gray-300"
                          }`}>
                            <span>Link</span>
                            <span>→</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* RENDER EXPANDED SUB-ITEMS TREE CONTAINER */}
                    {!isCompact && item.subItems && isTreeExpanded && (
                      <div className="pl-7 pr-1 py-1 space-y-1 relative border-l ml-5 transition-all animate-in fade-in-50 slide-in-from-top-1 duration-200 border-white/5">
                        {item.subItems.map((sub) => {
                          const isSubActive = sub.scopeParam ? clientQuery.includes(sub.scopeParam) : pathname === sub.href;
                          
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setClientQuery(`?scope=${sub.scopeParam}`)}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[0.8rem] font-medium transition-all ${
                                isSubActive 
                                  ? (isLight ? "bg-blue-50 text-blue-700 font-bold" : "bg-blue-500/10 text-blue-400 font-bold") 
                                  : (isLight ? "text-gray-500 hover:text-gray-900 hover:bg-gray-50" : "text-gray-400 hover:text-white hover:bg-white/5")
                              }`}
                            >
                              <span className={`text-[0.65rem] ${isSubActive ? "text-blue-500" : "opacity-40"}`}>▪</span>
                              <span className="truncate">{sub.label}</span>
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

      {/* Footer System Gateway Links */}
      <div className={`p-3 border-t mt-auto shrink-0 ${isLight ? "border-gray-100 bg-gray-50/50" : "border-white/5 bg-white/[0.005]"}`}>
        {!isCompact ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span className="font-bold tracking-wider uppercase">Identity Controls</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Link 
                href="/login" 
                className={`px-2 py-1.5 rounded-lg text-center text-[0.8rem] font-bold transition-all border ${
                  isLight 
                    ? "bg-white border-gray-200 text-blue-600 hover:bg-blue-50" 
                    : "bg-white/5 border-white/5 text-blue-400 hover:bg-white/10 hover:border-blue-500/30"
                }`}
              >
                Login
              </Link>
              <Link 
                href="/register" 
                className={`px-2 py-1.5 rounded-lg text-center text-[0.8rem] font-bold transition-all border ${
                  isLight 
                    ? "bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100" 
                    : "bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40"
                }`}
              >
                Register
              </Link>
            </div>
          </div>
        ) : (
          <Link 
            href="/login" 
            title="Access Gateway Portal"
            className="flex h-8 w-8 mx-auto items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow hover:scale-105 transition-all"
          >
            <UserCheck className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </aside>
    </Profiler>
  );
}
