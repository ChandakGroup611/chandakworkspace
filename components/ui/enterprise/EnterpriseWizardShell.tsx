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
      {/* Dynamic Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-xl animate-in fade-in duration-500 ${
          isLightMode ? "bg-gray-900/30" : "bg-[#02040a]/80"
        }`} 
        onClick={onClose}
      />

      {/* Main Wizard Container */}
      <div 
        className={`relative w-full ${SIZE_MAP[size]} flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 ${
          isLightMode 
            ? "bg-white/90 backdrop-blur-3xl border border-gray-200/50" 
            : "bg-[#0b0f19]/90 backdrop-blur-3xl border border-white/10"
        } ${className}`}
        style={{ maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent Top Border */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${ACCENT_BORDER_MAP[headerAccent]} via-transparent`} />

        {/* Header with Glassmorphic Gradient */}
        <div className={`shrink-0 px-6 py-5 flex items-start justify-between gap-4 border-b relative overflow-hidden ${
          isLightMode ? "border-gray-200/50" : "border-white/5"
        }`}>
          {/* Subtle Background Gradient for Header */}
          <div className={`absolute inset-0 bg-gradient-to-b ${ACCENT_MAP[headerAccent]} pointer-events-none opacity-50`} />
          
          <div className="relative z-10 flex flex-col justify-center">
            {title && <h2 className={`text-2xl font-black tracking-tight ${"text-foreground"}`}>{title}</h2>}
            {subtitle && <div className={`mt-1 text-sm font-medium ${"text-muted"}`}>{subtitle}</div>}
          </div>
          <button 
            onClick={onClose}
            type="button"
            className={`relative z-10 p-2 rounded-full transition-all shrink-0 active:scale-95 ${
              isLightMode ? "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 shadow-sm" : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
          <div className="mx-auto w-full max-w-full">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className={`shrink-0 px-6 py-4 border-t flex items-center justify-between gap-4 backdrop-blur-xl ${
            isLightMode ? "border-gray-200/50 bg-gray-50/80" : "border-white/5 bg-black/40"
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
