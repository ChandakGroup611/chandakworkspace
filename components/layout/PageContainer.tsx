"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Use strict=true for heavily constrained layouts like dashboards or full-screen tables */
  strict?: boolean;
  /** Use wide=true to remove max-width restriction for wide layouts */
  wide?: boolean;
}

export function PageContainer({ 
  children, 
  className, 
  strict = false, 
  wide = false,
  ...props 
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto",
        !wide && "max-w-[1600px]",
        strict ? "h-full max-h-full flex flex-col min-h-0 min-w-0 overflow-hidden" : "min-h-full flex flex-col",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
