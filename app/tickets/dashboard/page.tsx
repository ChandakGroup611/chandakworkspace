"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/AppButton";
import { ArrowLeft, Database, RefreshCw, BarChart2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchTicketMetrics } from "@/lib/actions/tickets";
import { TicketsDashboard } from "@/components/tickets/TicketsDashboard";

export default function TicketDashboardPage() {
  const router = useRouter();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await fetchTicketMetrics();
      if (data) {
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to load metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (permissionsLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-surface text-foreground">
        <div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasPermission("TICKETS_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-surface text-foreground">
        <h2 className="text-xl font-bold text-red-500">Access Denied</h2>
        <p className="text-xs text-muted-foreground">You do not have capabilities to view Operations Tickets.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Ticketing Operations Dashboard"
        icon={<BarChart2 className="h-6 w-6" />}
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={() => router.push("/tickets")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Tickets
            </AppButton>
            <AppButton 
              variant="outline" 
              size="sm" 
              onClick={() => fetchMetrics()}
              leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
            >
              Sync Data
            </AppButton>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {loading && !metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <TicketsDashboard metrics={metrics} />
        )}
      </div>
    </PageContainer>
  );
}
