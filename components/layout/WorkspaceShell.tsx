"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
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
      className="min-h-screen w-full flex font-sans antialiased transition-colors duration-300 relative selection:bg-cyan-500/20"
      style={{
        backgroundColor: "var(--bg-primary, #0A0D14)",
        color: "var(--text-primary, #FFFFFF)"
      }}
    >
      {/* Sidebar Navigation */}
      {!isAuthRoute && <Sidebar />}

      {/* Main Orchestration Column */}
      <div className="flex flex-1 flex-col min-w-0 min-h-screen relative overflow-x-hidden">
        {/* Background Decorative Ambient Circles */}
        {!isLight && (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          </>
        )}
        {isLight && (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/[0.03] rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Global Action Top Navbar */}
        {!isAuthRoute && <Navbar />}

        {/* Dynamic Scrollable Content Workspace */}
        <main className={`flex-1 w-full relative pb-24 ${isAuthRoute ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

