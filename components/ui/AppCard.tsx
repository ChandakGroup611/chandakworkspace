"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "theme-card-structural",
        "rounded-[var(--radius-card)] overflow-hidden relative transition-colors transition-shadow duration-150 ease-out",
        interactive && "hover:shadow-md hover:border-border-active cursor-pointer",
        className
      )}
      {...props}
    />
  )
);
AppCard.displayName = "AppCard";

export const AppCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1 p-4 pb-3 border-b border-border",
      className
    )}
    {...props}
  />
));
AppCardHeader.displayName = "AppCardHeader";

export const AppCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold text-sm leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
AppCardTitle.displayName = "AppCardTitle";

export const AppCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-[0.8rem] font-medium text-muted", className)}
    {...props}
  />
));
AppCardDescription.displayName = "AppCardDescription";

export const AppCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-3", className)} {...props} />
));
AppCardContent.displayName = "AppCardContent";

export const AppCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-4 pt-3 border-t border-border bg-sunken",
      className
    )}
    {...props}
  />
));
AppCardFooter.displayName = "AppCardFooter";
