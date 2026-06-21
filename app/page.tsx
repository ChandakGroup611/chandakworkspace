import React from "react";
import LiveDashboardWrapper from "@/components/dashboard/LiveDashboardWrapper";
import { fetchLiveDashboardMetrics } from "@/lib/actions/dashboardMetrics";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function Page() {
  // Fetch real aggregated production items from backend with RLS inherently applied
  const metricsResult = await fetchLiveDashboardMetrics();

  return (
    <PageContainer strict={false}>
      {/* Removed redundant PageHeader to reduce blank space */}
      <div className="flex-1 min-h-0 min-w-0 animate-in fade-in-50 duration-500 flex flex-col">
        <LiveDashboardWrapper 
          initialMetrics={metricsResult.data || []} 
          initialKpis={metricsResult.kpis || null}
          dbError={metricsResult.error || null} 
        />
      </div>
    </PageContainer>
  );
}
