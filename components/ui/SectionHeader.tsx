"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  divider?: boolean;
}

export function SectionHeader({
  title,
  description,
  icon,
  badge,
  actions,
  divider = true,
  className,
  children,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 shrink-0 select-none",
        divider && "border-b border-border",
        className
      )}
      {...props}
    >
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <div className="shrink-0 text-theme-icon h-4 w-4 flex items-center justify-center">
              {icon}
            </div>
          )}
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground truncate">
            {title}
          </h2>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
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
