"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BaseWidgetProps {
  id: string;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  noPadding?: boolean;
  overflowHidden?: boolean;
}

export function BaseWidget({
  title,
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
        "flex flex-col h-full overflow-hidden rounded-2xl border border-border shadow-sm",
        "bg-surface/80 backdrop-blur-md text-foreground transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg group",
        className
      )}
    >
      {(title || icon || headerRight) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-background/30">
          <div className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition-colors">
            {icon && <div className="text-primary/70">{icon}</div>}
            {title && <h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>}
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
