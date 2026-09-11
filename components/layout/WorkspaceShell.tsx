"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Suspense } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";
import GlobalShortcuts from "./GlobalShortcuts";
import MobileBottomNav from "./MobileBottomNav";

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const isLight = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
  const isAuthRoute = pathname === "/login" || pathname === "/register" || pathname === "/select-module";
  const isDashboardRoute = pathname === "/";
  const isRequirementDetailsRoute = pathname.startsWith('/requirements/') && pathname.split('/').length === 3 && !['reports', 'approvals', 'grooming'].includes(pathname.split('/')[2]);
  const isZeroPaddingRoute = isAuthRoute || isRequirementDetailsRoute || isDashboardRoute;
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      setIsSidebarCompact(Boolean(e?.detail?.compact));
    };
    if (typeof window !== "undefined") {
      window.addEventListener("sidebar:toggle", handler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("sidebar:toggle", handler as EventListener);
      }
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div 
      className={`h-screen w-full flex font-sans antialiased transition-colors duration-300 relative selection:bg-theme-btn-primary/20 overflow-hidden bg-background`}
      style={{
        color: "var(--text-primary, #FFFFFF)"
      }}
    >
      {/* Sidebar Navigation */}
      {!isAuthRoute && (
        <Suspense fallback={null}>
          <Sidebar 
            isOpenMobile={isMobileMenuOpen} 
            onCloseMobile={() => setIsMobileMenuOpen(false)} 
          />
        </Suspense>
      )}

      {/* Main Orchestration Column */}
      <div className={`flex flex-1 flex-col min-w-0 h-full relative`}>
        {/* Global Action Top Navbar */}
        {!isAuthRoute && (
          <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        )}

        {/* Dynamic Scrollable Content Workspace */}
        <main className={`flex-1 flex flex-col min-w-0 min-h-0 relative overflow-y-auto ${
          isZeroPaddingRoute 
            ? 'p-0 pb-16 md:pb-0' 
            : 'p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-8 bg-transparent'
        }`}>
          {children}
        </main>
      </div>

      {/* Mobile E-Commerce Bottom Navigation Bar */}
      {!isAuthRoute && (
        <MobileBottomNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      )}

      {!isAuthRoute && <GlobalShortcuts />}
    </div>
  );
}


