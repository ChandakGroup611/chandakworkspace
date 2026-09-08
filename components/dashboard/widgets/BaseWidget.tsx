"use client";

import React, { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  collapsible?: boolean;
  defaultCollapsed?: boolean;
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
  collapsible = false,
  defaultCollapsed = false,
}: BaseWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div 
      className={cn(
        "flex flex-col rounded-2xl theme-card-structural border border-border/70",
        "text-foreground transition-all duration-300 shadow-xs",
        isCollapsed ? "h-auto" : "h-full overflow-hidden hover:-translate-y-0.5 hover:shadow-md",
        "group",
        className
      )}
    >
      {(title || icon || headerRight || collapsible) && (
        <div 
          className={cn(
            "flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 theme-card-structural select-none",
            !isCollapsed && "border-b border-border/50",
            collapsible && "cursor-pointer hover:bg-surface/50"
          )}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        >
          <div className="flex items-center gap-2.5 text-foreground/90 group-hover:text-foreground transition-colors min-w-0">
            {icon && <div className="text-theme-icon shrink-0">{icon}</div>}
            {title && (
              <div className="flex flex-col min-w-0">
                <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate">{title}</h3>
                {subtitle && <span className="text-[11px] text-muted-foreground font-normal tracking-normal truncate">{subtitle}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            {headerRight}
            {collapsible && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                title={isCollapsed ? "Maximize widget" : "Minimize widget"}
                aria-label={isCollapsed ? "Maximize widget" : "Minimize widget"}
              >
                {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      )}
      
      {!isCollapsed && (
        <div className={cn("flex-1 relative animate-in fade-in duration-200", overflowHidden ? "overflow-hidden" : "overflow-auto", !noPadding && "p-4 sm:p-5")}>
          {children}
        </div>
      )}
    </div>
  );
}


