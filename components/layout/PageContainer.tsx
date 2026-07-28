"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Use strict=true for heavily constrained layouts like dashboards or full-screen tables */
  strict?: boolean;
}

export function PageContainer({ children, className, strict = false, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto px-6 py-6 md:px-8 md:py-8 max-w-[1600px]",
        strict ? "h-full max-h-full flex flex-col min-h-0 min-w-0 overflow-hidden" : "min-h-full flex flex-col",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
