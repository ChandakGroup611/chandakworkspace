"use client";

import React from "react";
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { Server, Monitor, Layers, ChevronRight, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fetchScopes } from "@/lib/actions/masters";

interface TicketScopeSelectorProps {
  onSelect: (scope: any) => void;
}

export function TicketScopeSelector({ onSelect }: TicketScopeSelectorProps) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  const [dbScopes, setDbScopes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchScopes().then(data => {
      setDbScopes(data);
      setLoading(false);
    });
  }, []);

  const getIcon = (code: string) => {
    switch (code) {
      case "INFRA": return Server;
      case "ERP": return Monitor;
      case "OTHERS": return Layers;
      default: return Layers;
    }
  };

  const getColor = (code: string) => {
    switch (code) {
      case "INFRA": return "from-blue-500/20 to-indigo-500/20";
      case "ERP": return "from-purple-500/20 to-pink-500/20";
      case "OTHERS": return "from-emerald-500/20 to-teal-500/20";
      default: return "from-gray-500/20 to-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-pulse">
        <div className="h-12 w-12 rounded-full border-4 border-accent/20 border-t-indigo-500 animate-spin" />
        <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Syncing Governance Matrix...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-1">
        <h2 className={`text-2xl font-bold tracking-tight ${"text-foreground"}`}>Select Operational Scope</h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Choose the appropriate category to route your ticket correctly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4">
        {dbScopes.map((scope) => {
          const Icon = getIcon(scope.code);
          const colorClass = getColor(scope.code);
          
          return (
            <button
              key={scope.id}
              onClick={() => onSelect(scope)}
              className="group relative text-left transition-all duration-300 hover:scale-[1.02] focus:outline-none"
            >
              <AppCard className={`h-full transition-all overflow-hidden relative ${
                isLightMode 
                  ? "bg-white border-gray-100 shadow-xl shadow-gray-200/50 group-hover:border-accent/30 group-hover:bg-gray-50/50" 
                  : "bg-white/[0.03] border-white/5 backdrop-blur-xl group-hover:border-white/20 group-hover:bg-white/[0.05]"
              }`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <AppCardContent className="p-6 relative z-10 space-y-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border ${
                    isLightMode ? "bg-white border-gray-100" : "bg-white/5 border-white/10"
                  }`}>
                    <Icon className={`h-6 w-6 ${isLightMode ? "text-accent" : "text-white"}`} />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className={`text-lg font-semibold transition-colors ${
                      isLightMode ? "text-gray-900 group-hover:text-accent" : "text-white group-hover:text-indigo-300"
                    }`}>
                      {scope.name}
                    </h3>
                    <p className="text-sm text-gray-400 leading-tight h-10 overflow-hidden line-clamp-2">
                      {scope.description}
                    </p>
                  </div>

                  <div className={`flex items-center text-xs font-bold uppercase tracking-widest transition-colors pt-2 ${
                    isLightMode ? "text-accent" : "text-accent group-hover:text-indigo-300"
                  }`}>
                    <span>Initialize Flow</span>
                    <ChevronRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </AppCardContent>
              </AppCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}
