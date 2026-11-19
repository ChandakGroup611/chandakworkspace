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
import ChandakLoader from "@/components/ui/ChandakLoader";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

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
      <div className="h-screen flex flex-col items-center justify-center bg-surface text-foreground">
        <ChandakLoader
          size="lg"
          title="Verifying Permissions…"
          subtitle="Securing ticket metrics gateway"
        />
      </div>
    );
  }

  if (!hasPermission("TICKETS_VIEW")) {
    return (
      <AccessRestricted
        requiredRole="Ticket Agent"
        requiredPermission="TICKETS_VIEW"
        moduleName="Ticket Operations"
      />
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Ticketing operations dashboard"
        icon={<BarChart2 className="h-6 w-6" />}
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={() => router.push("/tickets")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to tickets
            </AppButton>
            <AppButton 
              variant="outline" 
              size="sm" 
              onClick={() => fetchMetrics()}
              leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
            >
              Refresh
            </AppButton>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {loading && !metrics ? (
          <div className="flex items-center justify-center h-64">
            <ChandakLoader size="md" title="Aggregating metrics…" />
          </div>
        ) : (
          <TicketsDashboard metrics={metrics} />
        )}
      </div>
    </PageContainer>
  );
}
