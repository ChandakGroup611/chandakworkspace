"use client";

/**
 * AMC & Subscriptions dashboard. Registers, record pages, transactions, reports and analytics
 * are their own routes (see components/amc/AMCShell.tsx); this page is the overview only.
 */
import React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AMCOverviewTab } from "@/components/amc/AMCOverviewTab";
import { AMCShell } from "@/components/amc/AMCShell";
import { useAMCData, amcRecordHref } from "@/components/amc/useAMCData";

export default function AMCDashboardPage() {
  const router = useRouter();
  let isLightMode = false;
  try { isLightMode = useTheme().isLight; } catch {}
  const { records, vendors, departments, loading, fetchRecords } = useAMCData();

  return (
    <AMCShell
      title="AMC & Subscriptions"
      description="Software subscriptions, annual maintenance agreements, vendor commitments and renewals."
      counts={{
        "/amc/contracts": records.filter((r) => r.contract_type !== "Subscription").length,
        "/amc/subscriptions": records.filter((r) => r.contract_type === "Subscription").length,
      }}
      actions={
        <AppButton variant="outline" size="sm" onClick={fetchRecords} leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />} className="h-9 text-xs" aria-label="Refresh records">
          Refresh
        </AppButton>
      }
    >
      <AMCOverviewTab
        records={records}
        departments={departments}
        vendors={vendors}
        isLightMode={isLightMode}
        onSelectRecord={(rec: any) => router.push(amcRecordHref(rec))}
        onRefresh={fetchRecords}
        onNavigateToAMC={() => router.push("/amc/contracts")}
        onNavigateToSubscriptions={() => router.push("/amc/subscriptions")}
        onOpenCreateAMC={() => router.push("/amc/contracts/new")}
        onOpenCreateSubscription={() => router.push("/amc/subscriptions/new")}
      />
    </AMCShell>
  );
}
