"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface EnterpriseModalShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const SIZE_MAP = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-[1400px]",
  full: "max-w-7xl",
};

export function EnterpriseModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
  className = "",
}: EnterpriseModalShellProps) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-8">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300 ${
          isLightMode ? "bg-gray-900/40" : "bg-[#070913]/80"
        }`} 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full ${SIZE_MAP[size]} flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
          isLightMode 
            ? "bg-white border-gray-200 shadow-xl" 
            : "bg-[#0B0F19] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        } ${className}`}
        style={{
          maxHeight: "calc(100vh - 48px)" // Safe spacing
        }}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className={`shrink-0 p-5 border-b flex items-start justify-between gap-4 ${
            isLightMode ? "border-gray-200 bg-gray-50/50" : "border-white/10 bg-white/[0.02]"
          }`}>
            <div>
              {title && <h2 className={`text-lg font-bold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>{title}</h2>}
              {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
            </div>
            <button 
              onClick={onClose}
              type="button"
              className={`p-2 rounded-xl transition-colors ${
                isLightMode ? "hover:bg-gray-200 text-gray-500 hover:text-gray-900" : "hover:bg-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`shrink-0 p-5 border-t flex items-center justify-end gap-3 ${
            isLightMode ? "border-gray-200 bg-gray-50" : "border-white/10 bg-[#070913]/50"
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
