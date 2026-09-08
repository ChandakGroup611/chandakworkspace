"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Ticket, 
  FileCheck2, 
  Menu 
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

export default function MobileBottomNav({ onOpenMobileMenu }: MobileBottomNavProps) {
  const pathname = usePathname() || "/";
  const { theme } = useTheme();

  const isHomeActive = pathname === "/";
  const isTasksActive = pathname.startsWith("/workspaces") || pathname.startsWith("/tasks");
  const isTicketsActive = pathname.startsWith("/tickets") || pathname.startsWith("/support");
  const isRequirementsActive = pathname.startsWith("/requirements");

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: LayoutDashboard,
      isActive: isHomeActive,
    },
    {
      label: "Tasks",
      href: "/workspaces/tasks",
      icon: FolderKanban,
      isActive: isTasksActive,
    },
    {
      label: "Tickets",
      href: "/tickets",
      icon: Ticket,
      isActive: isTicketsActive,
    },
    {
      label: "Reqs",
      href: "/requirements",
      icon: FileCheck2,
      isActive: isRequirementsActive,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all duration-200 select-none active:scale-90 ${
                item.isActive 
                  ? "text-theme-btn-primary font-bold" 
                  : "text-muted hover:text-foreground font-medium"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${item.isActive ? "scale-110 drop-shadow-[0_0_8px_var(--color-accent,#4f46e5)]" : ""}`} />
                {item.isActive && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-theme-btn-primary animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[60px] ${item.isActive ? "font-bold text-theme-btn-primary" : "text-muted"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More / Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all duration-200 select-none text-muted hover:text-foreground active:scale-90"
        >
          <div className="relative flex items-center justify-center">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-1 font-medium tracking-tight text-muted">
            Menu
          </span>
        </button>
      </nav>
    </div>
  );
}
