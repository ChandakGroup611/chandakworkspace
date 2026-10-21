"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import GlobalShortcuts from "./GlobalShortcuts";
import MobileBottomNav from "./MobileBottomNav";
import DeploymentVersionBanner from "./DeploymentVersionBanner";

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname === "/register" || pathname === "/select-module";
  const isDashboardRoute = pathname === "/";
  const isRequirementDetailsRoute = pathname.startsWith("/requirements/") && pathname.split("/").length === 3 && !["reports", "approvals", "grooming"].includes(pathname.split("/")[2]);
  const isDesignRoute = pathname?.startsWith("/design");
  const isZeroPaddingRoute = isAuthRoute || isRequirementDetailsRoute || isDashboardRoute;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Close mobile drawer and reset scroll once per route change on main
  useEffect(() => {
    setIsMobileMenuOpen(false);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  // Global scroll-to-top event listener for sub-navigation and modals
  useEffect(() => {
    const handleScrollTop = () => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("app:scroll-top", handleScrollTop);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("app:scroll-top", handleScrollTop);
      }
    };
  }, []);

  return (
    <div className="h-screen w-full flex font-sans antialiased relative selection:bg-selected overflow-hidden bg-background text-foreground">
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
      <div className="flex flex-1 flex-col min-w-0 h-full relative">
        {/* Dynamic Live Update Banner */}
        <DeploymentVersionBanner />

        {/* Global Action Top Navbar */}
        {!isAuthRoute && (
          <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        )}

        {/* Dynamic Scrollable Content Workspace */}
        <main
          ref={mainRef}
          className={`flex-1 flex flex-col min-w-0 min-h-0 relative overflow-y-auto ${
            isZeroPaddingRoute 
              ? "p-0 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0" 
              : isDesignRoute
                ? "p-2 sm:p-3 md:p-4 lg:p-5 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-6 bg-transparent w-full min-w-0 max-w-none"
                : "p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-8 bg-transparent"
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!isAuthRoute && (
        <MobileBottomNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      )}

      {!isAuthRoute && <GlobalShortcuts />}
    </div>
  );
}
