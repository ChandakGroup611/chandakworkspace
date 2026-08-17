"use client";

import React from "react";
import { AppButton } from '@/components/ui/AppButton';
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { Server, Monitor, Layers, ChevronRight, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fetchScopes } from "@/lib/actions/masters";

interface TicketScopeSelectorProps {
  onSelect: (scope: any) => void;
}

export function TicketScopeSelector({ onSelect }: TicketScopeSelectorProps) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
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
        <div className="h-12 w-12 rounded-full border-4 border-theme-btn-primary/20 border-t-indigo-500 animate-spin" />
        <p className="text-xs text-muted font-bold tracking-[0.2em] uppercase">Syncing Governance Matrix...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-1">
        <h2 className={`-theme-heading"}`}>Select Operational Scope</h2>
        <p className="text-sm text-muted max-w-md mx-auto">
          Choose the appropriate category to route your ticket correctly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4">
        {dbScopes.map((scope) => {
          const Icon = getIcon(scope.code);
          const colorClass = getColor(scope.code);
          
          return (
            <AppButton
              key={scope.id}
              onClick={() => onSelect(scope)}
              type="button"
              variant="ghost"
              className="p-0 h-auto w-full group relative text-left transition-all duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-btn-primary rounded-xl"
            >
              <AppCard className="h-full w-full transition-all overflow-hidden relative border border-border/40 hover:border-theme-btn-primary/50 hover:shadow-md bg-surface/50 hover:bg-surface">
                <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                <AppCardContent className="p-6 relative z-10 flex flex-col h-full space-y-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-surface border border-border/50 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                    <Icon className="h-6 w-6 text-theme-icon" />
                  </div>
                  
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-lg font-semibold transition-colors text-foreground group-hover:text-theme-btn-primary">
                      {scope.name}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed line-clamp-2">
                      {scope.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold tracking-wider uppercase transition-colors pt-4 border-t border-border/30 text-muted group-hover:text-theme-btn-primary">
                    <span>Initialize Flow</span>
                    <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </AppCardContent>
              </AppCard>
            </AppButton>
          );
        })}
      </div>
    </div>
  );
}

