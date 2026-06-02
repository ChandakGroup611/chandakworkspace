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
      <div className="flex flex-1 flex-col min-w-0 min-h-screen relative overflow-x-auto">
        {/* Removed Background Decorative Ambient Circles for Enterprise Discipline */}

        {/* Global Action Top Navbar */}
        {!isAuthRoute && <Navbar />}

        {/* Dynamic Scrollable Content Workspace - Zero Global Padding to allow Density Modes */}
        <main className={`flex-1 w-full relative pb-24 ${isAuthRoute ? 'p-0' : 'p-0'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

