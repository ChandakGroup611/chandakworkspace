"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { 
  BarChart2, 
  DollarSign, 
  Calendar, 
  Users, 
  ArrowLeft,
  AlertCircle,
  Lock,
  Activity,
  Star,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";

export default function AMCAnalyticsPage() {
  let isLightMode = false;
  try {
    const { theme } = useTheme() as any;
    isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
  } catch (e) {}
  const supabase = createClient();
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  if (!permsLoading && !isSuperAdmin && !hasPermission("AMC_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-muted">
        <Lock className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm mt-2 text-muted">You do not have permission to view AMC Analytics.</p>
        <Link href="/" className="mt-4">
          <AppButton variant="primary" size="sm">Return to Dashboard</AppButton>
        </Link>
      </div>
    );
  }

  const fetchData = async () => {
    try {
      const { data: amcData, error } = await supabase
        .from('software_amc')
        .select(`
          *,
          departments:cost_center_id(name),
          vendor_master(name, code),
          user_master(full_name)
        `)
        .eq('status', 'Active')
        .eq('is_deleted', false);

      if (error) throw error;
      setRecords(amcData || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const analyticsData = useMemo(() => {
    let totalSpend = 0;
    let totalLicenses = 0;
    let usedLicenses = 0;
    let monthlyBurn = 0;
    let totalRatingSum = 0;
    let ratedCount = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    const deptSpendMap: Record<string, number> = {};
    const vendorMap: Record<string, { name: string; totalSpend: number; count: number; rating: number }> = {};
    const renewals: any[] = [];
    const now = new Date();
    const in60Days = new Date();
    in60Days.setDate(now.getDate() + 60);

    records.forEach(rec => {
      const cost = parseFloat(rec.cost) || 0;
      totalSpend += cost;
      totalLicenses += (rec.total_licenses || 0);
      usedLicenses += (rec.used_licenses || 0);

      // Monthly Burn
      let monthly = parseFloat(rec.monthly_amortized_cost) || 0;
      if (monthly === 0 && cost > 0 && rec.purchase_date && rec.expiry_date) {
        const start = new Date(rec.purchase_date);
        const end = new Date(rec.expiry_date);
        const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
        monthly = cost / months;
      } else if (monthly === 0 && cost > 0) {
        monthly = cost / 12;
      }
      monthlyBurn += monthly;

      // Ratings
      if (rec.vendor_rating) {
        totalRatingSum += parseFloat(rec.vendor_rating);
        ratedCount++;
      }

      // Department map
      const deptName = rec.departments?.name || 'General / IT';
      deptSpendMap[deptName] = (deptSpendMap[deptName] || 0) + cost;

      // Vendor map
      const vName = rec.vendor_master?.name || 'Direct Partner';
      if (!vendorMap[vName]) {
        vendorMap[vName] = { name: vName, totalSpend: 0, count: 0, rating: parseFloat(rec.vendor_rating) || 5.0 };
      }
      vendorMap[vName].totalSpend += cost;
      vendorMap[vName].count++;

      // Risk & Renewals
      let diffDays = 999;
      if (rec.expiry_date) {
        const expDate = new Date(rec.expiry_date);
        diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (expDate <= in60Days && expDate >= now) {
          renewals.push({ ...rec, daysLeft: diffDays });
        }
      }

      if (diffDays < 0 || rec.status === 'Expired') criticalCount++;
      else if (diffDays <= 30) highCount++;
      else if (diffDays <= 90) mediumCount++;
      else lowCount++;
    });

    renewals.sort((a, b) => a.daysLeft - b.daysLeft);

    const deptSpendArray = Object.entries(deptSpendMap)
      .map(([name, spend]) => ({ name, spend }))
      .sort((a, b) => b.spend - a.spend);

    const vendorArray = Object.values(vendorMap)
      .sort((a, b) => b.totalSpend - a.totalSpend);

    const avgRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : "4.8";

    return {
      totalSpend,
      totalLicenses,
      usedLicenses,
      monthlyBurn,
      avgRating,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      departmentSpend: deptSpendArray,
      upcomingRenewals: renewals,
      topVendors: vendorArray,
      activeContracts: records.length
    };
  }, [records]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-theme-btn-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="AMC & Subscription Analytics"
        description="Enterprise spend distribution, monthly amortization burn-rate, license health, and risk matrix."
        icon={<BarChart2 className="h-6 w-6" />}
        actions={
          <Link href="/amc">
            <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Contracts
            </AppButton>
          </Link>
        }
      />

      <div className="space-y-6">
        {/* 5 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between space-y-2 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Active Contract Value</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {formatCurrency(analyticsData.totalSpend)}
            </div>
            <span className="text-[10px] text-muted">{analyticsData.activeContracts} Active Contracts</span>
          </AppCard>

          <AppCard className="p-5 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between space-y-2 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Monthly Run-Rate</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-500 font-mono">
              {formatCurrency(analyticsData.monthlyBurn)}<span className="text-xs text-muted font-normal">/mo</span>
            </div>
            <span className="text-[10px] text-muted">Amortized Accruals</span>
          </AppCard>

          <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between space-y-2 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">License Utilization</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {analyticsData.totalLicenses > 0 ? Math.round((analyticsData.usedLicenses / analyticsData.totalLicenses) * 100) : 0}%
            </div>
            <span className="text-[10px] text-muted">{analyticsData.usedLicenses} / {analyticsData.totalLicenses} Allocated</span>
          </AppCard>

          <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between space-y-2 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Vendor Quality</span>
              <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                <Star className="h-4 w-4 fill-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground font-mono flex items-center gap-1">
              <span>{analyticsData.avgRating}</span>
              <span className="text-xs text-muted font-normal">/ 5.0</span>
            </div>
            <span className="text-[10px] text-muted">Average Partner Rating</span>
          </AppCard>

          <AppCard className="p-5 border border-rose-500/30 bg-rose-500/5 flex flex-col justify-between space-y-2 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Critical / High Risk</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-500 font-mono">
              {analyticsData.criticalCount + analyticsData.highCount}
            </div>
            <span className="text-[10px] text-muted">Expiring &lt;30d or Overdue</span>
          </AppCard>
        </div>

        {/* 2-Column Visual Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Renewals in 60 Days */}
          <AppCard className="p-6 flex flex-col bg-surface border border-border rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Upcoming Renewals (Next 60 Days)</h3>
                  <p className="text-xs text-muted">Contracts approaching expiration requiring renewal decision.</p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-theme-icon">{analyticsData.upcomingRenewals.length} Action Items</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px]">
              {analyticsData.upcomingRenewals.length === 0 ? (
                <div className="text-center p-8 text-muted italic text-xs">No renewals due in the next 60 days.</div>
              ) : (
                analyticsData.upcomingRenewals.map(rec => (
                  <div key={rec.id} className="p-3.5 rounded-xl border border-border/70 bg-elevated/50 flex items-center justify-between gap-3 hover:border-theme-btn-primary/40 transition-all">
                    <div>
                      <div className="font-bold text-xs text-foreground">{rec.software_name}</div>
                      <div className="text-[11px] text-muted">{rec.vendor_master?.name || 'Direct Provider'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black font-mono ${rec.daysLeft <= 15 ? 'text-rose-500' : 'text-amber-500'}`}>
                        {rec.daysLeft} days left
                      </div>
                      <div className="text-[10px] text-muted">{new Date(rec.expiry_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AppCard>

          {/* Spend by Cost Center */}
          <AppCard className="p-6 flex flex-col bg-surface border border-border rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-theme-btn-primary/10 text-theme-icon">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Cost Center Spend Allocation</h3>
                  <p className="text-xs text-muted">Distribution of software subscription capital across departments.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto max-h-[380px] pt-1">
              {analyticsData.departmentSpend.length === 0 ? (
                <div className="text-center p-8 text-muted italic text-xs">No cost center allocations.</div>
              ) : (
                analyticsData.departmentSpend.map((dept, idx) => {
                  const percent = analyticsData.totalSpend > 0 ? Math.round((dept.spend / analyticsData.totalSpend) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{dept.name}</span>
                        <span className="font-bold font-mono text-foreground">{formatCurrency(dept.spend)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-elevated">
                        <div 
                          className="h-full bg-theme-btn-primary transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted text-right font-medium">{percent}% of portfolio</div>
                    </div>
                  );
                })
              )}
            </div>
          </AppCard>
        </div>
      </div>
    </PageContainer>
  );
}
