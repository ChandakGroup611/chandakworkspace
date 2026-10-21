"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import type { ThemeId } from "./theme-registry";

export type DashboardTheme = ThemeId | string;

export function DashboardThemeProvider({
  children,
}: {
  children: React.ReactNode;
  initialTheme?: string;
}) {
  return <>{children}</>;
}

export const useDashboardTheme = () => {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isDashboardRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/reports") ||
    pathname?.startsWith("/analytics") ||
    false;

  return {
    dashboardTheme: theme,
    setDashboardTheme: setTheme,
    isDashboardRoute,
  };
};
