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

const FALLBACK_SCOPES = [
  {
    id: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1",
    code: "INFRA",
    name: "IT Infrastructure",
    description: "Server issues, hardware faults, network connectivity, and assigned asset support.",
  },
  {
    id: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2",
    code: "ERP",
    name: "ERP & Software Systems",
    description: "SAP, Salesforce, internal modules, bugs, and software requirement requests.",
  },
  {
    id: "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3",
    code: "OTHERS",
    name: "General Inquiries",
    description: "General support, access requests, and other non-technical operational help.",
  }
];

export function TicketScopeSelector({ onSelect, onDiscard }: TicketScopeSelectorProps) {
  const { isLight: isLightMode } = useTheme();
  const [dbScopes, setDbScopes] = React.useState<any[]>(FALLBACK_SCOPES);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    fetchScopes()
      .then(data => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setDbScopes(data);
        } else {
          setDbScopes(FALLBACK_SCOPES);
        }
      })
      .catch((err) => {
        console.error("Failed to load scopes:", err);
        if (isMounted) setDbScopes(FALLBACK_SCOPES);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
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
        <ChandakLoader size="md" title="Loading…" subtitle="Fetching ticket categories" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Select ticket category</h2>
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
              className="p-0 h-auto w-full group relative text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-btn-primary rounded-xl"
            >
              <AppCard className={`h-full w-full transition-all duration-200 overflow-hidden relative shadow-sm hover:shadow-md hover:border-theme-btn-primary/60 theme-card-structural rounded-xl border border-border/60`}>
                <AppCardContent className="p-5 relative z-10 flex flex-col h-full space-y-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-accent-soft text-theme-icon group-hover:bg-theme-btn-primary group-hover:text-theme-btn-primary-text transition-colors duration-200 border border-border/40`}>
                    <Icon className="h-6 w-6 transition-colors duration-200" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-theme-btn-primary transition-colors">
                      {scope.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold transition-colors pt-3 border-t border-border/40 text-muted group-hover:text-foreground">
                    <span>Continue</span>
                    <div className="h-6 w-6 rounded-full bg-border/40 group-hover:bg-foreground/10 flex items-center justify-center transition-colors">
                      <ChevronRight className="h-3.5 w-3.5 transform transition-transform" />
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

