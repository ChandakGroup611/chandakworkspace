"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type DashboardTheme = 'executive-light' | 'midnight-operations' | 'glass-intelligence' | 'enterprise-bento' | 'tactical-utility';

interface DashboardThemeContextType {
  dashboardTheme: DashboardTheme;
  setDashboardTheme: (theme: DashboardTheme) => void;
  isDashboardRoute: boolean;
}

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined);

export function DashboardThemeProvider({ children, initialTheme = 'executive-light' }: { children: React.ReactNode, initialTheme?: DashboardTheme }) {
  const [dashboardTheme, setDashboardTheme] = useState<DashboardTheme>(initialTheme);
  const pathname = usePathname();

  // Check if current route is under dashboard, reports, or analytics
  const isDashboardRoute = pathname?.startsWith('/dashboard') || pathname?.startsWith('/reports') || pathname?.startsWith('/analytics');

  useEffect(() => {
    if (isDashboardRoute) {
      // Apply theme to a specific wrapper or root if we want it to cascade
      // We'll use data-dashboard-theme to isolate it from the global data-theme
      document.documentElement.setAttribute('data-dashboard-theme', dashboardTheme);
    } else {
      document.documentElement.removeAttribute('data-dashboard-theme');
    }
  }, [dashboardTheme, isDashboardRoute]);

  const value = {
    dashboardTheme,
    setDashboardTheme: (t: DashboardTheme) => {
      setDashboardTheme(t);
      // Fire and forget server action to save preference
      saveThemePreference(t).catch(console.error);
    },
    isDashboardRoute
  };

  return (
    <DashboardThemeContext.Provider value={value}>
      <div className={isDashboardRoute ? `dashboard-theme-${dashboardTheme} h-full w-full bg-background text-foreground transition-colors duration-300` : "h-full w-full"}>
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export const useDashboardTheme = () => {
  const ctx = useContext(DashboardThemeContext);
  if (!ctx) throw new Error("useDashboardTheme must be used within DashboardThemeProvider");
  return ctx;
};

// Fire and forget server action helper inside client component
async function saveThemePreference(theme: string) {
  // We'll call an API or Server Action to persist this
  try {
    const res = await fetch('/api/dashboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });
    if (!res.ok) console.error("Failed to save dashboard theme preference");
  } catch (e) {
    console.error(e);
  }
}
