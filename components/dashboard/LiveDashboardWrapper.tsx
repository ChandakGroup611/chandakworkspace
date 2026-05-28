"use client";

import React, { useState, useEffect } from "react";
import DashboardCommandCenter from "./DashboardCommandCenter";
import { fetchLiveDashboardMetrics } from "@/lib/actions/dashboardMetrics";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

interface LiveDashboardWrapperProps {
  initialMetrics: any[];
  dbError: string | null;
}

export default function LiveDashboardWrapper({ initialMetrics, dbError }: LiveDashboardWrapperProps) {
  // Use React Query for enterprise-grade polling.
  // It handles deduplication, overlapping prevention, and natively respects Page Visibility API
  // (it pauses polling when the tab is inactive).
  const { data: metrics, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      const result = await fetchLiveDashboardMetrics();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    initialData: initialMetrics,
    refetchInterval: 60000, // 60 seconds strict polling limit
    refetchOnWindowFocus: true, // Recovers on tab switch
    refetchIntervalInBackground: false, // Absolutely do not poll if tab is hidden
    staleTime: 50000, // Keeps data fresh-ish without re-fetching immediately on navigation
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Convert timestamp to readable time for UX, only on client to prevent hydration mismatch
  const lastUpdated = mounted && dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "";

  const refreshComponent = (
    <div className="flex items-center gap-3">
      <div className="text-[10px] text-[var(--muted-foreground)] font-mono flex items-center gap-2 whitespace-nowrap">
        {isFetching ? <Loader2 className="w-3 h-3 animate-spin text-indigo-400" /> : <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
        {lastUpdated}
      </div>
      <AppButton 
        size="sm" 
        variant="outline" 
        onClick={() => refetch()} 
        disabled={isFetching}
        className="h-7 text-xs bg-[var(--background)] hover:bg-[var(--muted)] border-[var(--border)]"
        leftIcon={<RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />}
      >
        Refresh
      </AppButton>
    </div>
  );

  return (
    <div className="relative">
      <div className={isFetching ? "opacity-90 transition-opacity" : "opacity-100 transition-opacity"}>
        <DashboardCommandCenter metrics={metrics || []} dbError={dbError} refreshComponent={refreshComponent} />
      </div>
    </div>
  );
}
