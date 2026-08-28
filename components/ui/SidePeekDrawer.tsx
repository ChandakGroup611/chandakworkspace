"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { AppButton } from "./AppButton";
import { cn } from "@/lib/utils";

export interface SidePeekDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  hideCloseButton?: boolean;
}

export function SidePeekDrawer({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  className,
  hideCloseButton = false,
}: SidePeekDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const widthMap = {
    sm: "w-full sm:w-[400px]",
    md: "w-full sm:w-[500px]",
    lg: "w-full sm:w-[600px] md:w-[700px]",
    xl: "w-full sm:w-[800px] md:w-[900px]",
    full: "w-full",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/50 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className={cn(
          "relative flex flex-col bg-background border-l border-border  h-full transform transition-transform animate-in slide-in-from-right duration-300",
          widthMap[width],
          className
        )}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
            <div className="text-lg font-semibold tracking-tight text-foreground flex-1 min-w-0 pr-4 truncate">
              {title}
            </div>
            {!hideCloseButton && (
              <AppButton 
                variant="ghost" 
                size="icon-sm" 
                onClick={onClose}
                className="shrink-0 text-muted hover:text-foreground hover:bg-surface-hover rounded-md"
              >
                <X className="h-4 w-4" />
              </AppButton>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 relative">
          {children}
        </div>
      </div>
    </div>
  );
}
