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
  badge?: ReactNode;
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
  badge,
  noPadding = false,
  overflowHidden = false,
  collapsible = true,
  defaultCollapsed = false,
}: BaseWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div 
      className={cn(
        "flex flex-col rounded-2xl theme-card-structural border border-border/70",
        "text-foreground transition-all duration-300 shadow-xs",
        isCollapsed ? "!h-auto !min-h-0 overflow-hidden" : "h-full overflow-hidden hover:-translate-y-0.5 hover:shadow-md",
        "group",
        className,
        isCollapsed && "!h-auto !min-h-0"
      )}
    >
      {(title || icon || headerRight || collapsible) && (
        <div 
          className={cn(
            "flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 theme-card-structural select-none",
            !isCollapsed ? "border-b border-border/50" : "hover:bg-surface/60",
            collapsible && "cursor-pointer"
          )}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
          role={collapsible ? "button" : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={collapsible ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsCollapsed(!isCollapsed); } } : undefined}
          aria-expanded={!isCollapsed}
        >
          <div className="flex items-center gap-2.5 text-foreground/90 group-hover:text-foreground transition-colors min-w-0 flex-1">
            {icon && <div className="text-theme-icon shrink-0">{icon}</div>}
            {title && (
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate">{title}</h3>
                  {badge}
                </div>
                {subtitle && <span className="text-[11px] text-muted-foreground font-normal tracking-normal truncate">{subtitle}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            {headerRight}
            {collapsible && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all bg-surface/40 border border-border/40"
                title={isCollapsed ? "Maximize widget" : "Minimize widget"}
                aria-label={isCollapsed ? "Maximize widget" : "Minimize widget"}
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
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


