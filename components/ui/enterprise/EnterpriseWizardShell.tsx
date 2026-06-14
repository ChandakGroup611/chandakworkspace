"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface EnterpriseWizardShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  headerAccent?: "purple" | "indigo" | "emerald" | "amber" | "rose";
}

const SIZE_MAP = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-7xl",
};

const ACCENT_MAP = {
  purple: "from-purple-600/20 to-transparent",
  indigo: "from-indigo-600/20 to-transparent",
  emerald: "from-emerald-600/20 to-transparent",
  amber: "from-amber-600/20 to-transparent",
  rose: "from-rose-600/20 to-transparent",
};

const ACCENT_BORDER_MAP = {
  purple: "border-purple-500/50",
  indigo: "border-indigo-500/50",
  emerald: "border-emerald-500/50",
  amber: "border-amber-500/50",
  rose: "border-rose-500/50",
};

export function EnterpriseWizardShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  className = "",
  headerAccent = "purple"
}: EnterpriseWizardShellProps) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Standard Solid Backdrop */}
      <div 
        className={`absolute inset-0 animate-in fade-in duration-300 ${
          isLightMode ? "bg-gray-900/50" : "bg-black/70"
        }`} 
        onClick={onClose}
      />

      <div 
        className={`relative w-full ${SIZE_MAP[size]} flex flex-col rounded-xl shadow-[var(--shadow-ambient)] overflow-hidden animate-in zoom-in-95 fade-in duration-200 bg-background border border-border ${className}`}
        style={{ maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Solid and Sharp */}
        <div className="shrink-0 px-6 py-5 flex items-start justify-between gap-4 border-b border-border bg-background">
          <div className="relative z-10 flex flex-col justify-center">
            {title && <div className={`text-xl font-semibold tracking-tight ${"text-foreground"}`}>{title}</div>}
            {subtitle && <div className={`mt-1 text-sm ${"text-muted"}`}>{subtitle}</div>}
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="relative z-10 p-2 rounded-md transition-all shrink-0 active:scale-95 text-muted-foreground hover:text-foreground hover:bg-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-surface">
          <div className="mx-auto w-full max-w-full">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-between gap-4 border-border bg-background">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
