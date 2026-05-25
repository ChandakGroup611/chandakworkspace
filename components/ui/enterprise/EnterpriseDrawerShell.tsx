"use client";

import React, { useEffect, useState } from "react";
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
  const isLightMode = theme === "executive-light";

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
        className={`absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300 ${
          isLightMode ? "bg-gray-900/40" : "bg-[#070913]/80"
        }`} 
        onClick={onClose} 
      />

      {/* Drawer Container */}
      <div 
        className={`relative w-full ${SIZE_MAP[size]} h-full flex flex-col shadow-2xl border-l animate-in slide-in-from-right duration-300 ${
          isLightMode 
            ? "bg-white border-gray-200" 
            : "bg-[#0B0F19] border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
        } ${className}`}
      >
        {/* Header */}
        <div className={`shrink-0 p-6 border-b flex items-start justify-between gap-4 ${
          isLightMode ? "border-gray-200 bg-white" : "border-white/10 bg-[#0B0F19]"
        }`}>
          <div>
            {title && <h2 className={`text-xl font-extrabold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>{title}</h2>}
            {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
          </div>
          <button 
            onClick={onClose}
            type="button"
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              isLightMode ? "hover:bg-gray-200 text-gray-500 hover:text-gray-900" : "hover:bg-white/10 text-gray-400 hover:text-white"
            }`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`shrink-0 p-6 border-t flex items-center justify-end gap-3 ${
            isLightMode ? "border-gray-200 bg-gray-50" : "border-white/10 bg-[#070913]/50"
          }`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
