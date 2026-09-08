"use client";

import React, { useMemo, useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { 
  DollarSign, 
  Layers, 
  Users, 
  CalendarClock, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  PieChart as PieIcon, 
  BarChart3, 
  Sparkles, 
  Building2, 
  RefreshCw,
  Search,
  Filter,
  Star,
  Zap,
  Activity,
  Award
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface AMCExecutiveDashboardProps {
  records: any[];
  departments: any[];
  vendors: any[];
  isLightMode: boolean;
  onSelectRecord: (record: any, tab?: string) => void;
  onRefresh: () => void;
}

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6"  // Teal
];

export function AMCExecutiveDashboard({
  records,
  departments,
  vendors,
  isLightMode,
  onSelectRecord,
  onRefresh
}: AMCExecutiveDashboardProps) {
  const [renewalFilter, setRenewalFilter] = useState<'30' | '60' | '90' | 'all'>('90');
  const [riskFilter, setRiskFilter] = useState<'all' | 'Critical' | 'High' | 'Medium' | 'Low'>('all');

  // Compute overall KPI metrics
  const kpiData = useMemo(() => {
    let totalSpend = 0;
    let activeSpend = 0;
    let pendingApprovalSpend = 0;
    let totalMonthlyAmortization = 0;
    let totalLicensesPurchased = 0;
    let totalLicensesUsed = 0;
    let activeContractsCount = 0;
    let implementationCount = 0;
    let expiring30DaysCount = 0;
    let expiring30DaysSpend = 0;
    let expiring60DaysCount = 0;
    let expiring60DaysSpend = 0;
    let expiring90DaysCount = 0;
    let expiring90DaysSpend = 0;
    let infosecApprovedCount = 0;
    let dpaSignedCount = 0;
    let totalRatingSum = 0;
    let ratedContractsCount = 0;
    let criticalRiskCount = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    const today = new Date();
    const underutilizedSoftware: any[] = [];

    records.forEach((rec) => {
      const cost = parseFloat(rec.cost) || 0;
      totalSpend += cost;

      // Compute monthly amortization
      let monthlyCost = parseFloat(rec.monthly_amortized_cost) || 0;
      if (monthlyCost === 0 && cost > 0 && rec.purchase_date && rec.expiry_date) {
        const start = new Date(rec.purchase_date);
        const end = new Date(rec.expiry_date);
        const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
        monthlyCost = cost / months;
      } else if (monthlyCost === 0 && cost > 0) {
        monthlyCost = cost / 12; // default annual amortization
      }
      totalMonthlyAmortization += monthlyCost;

      if (rec.approval_status === "Active" || !rec.approval_status) {
        activeSpend += cost;
      } else if (rec.approval_status === "Pending Approval") {
        pendingApprovalSpend += cost;
      }

      if (rec.status === "Active") {
        activeContractsCount++;
      }

      // Vendor ratings
      if (rec.vendor_rating) {
        totalRatingSum += parseFloat(rec.vendor_rating);
        ratedContractsCount++;
      }

      // Implementation status tracking
      if (
        rec.implementation_status && 
        rec.implementation_status !== "Live / Operational" && 
        rec.implementation_status !== "Purchased"
      ) {
        implementationCount++;
      }

      // License utilization
      const totalLic = parseInt(rec.total_licenses) || 0;
      const usedLic = parseInt(rec.used_licenses) || 0;
      if (totalLic > 0) {
        totalLicensesPurchased += totalLic;
        totalLicensesUsed += usedLic;
        const utilPercent = (usedLic / totalLic) * 100;
        if (utilPercent < 60) {
          underutilizedSoftware.push({
            ...rec,
            utilizationPercent: utilPercent.toFixed(1),
            unusedLicenses: totalLic - usedLic,
            estimatedWaste: ((totalLic - usedLic) * (cost / totalLic)).toFixed(2)
          });
        }
      }

      // Compliance tracking
      if (rec.infosec_approved_date) infosecApprovedCount++;
      if (rec.dpa_signed) dpaSignedCount++;

      // Expiry & Risk tracking
      let diffDays = 999;
      if (rec.expiry_date) {
        const expDate = new Date(rec.expiry_date);
        diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          expiring30DaysCount++;
          expiring30DaysSpend += cost;
        }
        if (diffDays >= 0 && diffDays <= 60) {
          expiring60DaysCount++;
          expiring60DaysSpend += cost;
        }
        if (diffDays >= 0 && diffDays <= 90) {
          expiring90DaysCount++;
          expiring90DaysSpend += cost;
        }
      }

      // Calculate dynamic risk level
      if (diffDays < 0 || rec.status === 'Expired') {
        criticalRiskCount++;
      } else if (diffDays <= 30 || rec.approval_status === 'Pending Approval') {
        highRiskCount++;
      } else if (diffDays <= 90) {
        mediumRiskCount++;
      } else {
        lowRiskCount++;
      }
    });

    const overallLicenseUtilization = totalLicensesPurchased > 0
      ? ((totalLicensesUsed / totalLicensesPurchased) * 100).toFixed(1)
      : "100.0";

    const averageVendorRating = ratedContractsCount > 0
      ? (totalRatingSum / ratedContractsCount).toFixed(1)
      : "4.8";

    return {
      totalSpend,
      activeSpend,
      pendingApprovalSpend,
      totalMonthlyAmortization,
      totalContracts: records.length,
      activeContractsCount,
      totalLicensesPurchased,
      totalLicensesUsed,
      overallLicenseUtilization,
      underutilizedSoftware,
      implementationCount,
      expiring30DaysCount,
      expiring30DaysSpend,
      expiring60DaysCount,
      expiring60DaysSpend,
      expiring90DaysCount,
      expiring90DaysSpend,
      infosecApprovedCount,
      dpaSignedCount,
      infosecPercent: records.length > 0 ? ((infosecApprovedCount / records.length) * 100).toFixed(0) : "0",
      dpaPercent: records.length > 0 ? ((dpaSignedCount / records.length) * 100).toFixed(0) : "0",
      averageVendorRating,
      criticalRiskCount,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount
    };
  }, [records]);

  // Department Spend Analytics
  const departmentSpendData = useMemo(() => {
    const deptMap: Record<string, { name: string; value: number; count: number }> = {};

    records.forEach((rec) => {
      const deptName = rec.departments?.name || "General / IT";
      const cost = parseFloat(rec.cost) || 0;
      if (!deptMap[deptName]) {
        deptMap[deptName] = { name: deptName, value: 0, count: 0 };
      }
      deptMap[deptName].value += cost;
      deptMap[deptName].count += 1;
    });

    return Object.values(deptMap).sort((a, b) => b.value - a.value);
  }, [records]);

  // Top Vendors by Spend
  const vendorSpendData = useMemo(() => {
    const venMap: Record<string, { name: string; totalCost: number; contracts: number; rating: number }> = {};

    records.forEach((rec) => {
      const venName = rec.vendor_master?.name || "Direct Vendor";
      const cost = parseFloat(rec.cost) || 0;
      const rating = parseFloat(rec.vendor_rating) || 5.0;
      if (!venMap[venName]) {
        venMap[venName] = { name: venName, totalCost: 0, contracts: 0, rating };
      }
      venMap[venName].totalCost += cost;
      venMap[venName].contracts += 1;
    });

    return Object.values(venMap)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 6);
  }, [records]);

  // Upcoming Renewals List (Sorted by nearest expiry)
  const upcomingRenewalsList = useMemo(() => {
    const today = new Date();
    const list: any[] = [];

    records.forEach((rec) => {
      if (!rec.expiry_date) return;
      const expDate = new Date(rec.expiry_date);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let matchFilter = true;
      if (renewalFilter === '30') matchFilter = diffDays >= 0 && diffDays <= 30;
      else if (renewalFilter === '60') matchFilter = diffDays >= 0 && diffDays <= 60;
      else if (renewalFilter === '90') matchFilter = diffDays >= 0 && diffDays <= 90;
      else matchFilter = diffDays >= 0;

      // Risk Filter
      let calculatedRisk = 'Low';
      if (diffDays < 0 || rec.status === 'Expired') calculatedRisk = 'Critical';
      else if (diffDays <= 30) calculatedRisk = 'High';
      else if (diffDays <= 90) calculatedRisk = 'Medium';

      if (riskFilter !== 'all' && calculatedRisk !== riskFilter) {
        matchFilter = false;
      }

      if (matchFilter) {
        list.push({
          ...rec,
          daysRemaining: diffDays,
          calculatedRisk,
          formattedExpiry: expDate.toLocaleDateString()
        });
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [records, renewalFilter, riskFilter]);

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Welcome & Quick Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">AMC & Subscription Executive Cockpit</h2>
              <p className="text-xs text-muted">
                Portfolio spend, monthly accrual run-rate, license utilization, risk scores, and vendor performance.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AppButton 
            variant="outline" 
            size="sm" 
            onClick={onRefresh} 
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            className="h-9 text-xs font-semibold"
          >
            Refresh Metrics
          </AppButton>
        </div>
      </div>

      {/* 6-Column Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Total Annual Spend */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Contract Value</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              ₹ {formatAmount(kpiData.totalSpend)}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>Active: ₹ {formatAmount(kpiData.activeSpend)}</span>
            <span className="font-semibold text-theme-icon">{kpiData.totalContracts} Total</span>
          </div>
        </AppCard>

        {/* KPI 2: Monthly Amortization Run-Rate */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-emerald-500/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Monthly Run-Rate</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-500 font-mono">
              ₹ {formatAmount(kpiData.totalMonthlyAmortization)}<span className="text-xs font-normal text-muted">/mo</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>Straight-line accrual</span>
            <span className="font-semibold text-emerald-500">Live Burn</span>
          </div>
        </AppCard>

        {/* KPI 3: Active Contracts & Status */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Active Subscriptions</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {kpiData.activeContractsCount}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>In Onboarding: {kpiData.implementationCount}</span>
            <span className="font-semibold text-purple-400">Operational</span>
          </div>
        </AppCard>

        {/* KPI 4: Licenses & Utilization */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">License Utilization</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {kpiData.overallLicenseUtilization}%
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>{kpiData.totalLicensesUsed} / {kpiData.totalLicensesPurchased} Seats</span>
            <span className="font-semibold text-amber-500">{kpiData.underutilizedSoftware.length} Idle</span>
          </div>
        </AppCard>

        {/* KPI 5: Near-Term Renewals */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-rose-500/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Due in 30 Days</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <CalendarClock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-500 font-mono">
              {kpiData.expiring30DaysCount}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>At Risk: ₹ {formatAmount(kpiData.expiring30DaysSpend)}</span>
            <span className="font-semibold text-rose-400">Action Req.</span>
          </div>
        </AppCard>

        {/* KPI 6: Vendor Scorecard */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-amber-400/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Avg Vendor Rating</span>
              <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                <Star className="h-4 w-4 fill-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono flex items-center gap-1.5">
              <span>{kpiData.averageVendorRating}</span>
              <span className="text-xs text-muted font-normal">/ 5.0</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>InfoSec: {kpiData.infosecPercent}%</span>
            <span className="font-semibold text-emerald-500">DPA: {kpiData.dpaPercent}%</span>
          </div>
        </AppCard>
      </div>

      {/* Risk Alert Ribbons (If any critical or high-risk contracts exist) */}
      {(kpiData.criticalRiskCount > 0 || kpiData.highRiskCount > 0) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Attention Needed on Contract Portfolio</h4>
              <p className="text-xs text-muted">
                {kpiData.criticalRiskCount > 0 && <span className="font-bold text-rose-400">{kpiData.criticalRiskCount} Expired/Overdue</span>}
                {kpiData.criticalRiskCount > 0 && kpiData.highRiskCount > 0 && <span> and </span>}
                {kpiData.highRiskCount > 0 && <span className="font-bold text-amber-400">{kpiData.highRiskCount} Expiring in &lt;30 days</span>}
                {' '}requiring renewal approvals or PO release.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppButton
              variant="outline"
              size="sm"
              onClick={() => { setRenewalFilter('30'); setRiskFilter('all'); }}
              className="h-8 text-xs font-bold border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            >
              Filter 30-Day Expiries →
            </AppButton>
          </div>
        </div>
      )}

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Spend Distribution by Department */}
        <AppCard className="p-6 border border-border bg-surface space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-theme-btn-primary/10 text-theme-icon">
                <PieIcon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Spend Allocation by Cost Center / Dept</h3>
            </div>
            <span className="text-xs text-muted font-medium font-mono">{departmentSpendData.length} Departments</span>
          </div>

          <div className="h-[260px] w-full">
            {departmentSpendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted text-xs">No department spend data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentSpendData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {departmentSpendData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`₹ ${formatAmount(Number(val))}`, 'Annual Spend']}
                    contentStyle={{ backgroundColor: isLightMode ? '#ffffff' : '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </AppCard>

        {/* Chart 2: Top Vendors by Portfolio Spend */}
        <AppCard className="p-6 border border-border bg-surface space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Building2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Top Software Vendors by Exposure</h3>
            </div>
            <span className="text-xs text-muted font-medium font-mono">Top {vendorSpendData.length} Partners</span>
          </div>

          <div className="h-[260px] w-full">
            {vendorSpendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted text-xs">No vendor data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorSpendData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    angle={-20} 
                    textAnchor="end" 
                    interval={0} 
                    tick={{ fontSize: 10, fill: isLightMode ? '#475569' : '#94a3b8' }} 
                  />
                  <YAxis 
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                    tick={{ fontSize: 10, fill: isLightMode ? '#475569' : '#94a3b8' }}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`₹ ${formatAmount(Number(val))}`, 'Contract Volume']}
                    contentStyle={{ backgroundColor: isLightMode ? '#ffffff' : '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}
                  />
                  <Bar dataKey="totalCost" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AppCard>
      </div>

      {/* Upcoming Renewals & Risk Queue Table */}
      <AppCard className="p-6 border border-border bg-surface space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Upcoming Renewal Forecast & Action Queue</h3>
              <p className="text-xs text-muted">Contracts nearing expiry organized by timeline and risk classification.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeline Filter Pills */}
            <div className="flex rounded-xl border border-border p-0.5 bg-elevated/80 text-xs">
              {(['30', '60', '90', 'all'] as const).map((days) => (
                <AppButton
                  key={days}
                  type="button"
                  variant={renewalFilter === days ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setRenewalFilter(days)}
                  className="h-7 px-3 text-xs font-semibold rounded-lg"
                >
                  {days === 'all' ? 'All' : `${days} Days`}
                </AppButton>
              ))}
            </div>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="h-8 px-2.5 rounded-xl border border-border bg-surface text-xs font-semibold outline-none"
            >
              <option value="all">All Risk Levels</option>
              <option value="Critical">Critical (Expired)</option>
              <option value="High">High (&lt; 30d)</option>
              <option value="Medium">Medium (30-90d)</option>
              <option value="Low">Low (&gt; 90d)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <AppTable className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <AppTableHeader className="bg-surface">
              <AppTableRow>
                <AppTableHead className="p-3 font-semibold text-muted">Software / Solution</AppTableHead>
                <AppTableHead className="p-3 font-semibold text-muted">Vendor</AppTableHead>
                <AppTableHead className="p-3 font-semibold text-muted">Contract Type</AppTableHead>
                <AppTableHead className="p-3 font-semibold text-muted">Annual Spend</AppTableHead>
                <AppTableHead className="p-3 font-semibold text-muted">Expiry Date</AppTableHead>
                <AppTableHead className="p-3 font-semibold text-muted">Days Left</AppTableHead>
                <AppTableHead className="p-3 font-semibold text-muted">Risk Level</AppTableHead>
                <AppTableHead className="p-3 font-semibold text-muted text-right">Actions</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {upcomingRenewalsList.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={8} className="p-8 text-center text-muted italic">
                    No subscriptions match the selected renewal filter criteria.
                  </AppTableCell>
                </AppTableRow>
              ) : (
                upcomingRenewalsList.map((rec) => (
                  <AppTableRow key={rec.id} className="border-b border-border/50 hover:bg-elevated/60 transition-colors">
                    <AppTableCell className="p-3">
                      <div className="font-semibold text-foreground">{rec.software_name}</div>
                      {rec.solution_name && <div className="text-[11px] text-muted">{rec.solution_name}</div>}
                    </AppTableCell>
                    <AppTableCell className="p-3 text-muted">
                      {rec.vendor_master?.name || '-'}
                    </AppTableCell>
                    <AppTableCell className="p-3">
                      <AppBadge variant={rec.contract_type === 'AMC' ? 'accent' : rec.contract_type === 'Subscription' ? 'warning' : 'neutral'}>
                        {rec.contract_type}
                      </AppBadge>
                    </AppTableCell>
                    <AppTableCell className="p-3 font-mono font-bold text-foreground">
                      ₹ {rec.cost ? formatAmount(parseFloat(rec.cost)) : '0.00'}
                    </AppTableCell>
                    <AppTableCell className="p-3 text-muted">
                      {rec.formattedExpiry}
                    </AppTableCell>
                    <AppTableCell className="p-3 font-semibold font-mono">
                      <span className={rec.daysRemaining <= 30 ? 'text-rose-500 font-bold' : rec.daysRemaining <= 60 ? 'text-amber-500' : 'text-foreground'}>
                        {rec.daysRemaining < 0 ? `${Math.abs(rec.daysRemaining)}d Overdue` : `${rec.daysRemaining} days`}
                      </span>
                    </AppTableCell>
                    <AppTableCell className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        rec.calculatedRisk === 'Critical' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                        rec.calculatedRisk === 'High' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                        rec.calculatedRisk === 'Medium' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {rec.calculatedRisk}
                      </span>
                    </AppTableCell>
                    <AppTableCell className="p-3 text-right space-x-2">
                      <AppButton 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onSelectRecord(rec, 'Renewals')}
                        className="h-7 text-xs font-semibold text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg"
                      >
                        Renew Contract →
                      </AppButton>
                    </AppTableCell>
                  </AppTableRow>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </AppCard>
    </div>
  );
}
