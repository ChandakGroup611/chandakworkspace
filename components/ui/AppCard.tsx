"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export const AppCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let isLight = false;
  try {
    const { theme } = useTheme();
    isLight = theme === "executive-light";
  } catch (e) {}

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300",
        isLight 
          ? "bg-white border border-gray-200/80 shadow-sm" 
          : "border border-white/5 bg-white/[0.02]",
        className
      )}
      {...props}
    />
  );
});
AppCard.displayName = "AppCard";

export const AppCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let isLight = false;
  try {
    const { theme } = useTheme();
    isLight = theme === "executive-light";
  } catch (e) {}

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1 p-5 pb-3 border-b",
        isLight ? "border-gray-100" : "border-white/5",
        className
      )}
      {...props}
    />
  );
});
AppCardHeader.displayName = "AppCardHeader";

export const AppCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  let isLight = false;
  try {
    const { theme } = useTheme();
    isLight = theme === "executive-light";
  } catch (e) {}

  return (
    <h3
      ref={ref}
      className={cn(
        "font-semibold text-sm leading-none tracking-tight",
        isLight ? "text-gray-900" : "text-white",
        className
      )}
      {...props}
    />
  );
});
AppCardTitle.displayName = "AppCardTitle";

export const AppCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-[11px] font-medium text-gray-400", className)}
    {...props}
  />
));
AppCardDescription.displayName = "AppCardDescription";

export const AppCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-4", className)} {...props} />
));
AppCardContent.displayName = "AppCardContent";

export const AppCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let isLight = false;
  try {
    const { theme } = useTheme();
    isLight = theme === "executive-light";
  } catch (e) {}

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-5 pt-3 border-t",
        isLight ? "border-gray-100 bg-gray-50/50" : "border-white/5 bg-white/[0.01]",
        className
      )}
      {...props}
    />
  );
});
AppCardFooter.displayName = "AppCardFooter";

