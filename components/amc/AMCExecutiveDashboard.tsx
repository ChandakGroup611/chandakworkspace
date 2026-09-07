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
  Filter
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
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Compute overall KPI metrics
  const kpiData = useMemo(() => {
    let totalSpend = 0;
    let activeSpend = 0;
    let pendingApprovalSpend = 0;
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

    const today = new Date();
    const underutilizedSoftware: any[] = [];

    records.forEach((rec) => {
      const cost = parseFloat(rec.cost) || 0;
      totalSpend += cost;

      if (rec.approval_status === "Active" || !rec.approval_status) {
        activeSpend += cost;
      } else if (rec.approval_status === "Pending Approval") {
        pendingApprovalSpend += cost;
      }

      if (rec.status === "Active") {
        activeContractsCount++;
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

      // Expiry tracking
      if (rec.expiry_date) {
        const expDate = new Date(rec.expiry_date);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
    });

    const overallLicenseUtilization = totalLicensesPurchased > 0
      ? ((totalLicensesUsed / totalLicensesPurchased) * 100).toFixed(1)
      : "100.0";

    return {
      totalSpend,
      activeSpend,
      pendingApprovalSpend,
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
      dpaPercent: records.length > 0 ? ((dpaSignedCount / records.length) * 100).toFixed(0) : "0"
    };
  }, [records]);

  // Department Spend Analytics
  const departmentSpendData = useMemo(() => {
    const deptMap: Record<string, { name: string; value: number; count: number }> = {};

    records.forEach((rec) => {
      const deptName = rec.departments?.name || "Unassigned / General";
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
    const venMap: Record<string, { name: string; totalCost: number; contracts: number }> = {};

    records.forEach((rec) => {
      const venName = rec.vendor_master?.name || "Other Vendors";
      const cost = parseFloat(rec.cost) || 0;
      if (!venMap[venName]) {
        venMap[venName] = { name: venName, totalCost: 0, contracts: 0 };
      }
      venMap[venName].totalCost += cost;
      venMap[venName].contracts += 1;
    });

    return Object.values(venMap)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 6);
  }, [records]);

  // Contract Type Breakdown
  const contractTypeData = useMemo(() => {
    const typeMap: Record<string, number> = {};
    records.forEach((rec) => {
      const t = rec.contract_type || "AMC";
      typeMap[t] = (typeMap[t] || 0) + (parseFloat(rec.cost) || 0);
    });
    return Object.entries(typeMap).map(([name, value]) => ({ name, value }));
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

      if (matchFilter) {
        list.push({
          ...rec,
          daysRemaining: diffDays,
          formattedExpiry: expDate.toLocaleDateString()
        });
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [records, renewalFilter]);

  // Vendor Renewal Comparison & Contract History (analyzing recurring vs renewed contracts)
  const renewalComparisonData = useMemo(() => {
    const renewedRecords: any[] = [];

    records.forEach((rec) => {
      const lineItems = Array.isArray(rec.solution_line_items) ? rec.solution_line_items : [];
      let currentCost = parseFloat(rec.cost) || 0;
      if (lineItems.length > 0) {
        const sum = lineItems.reduce((s: number, i: any) => s + (parseFloat(i.netAmount) || 0), 0);
        if (sum > 0) currentCost = sum;
      }
      
      // Look for renewal cadence or recurring AMC/Subscription contracts
      if (rec.status === 'Renewed' || rec.renewal_period_type || rec.contract_type === 'AMC' || rec.contract_type === 'Subscription' || lineItems.some((i: any) => i.renewalPeriodType)) {
        renewedRecords.push({
          id: rec.id,
          rawRecord: rec,
          softwareName: rec.software_name,
          vendorName: rec.vendor_master?.name || "Direct Vendor",
          contractType: rec.contract_type || "AMC",
          purchaseDate: rec.purchase_date ? new Date(rec.purchase_date).toLocaleDateString() : "N/A",
          renewalPeriod: rec.renewal_period_type || "Yearly",
          currentCost: currentCost,
          currency: rec.currency || "INR",
          expiryDate: rec.expiry_date ? new Date(rec.expiry_date).toLocaleDateString() : "N/A",
          owner: rec.user_master?.full_name || "Unassigned"
        });
      }
    });

    return renewedRecords;
  }, [records]);

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
            <div className="p-2 rounded-xl bg-theme-btn-primary/10 text-theme-icon">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">AMC & Subscription Executive Overview</h2>
          </div>
          <p className="text-xs text-muted">
            Portfolio spend analytics, license utilization health, renewal forecasting, and vendor exposure.
          </p>
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

      {/* 5-Column Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Annual Spend */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Total AMC Spend</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              ₹ {formatAmount(kpiData.totalSpend)}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>Active: ₹ {formatAmount(kpiData.activeSpend)}</span>
            <span className="font-semibold text-theme-icon">{kpiData.totalContracts} Contracts</span>
          </div>
        </AppCard>

        {/* KPI 2: Active Contracts & Status */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Active Portfolio</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {kpiData.activeContractsCount} <span className="text-xs font-normal text-muted">/ {kpiData.totalContracts}</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>{kpiData.totalContracts > 0 ? ((kpiData.activeContractsCount / kpiData.totalContracts) * 100).toFixed(0) : 0}% Active & Operational</span>
          </div>
        </AppCard>

        {/* KPI 3: License Utilization & Waste Alert */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">License Utilization</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {kpiData.overallLicenseUtilization}%
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>{kpiData.totalLicensesUsed} / {kpiData.totalLicensesPurchased} Seats</span>
            {kpiData.underutilizedSoftware.length > 0 && (
              <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px]">
                {kpiData.underutilizedSoftware.length} Underused
              </span>
            )}
          </div>
        </AppCard>

        {/* KPI 4: Renewals in Next 90 Days */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Renewals (90 Days)</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <CalendarClock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {kpiData.expiring90DaysCount} <span className="text-xs font-normal text-muted">Contracts</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-amber-300 font-mono flex items-center justify-between">
            <span>Capital Due:</span>
            <span className="font-bold">₹ {formatAmount(kpiData.expiring90DaysSpend)}</span>
          </div>
        </AppCard>

        {/* KPI 5: Active Onboarding Pipelines */}
        <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-theme-btn-primary/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Onboarding Active</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground">
              {kpiData.implementationCount} <span className="text-xs font-normal text-muted">In-Flight</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border/50 text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Discovery & UAT Tracking</span>
          </div>
        </AppCard>
      </div>

      {/* Main Grid: Charts & Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Spend Allocation */}
        <AppCard className="p-6 border border-border bg-surface lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-theme-icon" />
                Department Spend & Contract Allocation
              </h3>
              <p className="text-xs text-muted">Software expenditure distributed across organizational business units.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Donut Chart */}
            <div className="h-64 w-full flex items-center justify-center">
              {departmentSpendData.length === 0 ? (
                <div className="text-xs text-muted">No department data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentSpendData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {departmentSpendData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`₹ ${formatAmount(Number(val))}`, 'Annual Spend']}
                      contentStyle={{ backgroundColor: isLightMode ? '#ffffff' : '#18181b', borderRadius: '12px', border: '1px solid #3f3f46' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Department Breakdown Table */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {departmentSpendData.map((dept, idx) => {
                const percent = kpiData.totalSpend > 0 ? ((dept.value / kpiData.totalSpend) * 100).toFixed(1) : "0";
                return (
                  <div key={idx} className="p-3 rounded-xl border bg-elevated/40 border-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="font-semibold text-foreground truncate">{dept.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-foreground font-mono">₹ {formatAmount(dept.value)}</div>
                      <div className="text-[10px] text-muted">{percent}% ({dept.count} contracts)</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AppCard>

        {/* Top Vendors by Contract Value */}
        <AppCard className="p-6 border border-border bg-surface space-y-6">
          <div className="pb-4 border-b border-border/60">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-theme-icon" />
              Top Vendors by Value
            </h3>
            <p className="text-xs text-muted mt-1">Largest vendor exposure across all active agreements.</p>
          </div>

          <div className="space-y-4">
            {vendorSpendData.map((ven, vIdx) => {
              const share = kpiData.totalSpend > 0 ? (ven.totalCost / kpiData.totalSpend) * 100 : 0;
              return (
                <div key={vIdx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[180px]">{ven.name}</span>
                    <span className="font-bold text-foreground font-mono">₹ {formatAmount(ven.totalCost)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-elevated overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${share}%`, 
                        backgroundColor: COLORS[vIdx % COLORS.length] 
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>{ven.contracts} contract(s)</span>
                    <span>{share.toFixed(1)}% of total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </AppCard>
      </div>

      {/* Row 3: Upcoming Expiry Action Queue & Renewal Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring Contracts Radar Queue */}
        <AppCard className="p-6 border border-border bg-surface lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" />
                Upcoming Renewals & Expiry Radar
              </h3>
              <p className="text-xs text-muted mt-0.5">Contracts nearing end of tenure requiring renewal action.</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-elevated p-1 rounded-xl border border-border text-xs">
              {(['30', '60', '90', 'all'] as const).map((opt) => (
                <AppButton
                  key={opt}
                  type="button"
                  variant={renewalFilter === opt ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setRenewalFilter(opt)}
                  className="h-7 px-3 text-xs font-semibold rounded-lg"
                >
                  {opt === 'all' ? 'All Expiring' : `≤ ${opt} Days`}
                </AppButton>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {upcomingRenewalsList.length === 0 ? (
              <div className="py-12 text-center text-muted border border-dashed border-border rounded-xl">
                No contracts expiring within the selected timeframe ({renewalFilter === 'all' ? 'all' : `≤ ${renewalFilter} days`}).
              </div>
            ) : (
              upcomingRenewalsList.map((item) => {
                const isUrgent = item.daysRemaining <= 15;
                const isWarn = item.daysRemaining <= 30;

                return (
                  <div 
                    key={item.id} 
                    className="p-4 rounded-xl border bg-elevated/30 border-border/60 hover:border-theme-btn-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{item.software_name}</span>
                        <AppBadge variant={isUrgent ? 'danger' : isWarn ? 'warning' : 'neutral'}>
                          {item.daysRemaining} days left
                        </AppBadge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>Vendor: <strong className="text-foreground">{item.vendor_master?.name || 'N/A'}</strong></span>
                        <span>•</span>
                        <span>Expiry: <strong className="text-foreground">{item.formattedExpiry}</strong></span>
                        <span>•</span>
                        <span>Owner: <strong className="text-foreground">{item.user_master?.full_name || 'Unassigned'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-muted">Current Value</div>
                        <div className="font-bold font-mono text-sm text-foreground">₹ {formatAmount(parseFloat(item.cost) || 0)}</div>
                      </div>
                      <AppButton 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onSelectRecord(item)}
                        rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        className="h-8 text-xs font-semibold"
                      >
                        Renew
                      </AppButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </AppCard>

        {/* Governance & License Health Summary Card */}
        <AppCard className="p-6 border border-border bg-surface space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-4 border-b border-border/60">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-theme-icon" />
                Governance & Compliance Health
              </h3>
              <p className="text-xs text-muted mt-1">Audit readiness, security approvals, and contract terms.</p>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border bg-elevated/40 border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>InfoSec Approved Contracts</span>
                  <span className="text-emerald-400">{kpiData.infosecPercent}%</span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpiData.infosecPercent}%` }}></div>
                </div>
                <div className="text-[10px] text-muted">{kpiData.infosecApprovedCount} of {kpiData.totalContracts} vetted by Security</div>
              </div>

              <div className="p-3.5 rounded-xl border bg-elevated/40 border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Data Processing Agreements (DPA)</span>
                  <span className="text-blue-400">{kpiData.dpaPercent}%</span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${kpiData.dpaPercent}%` }}></div>
                </div>
                <div className="text-[10px] text-muted">{kpiData.dpaSignedCount} of {kpiData.totalContracts} with signed DPAs</div>
              </div>
            </div>
          </div>

          {/* License Optimization Callout */}
          {kpiData.underutilizedSoftware.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>License Optimization Opportunity</span>
              </div>
              <p className="text-[11px] text-amber-200 leading-relaxed">
                Found <strong>{kpiData.underutilizedSoftware.length} software</strong> with seat utilization below 60%. Reviewing seat allocations before upcoming renewals could save license capital.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="text-xs text-emerald-300">All purchased software licenses are healthy & utilized above 60%.</div>
            </div>
          )}
        </AppCard>
      </div>

      {/* Row 4: Vendor Renewal Comparison & Contract History Table */}
      <AppCard className="p-6 border border-border bg-surface space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-theme-icon" />
              Vendor Renewal Comparison & Contract History Matrix
            </h3>
            <p className="text-xs text-muted mt-0.5">Track year-over-year pricing, renewal cadence, and contract commitments across software vendors.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <AppTable className="w-full text-left text-xs whitespace-nowrap">
            <AppTableHeader>
              <AppTableRow className="border-b border-border text-muted font-bold uppercase tracking-wider">
                <AppTableHead className="pb-3 pr-4">Software Name</AppTableHead>
                <AppTableHead className="pb-3 px-4">Vendor</AppTableHead>
                <AppTableHead className="pb-3 px-4">Contract Type</AppTableHead>
                <AppTableHead className="pb-3 px-4">Acquired Date</AppTableHead>
                <AppTableHead className="pb-3 px-4">Renewal Cadence</AppTableHead>
                <AppTableHead className="pb-3 px-4">Expiry Date</AppTableHead>
                <AppTableHead className="pb-3 px-4">Contract Cost</AppTableHead>
                <AppTableHead className="pb-3 px-4">Owner</AppTableHead>
                <AppTableHead className="pb-3 pl-4 text-right">Spend History</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody className="divide-y divide-border/60">
              {renewalComparisonData.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={9} className="py-8 text-center text-muted">
                    No renewal or recurring contracts logged yet.
                  </AppTableCell>
                </AppTableRow>
              ) : (
                renewalComparisonData.map((row) => (
                  <AppTableRow key={row.id} className="hover:bg-elevated/40 transition-colors">
                    <AppTableCell className="py-3.5 pr-4 font-bold text-foreground">{row.softwareName}</AppTableCell>
                    <AppTableCell className="py-3.5 px-4 text-muted">{row.vendorName}</AppTableCell>
                    <AppTableCell className="py-3.5 px-4">
                      <AppBadge variant={row.contractType === 'AMC' ? 'accent' : 'warning'}>
                        {row.contractType}
                      </AppBadge>
                    </AppTableCell>
                    <AppTableCell className="py-3.5 px-4 text-muted font-mono">{row.purchaseDate}</AppTableCell>
                    <AppTableCell className="py-3.5 px-4 font-medium text-foreground">{row.renewalPeriod}</AppTableCell>
                    <AppTableCell className="py-3.5 px-4 text-muted">{row.expiryDate}</AppTableCell>
                    <AppTableCell className="py-3.5 px-4 font-bold font-mono text-foreground">₹ {formatAmount(row.currentCost)}</AppTableCell>
                    <AppTableCell className="py-3.5 px-4 text-muted">{row.owner}</AppTableCell>
                    <AppTableCell className="py-3.5 pl-4 text-right">
                      <AppButton 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onSelectRecord(row.rawRecord, 'Spend History (TCO)')}
                        className="text-theme-icon hover:underline text-xs font-semibold"
                        rightIcon={<ArrowRight className="h-3 w-3" />}
                      >
                        TCO Timeline
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
