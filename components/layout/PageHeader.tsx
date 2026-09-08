"use client";

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode; // Optional extra content below title
}

export function PageHeader({ title, description, icon, badge, actions, children }: PageHeaderProps) {
  let isLight = false;
  try {
    const { theme } = useTheme();
    isLight = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
  } catch (e) {}

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 mb-4 shrink-0`}>
      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {icon && (
            <div className={`shrink-0 text-theme-icon`}>
              {icon}
            </div>
          )}
          <h1 className={`text-lg sm:text-2xl font-bold tracking-tight text-foreground`}>
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className={`text-xs sm:text-[0.85rem] leading-relaxed line-clamp-2 sm:truncate text-muted`}>
            {description}
          </p>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

