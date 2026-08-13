"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { Suspense } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const isLight = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);

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
          <Sidebar />
        </Suspense>
      )}

      {/* Main Orchestration Column */}
      <div className={`flex flex-1 flex-col min-w-0 h-full relative`}>
        {/* Global Action Top Navbar */}
        {!isAuthRoute && <Navbar />}

        {/* Dynamic Scrollable Content Workspace */}
        <main className={`flex-1 flex flex-col min-w-0 min-h-0 relative overflow-y-auto ${isAuthRoute ? 'p-0' : 'p-6 md:p-8 bg-transparent'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}


