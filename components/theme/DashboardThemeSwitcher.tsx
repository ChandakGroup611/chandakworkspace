"use client";

import React from "react";
import { AppButton } from '@/components/ui/AppButton';
import { useDashboardTheme } from "./DashboardThemeProvider";
import { Palette } from "lucide-react";

export function DashboardThemeSwitcher() {
  const { dashboardTheme, setDashboardTheme, isDashboardRoute } = useDashboardTheme();

  // If not on a dashboard route, don't show the switcher
  if (!isDashboardRoute) return null;

  const themes = [
    { id: 'executive-light', name: 'Executive Light' },
    { id: 'tactical-utility', name: 'Tactical Operations' },
    { id: 'enterprise-bento', name: 'Enterprise Bento' },
    { id: 'midnight-operations', name: 'Midnight Intelligence' },
    { id: 'glass-intelligence', name: 'Executive Glass' }
  ];

  return (
    <div className="relative group">
      <AppButton className="flex items-center justify-center p-2 rounded-xl bg-gray-900/50 hover:bg-gray-800 transition-colors border border-white/10 text-gray-300">
        <Palette className="w-5 h-5" />
      </AppButton>

      <div className="absolute right-0 mt-2 w-56 bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
        <div className="p-3 border-b border-white/5 bg-gray-900/30">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dashboard Theme</h4>
        </div>
        <div className="p-2 space-y-1">
          {themes.map(t => (
            <AppButton
              key={t.id}
              onClick={() => setDashboardTheme(t.id as any)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex justify-between items-center ${
                dashboardTheme === t.id 
                  ? 'bg-accent text-white font-bold' 
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              {t.name}
              {dashboardTheme === t.id && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </AppButton>
          ))}
        </div>
      </div>
    </div>
  );
}
