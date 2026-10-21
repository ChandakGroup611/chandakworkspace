"use client";

/**
 * WorkspaceShell v2
 * - No inline `color: var(--text-primary, #FFFFFF)` (white fallback flashed white text on
 *   light pages before tokens loaded).
 * - Scroll reset runs once per navigation (v1 ran it 3× per route plus 3× per event).
 * - Bottom padding on mobile matches the bottom bar + iOS safe area, so the last table row
 *   is no longer hidden behind it.
 * - Removed unused theme lookups and the unused compact-state listener.
 */
import React, { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import GlobalShortcuts from "./GlobalShortcuts";
import MobileBottomNav from "./MobileBottomNav";
import DeploymentVersionBanner from "./DeploymentVersionBanner";
import { cn } from "@/lib/utils";

const AUTH_ROUTES = new Set(["/login", "/register", "/select-module"]);

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const isAuthRoute = AUTH_ROUTES.has(pathname);
  const segs = pathname.split("/");
  const isRequirementDetails = pathname.startsWith("/requirements/") && segs.length === 3 && !["reports", "approvals", "grooming"].includes(segs[2]);
  const isZeroPadding = isAuthRoute || isRequirementDetails || pathname === "/";
  const isDesign = pathname.startsWith("/design");

  useEffect(() => {
    setMobileMenuOpen(false);
    requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }));
  }, [pathname]);

  useEffect(() => {
    const toTop = () => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.addEventListener("app:scroll-top", toTop);
    return () => window.removeEventListener("app:scroll-top", toTop);
  }, []);

  if (isAuthRoute) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <DeploymentVersionBanner />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Suspense fallback={<div className="hidden w-[248px] shrink-0 border-r border-sidebar-border bg-sidebar md:block" />}>
        <Sidebar isOpenMobile={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      </Suspense>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <DeploymentVersionBanner />
        <Navbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto outline-none",
            "pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0",
            !isZeroPadding && (isDesign ? "px-3 pt-3 md:px-4 md:pt-4 md:pb-6 lg:px-5" : "px-3 pt-4 sm:px-4 md:px-6 md:pt-6 md:pb-8 lg:px-8")
          )}
        >
          {children}
        </main>
      </div>

      <MobileBottomNav onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      <GlobalShortcuts />
    </div>
  );
}
