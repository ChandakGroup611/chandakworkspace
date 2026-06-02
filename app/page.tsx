import React from "react";
import LiveDashboardWrapper from "@/components/dashboard/LiveDashboardWrapper";
import { fetchLiveDashboardMetrics } from "@/lib/actions/dashboardMetrics";

export default async function Page() {
  // Fetch real aggregated production items from backend with RLS inherently applied
  const metricsResult = await fetchLiveDashboardMetrics();

  return (
    <div className="w-full animate-in fade-in-50 duration-500">
      <LiveDashboardWrapper 
        initialMetrics={metricsResult.data || []} 
        initialKpis={metricsResult.kpis || null}
        dbError={metricsResult.error || null} 
      />
    </div>
  );
}
