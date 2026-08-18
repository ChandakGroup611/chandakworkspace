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

  const getStyleProps = (code: string) => {
    switch (code) {
      case "INFRA": return { iconBg: "bg-theme-btn-primary text-theme-btn-primary-text/10", iconText: "text-accent dark:text-accent", hoverBg: "group-hover:bg-theme-btn-primary text-theme-btn-primary-text", border: "group-hover:border-blue-500/50", gradient: "from-accent/5 to-indigo-500/5 group-hover:from-accent/10 group-hover:to-indigo-500/10" };
      case "ERP": return { iconBg: "bg-orange-500/10", iconText: "text-orange-600 dark:text-orange-400", hoverBg: "group-hover:bg-orange-500", border: "group-hover:border-orange-500/50", gradient: "from-orange-500/5 to-amber-500/5 group-hover:from-orange-500/10 group-hover:to-amber-500/10" };
      case "OTHERS": return { iconBg: "bg-success/10", iconText: "text-success dark:text-success", hoverBg: "group-hover:bg-success", border: "group-hover:border-emerald-500/50", gradient: "from-emerald-500/5 to-teal-500/5 group-hover:from-emerald-500/10 group-hover:to-teal-500/10" };
      default: return { iconBg: "bg-slate-500/10", iconText: "text-slate-600 dark:text-slate-400", hoverBg: "group-hover:bg-slate-500", border: "group-hover:border-slate-500/50", gradient: "from-slate-500/5 to-gray-500/5 group-hover:from-slate-500/10 group-hover:to-gray-500/10" };
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
          const style = getStyleProps(scope.code);
          
          return (
            <AppButton
              key={scope.id}
              onClick={() => onSelect(scope)}
              type="button"
              variant="ghost"
              className="p-0 h-auto w-full group relative text-left transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-btn-primary rounded-xl"
            >
              <AppCard className={`h-full w-full transition-all duration-300 overflow-hidden relative border ${isLightMode ? 'border-border/80 hover:border-theme-btn-primary/60' : 'border-border hover:border-theme-btn-primary/80'} shadow-sm hover:shadow-md ${style.border} bg-surface rounded-2xl`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} transition-colors duration-500`} />
                <AppCardContent className="p-6 relative z-10 flex flex-col h-full space-y-5">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${style.iconBg} ${style.hoverBg} transition-colors duration-300 shadow-sm border border-black/5 dark:border-border`}>
                    <Icon className={`h-7 w-7 ${style.iconText} group-hover:text-white transition-colors duration-300`} />
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <h3 className="text-[17px] font-semibold text-foreground group-hover:text-foreground/90 transition-colors">
                      {scope.name}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed line-clamp-2">
                      {scope.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase transition-colors pt-4 border-t border-border/50 text-muted group-hover:text-foreground">
                    <span>Initialize Flow</span>
                    <div className="h-6 w-6 rounded-full bg-border/40 group-hover:bg-foreground/10 flex items-center justify-center transition-colors">
                      <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
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

