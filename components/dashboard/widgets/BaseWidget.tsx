"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BaseWidgetProps {
  id?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  noPadding?: boolean;
  overflowHidden?: boolean;
}

export function BaseWidget({
  title,
  subtitle,
  icon,
  children,
  className,
  headerRight,
  noPadding = false,
  overflowHidden = false,
}: BaseWidgetProps) {
  return (
    <div 
      className={cn(
        "flex flex-col h-full overflow-hidden rounded-2xl theme-card-structural",
        "text-foreground transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg group",
        className
      )}
    >
      {(title || icon || headerRight) && (
        <div className="flex items-center justify-between px-5 py-4 border-b theme-card-structural">
          <div className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
            {icon && <div className="text-primary/70">{icon}</div>}
            {title && <div className="flex flex-col"><h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>{subtitle && <span className="text-xs text-muted-foreground font-normal tracking-normal capitalize">{subtitle}</span>}</div>}
          </div>
          {headerRight && (
            <div className="flex items-center text-xs">
              {headerRight}
            </div>
          )}
        </div>
      )}
      
      <div className={cn("flex-1 relative", overflowHidden ? "overflow-hidden" : "overflow-auto", !noPadding && "p-5")}>
        {children}
      </div>
    </div>
  );
}


