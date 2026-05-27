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
  lg: "max-w-6xl",
  xl: "max-w-[1400px]",
  full: "max-w-7xl",
};

const ACCENT_MAP = {
  purple: "border-t-purple-500",
  indigo: "border-t-indigo-500",
  emerald: "border-t-emerald-500",
  amber: "border-t-amber-500",
  rose: "border-t-rose-500",
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
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-md animate-in fade-in duration-300 ${
          isLightMode ? "bg-gray-900/60" : "bg-[#070913]/90"
        }`} 
      />

      {/* Wizard Container */}
      <div 
        className={`relative w-full ${SIZE_MAP[size]} flex flex-col rounded-3xl shadow-2xl overflow-hidden border-t-4 ${ACCENT_MAP[headerAccent]} ${
          isLightMode 
            ? "bg-white border-x-0 border-b-0 shadow-2xl" 
            : "bg-[#0B0F19] border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.6)]"
        } ${className}`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className={`shrink-0 p-3 md:px-5 md:py-3 flex items-center justify-between gap-4 border-b ${
          isLightMode ? "border-gray-100 bg-white" : "border-white/5 bg-[#0B0F19]"
        }`}>
          <div className="flex flex-col justify-center">
            {title && <h2 className={`text-lg md:text-xl font-bold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>{title}</h2>}
            {subtitle && <div className={`mt-0.5 text-[0.8rem] md:text-xs ${isLightMode ? "text-gray-500" : "text-gray-400"}`}>{subtitle}</div>}
          </div>
          <button 
            onClick={onClose}
            type="button"
            className={`p-1.5 rounded-xl transition-colors shrink-0 ${
              isLightMode ? "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900" : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 md:px-6 md:py-6 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`shrink-0 p-4 md:px-6 md:py-4 border-t flex items-center justify-between gap-4 ${
            isLightMode ? "border-gray-100 bg-gray-50/50" : "border-white/5 bg-[#070913]/50"
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
