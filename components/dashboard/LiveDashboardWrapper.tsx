"use client";

import React, { useState, useEffect } from "react";
import DashboardCommandCenter from "./DashboardCommandCenter";
import { fetchLiveDashboardMetrics } from "@/lib/actions/dashboardMetrics";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

interface LiveDashboardWrapperProps {
  initialMetrics?: any[];
  initialKpis?: any;
  initialMeta?: any;
  dbError?: string | null;
}

export default function LiveDashboardWrapper({ initialMetrics, initialKpis, initialMeta, dbError }: LiveDashboardWrapperProps) {
  const hasInitialData = Boolean(initialMetrics && initialMetrics.length > 0);

  // Use React Query for enterprise-grade polling.
  const { data, isFetching, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      const result = await fetchLiveDashboardMetrics();
      if (result.error) throw new Error(result.error);
      return result;
    },
    initialData: (hasInitialData ? { data: initialMetrics, kpis: initialKpis, meta: initialMeta } : undefined) as any,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  const metrics = data?.data || (hasInitialData ? initialMetrics : []);
  const kpis = data?.kpis || initialKpis;
  const meta = data?.meta || initialMeta;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Convert timestamp to readable time for UX, only on client to prevent hydration mismatch
  const lastUpdated = mounted && dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "";

  const refreshComponent = (
    <button 
      type="button"
      onClick={() => refetch()}
      disabled={isFetching}
      title="Click to refresh live metrics"
      className="flex items-center gap-2 px-2.5 py-1 theme-card-structural rounded-full hover:opacity-80 transition-all cursor-pointer select-none border border-border/40"
    >
      {isFetching ? (
        <Loader2 className="w-3 h-3 animate-spin text-theme-icon" />
      ) : (
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
      )}
      <span className="text-[10px] text-muted font-medium tracking-wider">
        {isFetching ? "SYNCING" : "LIVE"}
      </span>
    </button>
  );

  // If initial metrics are loading on first client mount, show a sleek in-context skeleton
  if (!data && isLoading) {
    return (
      <div className="w-full p-4 md:p-6 space-y-6 animate-pulse" aria-label="Loading dashboard deliverables...">
        <div className="flex justify-between items-center pb-4 border-b border-border/40">
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-muted/20 rounded-xl"></div>
            <div className="h-9 w-32 bg-muted/10 rounded-xl"></div>
          </div>
          <div className="h-7 w-24 bg-muted/20 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-24 bg-muted/15 rounded-xl border border-border/30"></div>
          <div className="h-24 bg-muted/15 rounded-xl border border-border/30"></div>
          <div className="h-24 bg-muted/15 rounded-xl border border-border/30"></div>
          <div className="h-24 bg-muted/15 rounded-xl border border-border/30"></div>
        </div>
        <div className="h-64 bg-muted/10 rounded-2xl border border-border/20"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className={isFetching ? "opacity-95 transition-opacity" : "opacity-100 transition-opacity"}>
        <DashboardCommandCenter 
          metrics={metrics || []} 
          kpis={kpis} 
          meta={meta}
          dbError={dbError} 
          refreshComponent={refreshComponent} 
        />
      </div>
    </div>
  );
}
