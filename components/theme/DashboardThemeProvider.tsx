"use client";

/**
 * DEPRECATED shim.
 * v1 kept a second, separate theme for /dashboard, /reports and /analytics, whose
 * default ("executive-light") and most options had no CSS at all, and it was never
 * restored from the saved preference. Dashboards now follow the global theme.
 * This file only exists so existing imports keep compiling; remove it when the
 * imports are gone.
 */
import React from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

export function DashboardThemeProvider({ children }: { children: React.ReactNode; initialTheme?: string }) {
  return <>{children}</>;
}

export const useDashboardTheme = () => {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname() || "";
  return {
    dashboardTheme: theme,
    setDashboardTheme: setTheme,
    isDashboardRoute: /^\/(dashboard|dashboards|reports|analytics)(\/|$)/.test(pathname),
  };
};
