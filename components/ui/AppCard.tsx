"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds hover border + shadow. Use only when the whole card is clickable. */
  interactive?: boolean;
}

/* v1: interactive cards jumped up 4px and scaled on click, and `rounded-2xl` was
   silently overridden by each theme's !important radius. Now one radius token,
   and hover is a border/shadow change only. */
export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(({ className, interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "theme-card-structural relative overflow-hidden",
      interactive && "cursor-pointer transition-[box-shadow,border-color] duration-150 hover:border-border-active hover:shadow-md focus-within:border-border-active",
      className
    )}
    {...props}
  />
));
AppCard.displayName = "AppCard";

export const AppCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1 border-b border-border px-4 py-3", className)} {...props} />
));
AppCardHeader.displayName = "AppCardHeader";

export const AppCardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-[14px] font-semibold leading-tight text-heading", className)} {...props} />
));
AppCardTitle.displayName = "AppCardTitle";

export const AppCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-[12.5px] text-muted", className)} {...props} />
));
AppCardDescription.displayName = "AppCardDescription";

export const AppCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
));
AppCardContent.displayName = "AppCardContent";

export const AppCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-2 border-t border-border bg-sunken px-4 py-3", className)} {...props} />
));
AppCardFooter.displayName = "AppCardFooter";
