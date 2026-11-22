"use client";

import React, { useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { AMCExecutiveDashboard } from "@/components/amc/AMCExecutiveDashboard";
import { 
  ShieldCheck, 
  Zap, 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  Plus, 
  ArrowRight,
  TrendingUp,
  DollarSign
} from "lucide-react";

interface AMCOverviewTabProps {
  records: any[];
  departments: any[];
  vendors: any[];
  isLightMode: boolean;
  onSelectRecord: (record: any) => void;
  onRefresh: () => void;
  onNavigateToAMC: () => void;
  onNavigateToSubscriptions: () => void;
  onOpenCreateAMC: () => void;
  onOpenCreateSubscription: () => void;
}

export function AMCOverviewTab({
  records,
  departments,
  vendors,
  isLightMode,
  onSelectRecord,
  onRefresh,
  onNavigateToAMC,
  onNavigateToSubscriptions,
  onOpenCreateAMC,
  onOpenCreateSubscription
}: AMCOverviewTabProps) {
  const amcRecords = useMemo(() => records.filter(r => r.contract_type !== "Subscription"), [records]);
  const subRecords = useMemo(() => records.filter(r => r.contract_type === "Subscription"), [records]);

  const metrics = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);

    const totalPortfolio = records.reduce((sum, r) => sum + (Number(r.total_cost || r.cost || 0)), 0);
    const amcTotal = amcRecords.reduce((sum, r) => sum + (Number(r.total_cost || r.cost || 0)), 0);
    const subTotal = subRecords.reduce((sum, r) => sum + (Number(r.total_cost || r.cost || 0)), 0);

    const expiring30 = records.filter(r => {
      if (!r.expiry_date) return false;
      const d = new Date(r.expiry_date);
      return d >= now && d <= in30;
    }).length;

    const highRisk = records.filter(r => r.risk_level === "High" || r.risk_level === "Critical").length;

    return {
      totalPortfolio,
      amcTotal,
      subTotal,
      expiring30,
      highRisk
    };
  }, [records, amcRecords, subRecords]);

  return (
    <div className="space-y-6">
      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Commitments */}
        <AppCard className="p-4 border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Total Annual Spend</span>
            <div className="p-1.5 rounded-md bg-accent-soft text-accent-soft-text">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              INR {metrics.totalPortfolio.toLocaleString()}
            </span>
            <p className="text-[11.5px] text-muted mt-1">
              Across {records.length} active software contracts
            </p>
          </div>
        </AppCard>

        {/* AMC Split */}
        <AppCard 
          className="p-4 border-border shadow-xs flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={onNavigateToAMC}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">AMC Contracts</span>
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {amcRecords.length}
              </span>
              <p className="text-[11.5px] text-muted mt-1">
                INR {metrics.amcTotal.toLocaleString()} maintenance
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
          </div>
        </AppCard>

        {/* Subscriptions Split */}
        <AppCard 
          className="p-4 border-border shadow-xs flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={onNavigateToSubscriptions}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">SaaS Subscriptions</span>
            <div className="p-1.5 rounded-md bg-warning-soft text-warning-text">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {subRecords.length}
              </span>
              <p className="text-[11.5px] text-muted mt-1">
                INR {metrics.subTotal.toLocaleString()} recurring seats
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
          </div>
        </AppCard>

        {/* Expiring Soon */}
        <AppCard className="p-4 border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Expiring in 30 Days</span>
            <div className={`p-1.5 rounded-md ${metrics.expiring30 > 0 ? 'bg-danger-soft text-danger-text' : 'bg-sunken text-muted'}`}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight tabular-nums ${metrics.expiring30 > 0 ? 'text-danger-text' : 'text-foreground'}`}>
              {metrics.expiring30}
            </span>
            <p className="text-[11.5px] text-muted mt-1">
              {metrics.highRisk} contracts flagged high risk
            </p>
          </div>
        </AppCard>
      </div>

      {/* Main Executive Analytics View */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <AMCExecutiveDashboard
          records={records}
          departments={departments}
          vendors={vendors}
          isLightMode={isLightMode}
          onSelectRecord={onSelectRecord}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}
