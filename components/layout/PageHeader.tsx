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
    isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
  } catch (e) {}

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b shrink-0 ${
      isLight ? "border-gray-200" : "border-white/5"
    }`}>
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <div className={`shrink-0 ${isLight ? "text-indigo-600" : "text-indigo-400"}`}>
              {icon}
            </div>
          )}
          <h1 className={`text-2xl font-bold tracking-tight truncate ${isLight ? "text-gray-900" : "text-white"}`}>
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className={`text-[0.85rem] leading-relaxed truncate ${isLight ? "text-gray-600" : "text-gray-400"}`}>
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
