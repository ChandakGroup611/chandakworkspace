"use client";

import React, { useEffect, useState } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface EnterpriseDrawerShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function EnterpriseDrawerShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  className = "",
}: EnterpriseDrawerShellProps) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Drawer Container */}
      <div 
        className={`relative w-full ${SIZE_MAP[size]} h-full flex flex-col border-l border-border shadow-2xl shadow-black/40 animate-in slide-in-from-right duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] theme-card-structural ${className}`}
      >
        {/* Header */}
        <div className="shrink-0 p-6 border-b border-border/50 flex items-start justify-between gap-4 theme-card-structural">
          <div>
            {title && <h2 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h2>}
            {subtitle && <div className="text-sm text-muted mt-1">{subtitle}</div>}
          </div>
          <AppButton variant="ghost" 
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl transition-all shrink-0 hover:bg-elevated text-muted hover:text-foreground active:scale-95"
          >
            <X className="h-5 w-5" />
          </AppButton>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 p-6 border-t border-border/50 flex items-center justify-end gap-3 theme-card-structural">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
