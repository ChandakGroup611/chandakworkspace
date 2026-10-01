"use client";

import React from "react";
import { AppButton } from '@/components/ui/AppButton';
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { Server, Monitor, Layers, ChevronRight, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fetchScopes } from "@/lib/actions/masters";
import ChandakLoader from "@/components/ui/ChandakLoader";

interface TicketScopeSelectorProps {
  onSelect: (scope: any) => void;
  onDiscard?: () => void;
}

export function TicketScopeSelector({ onSelect, onDiscard }: TicketScopeSelectorProps) {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ChandakLoader size="md" title="Loading..." subtitle="Fetching ticket categories" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Select Ticket Category</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full px-4">
        {dbScopes.map((scope) => {
          const Icon = getIcon(scope.code);
          
          return (
            <AppButton
              key={scope.id}
              onClick={() => onSelect(scope)}
              type="button"
              variant="ghost"
              className="p-0 h-auto w-full group relative text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-btn-primary rounded-xl"
            >
              <AppCard className={`h-full w-full transition-all duration-200 overflow-hidden relative shadow-sm hover:shadow-md hover:border-theme-btn-primary/60 theme-card-structural rounded-xl border border-border/60`}>
                <AppCardContent className="p-5 relative z-10 flex flex-col h-full space-y-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-theme-btn-primary/10 text-theme-icon group-hover:bg-theme-btn-primary group-hover:text-theme-btn-primary-text transition-colors duration-200 border border-border/40`}>
                    <Icon className="h-6 w-6 transition-colors duration-200" />
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-theme-btn-primary transition-colors">
                      {scope.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase transition-colors pt-3 border-t border-border/40 text-muted group-hover:text-foreground">
                    <span>Continue</span>
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
      
      {onDiscard && (
        <div className="mt-6 pt-4 border-t border-border w-full flex justify-center">
          <AppButton variant="outline" type="button" onClick={onDiscard} className="text-danger border-danger/30 hover:bg-danger/10 hover:border-danger hover:text-danger px-6">
            Cancel
          </AppButton>
        </div>
      )}
    </div>
  );
}

