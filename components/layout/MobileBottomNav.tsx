/* eslint-disable no-restricted-syntax */
"use client";


import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Ticket, 
  FileCheck2, 
  Menu,
  Car,
  Calendar,
  Wrench,
  Layers,
  FileText,
  CheckCircle2,
  LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

interface NavTabItem {
  label: string;
  href: string;
  icon: React.ElementType;
  isActive: boolean;
}

export default function MobileBottomNav({ onOpenMobileMenu }: MobileBottomNavProps) {
  const pathname = usePathname() || "/";

  // Determine active module based on path
  const activeModule = useMemo(() => {
    if (pathname.startsWith("/vehicle")) return "VEHICLE_DESK";
    if (pathname.startsWith("/design")) return "DESIGN_TRACKING";
    if (pathname.startsWith("/dashboards")) return "DASHBOARDS";
    return "TASK_WORKFLOW";
  }, [pathname]);

  const navItems = useMemo<NavTabItem[]>(() => {
    if (activeModule === "VEHICLE_DESK") {
      return [
        {
          label: "Fleet",
          href: "/vehicle",
          icon: LayoutDashboard,
          isActive: pathname === "/vehicle",
        },
        {
          label: "Vehicles",
          href: "/vehicle/inventory",
          icon: Car,
          isActive: pathname.startsWith("/vehicle/inventory") || pathname.startsWith("/vehicle/register"),
        },
        {
          label: "Trips",
          href: "/vehicle/trips",
          icon: Calendar,
          isActive: pathname.startsWith("/vehicle/trips"),
        },
        {
          label: "Service",
          href: "/vehicle/maintenance",
          icon: Wrench,
          isActive: pathname.startsWith("/vehicle/maintenance") || pathname.startsWith("/vehicle/parts"),
        },
      ];
    }

    if (activeModule === "DESIGN_TRACKING") {
      return [
        {
          label: "Matrix",
          href: "/design/matrix",
          icon: Layers,
          isActive: pathname.startsWith("/design/matrix") || pathname.startsWith("/design/building-matrix"),
        },
        {
          label: "Drawings",
          href: "/design/drawings",
          icon: FileText,
          isActive: pathname.startsWith("/design/drawings") || pathname.startsWith("/design/dms"),
        },
        {
          label: "Approvals",
          href: "/design/approvals",
          icon: CheckCircle2,
          isActive: pathname.startsWith("/design/approvals"),
        },
        {
          label: "Reports",
          href: "/design/reports",
          icon: LineChart,
          isActive: pathname.startsWith("/design/reports"),
        },
      ];
    }

    if (activeModule === "DASHBOARDS") {
      return [
        {
          label: "All",
          href: "/dashboards",
          icon: LayoutDashboard,
          isActive: pathname === "/dashboards",
        },
        {
          label: "IT",
          href: "/dashboards/it",
          icon: LineChart,
          isActive: pathname.startsWith("/dashboards/it"),
        },
        {
          label: "Marketing",
          href: "/dashboards/mkt",
          icon: LineChart,
          isActive: pathname.startsWith("/dashboards/mkt"),
        },
      ];
    }

    // Default TASK_WORKFLOW
    return [
      {
        label: "Home",
        href: "/",
        icon: LayoutDashboard,
        isActive: pathname === "/",
      },
      {
        label: "Tasks",
        href: "/workspaces/tasks",
        icon: FolderKanban,
        isActive: pathname.startsWith("/workspaces") || pathname.startsWith("/tasks"),
      },
      {
        label: "Tickets",
        href: "/tickets",
        icon: Ticket,
        isActive: pathname.startsWith("/tickets") || pathname.startsWith("/support"),
      },
      {
        label: "Requirements",
        href: "/requirements",
        icon: FileCheck2,
        isActive: pathname.startsWith("/requirements"),
      },
    ];
  }, [activeModule, pathname]);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[var(--z-mobile-nav)] bg-surface border-t border-border shadow-md pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-lg select-none transition-colors",
                item.isActive 
                  ? "text-primary font-semibold" 
                  : "text-muted hover:text-foreground font-medium"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[70px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation menu"
          className="flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-lg select-none text-muted hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[11px] mt-1 font-medium tracking-tight text-muted">
            Menu
          </span>
        </button>
      </nav>
    </div>
  );
}
