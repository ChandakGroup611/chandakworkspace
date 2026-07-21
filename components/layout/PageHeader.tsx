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
    isLight = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);
  } catch (e) {}

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b shrink-0 ${
      "border-border"
    }`}>
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <div className={`shrink-0 text-accent`}>
              {icon}
            </div>
          )}
          <h1 className={`text-2xl font-bold tracking-tight truncate text-foreground`}>
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className={`text-[0.85rem] leading-relaxed truncate text-muted`}>
            {description}
          </p>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

