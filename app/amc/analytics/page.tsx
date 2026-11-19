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
import ChandakLoader from "@/components/ui/ChandakLoader";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export default function AMCAnalyticsPage() {
  let isLightMode = false;
  try {
    const themeCtx = useTheme();
    isLightMode = themeCtx.isLight;
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
      <AccessRestricted
        requiredRole="AMC Manager"
        requiredPermission="AMC_VIEW"
        moduleName="AMC Analytics"
      />
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
        <ChandakLoader
          size="lg"
          title="AMC & contract analytics"
          subtitle="Aggregating financial metrics and performance trends…"
        />
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="AMC & subscription analytics"
        icon={<BarChart2 className="h-6 w-6" />}
        actions={
          <Link href="/amc">
            <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to contracts
            </AppButton>
          </Link>
        }
      />

      <div className="space-y-6">
        {/* 5 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between space-y-2 rounded-lg shadow-xs">
            <div className="flex items-center justify-between">
              <span className="theme-label text-muted">Active contract value</span>
              <div className="p-2 rounded-lg bg-info-soft text-info-text">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-foreground font-mono">
              {formatCurrency(analyticsData.totalSpend)}
            </div>
            <span className="text-[11px] text-muted">{analyticsData.activeContracts} Active contracts</span>
          </AppCard>

          <AppCard className="p-5 border border-success-border bg-success-soft/30 flex flex-col justify-between space-y-2 rounded-lg shadow-xs">
            <div className="flex items-center justify-between">
              <span className="theme-label text-success-text">Monthly Run-Rate</span>
              <div className="p-2 rounded-lg bg-success-soft text-success-text">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-success-text font-mono">
              {formatCurrency(analyticsData.monthlyBurn)}<span className="text-xs text-muted font-normal">/mo</span>
            </div>
            <span className="text-[11px] text-muted">Amortized accruals</span>
          </AppCard>

          <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between space-y-2 rounded-lg shadow-xs">
            <div className="flex items-center justify-between">
              <span className="theme-label text-muted">License utilisation</span>
              <div className="p-2 rounded-lg bg-surface text-accent-soft-text">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-foreground font-mono">
              {analyticsData.totalLicenses > 0 ? Math.round((analyticsData.usedLicenses / analyticsData.totalLicenses) * 100) : 0}%
            </div>
            <span className="text-[11px] text-muted">{analyticsData.usedLicenses} / {analyticsData.totalLicenses} Allocated</span>
          </AppCard>

          <AppCard className="p-5 border border-border bg-surface flex flex-col justify-between space-y-2 rounded-lg shadow-xs">
            <div className="flex items-center justify-between">
              <span className="theme-label text-muted">Vendor quality</span>
              <div className="p-2 rounded-lg bg-warning-soft text-warning-text">
                <Star className="h-4 w-4 fill-warning" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-foreground font-mono flex items-center gap-1">
              <span>{analyticsData.avgRating}</span>
              <span className="text-xs text-muted font-normal">/ 5.0</span>
            </div>
            <span className="text-[11px] text-muted">Average partner rating</span>
          </AppCard>

          <AppCard className="p-5 border border-danger-border bg-danger-soft/30 flex flex-col justify-between space-y-2 rounded-lg shadow-xs">
            <div className="flex items-center justify-between">
              <span className="theme-label text-danger-text">Critical / high risk</span>
              <div className="p-2 rounded-lg bg-danger-soft text-danger-text">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-danger-text font-mono">
              {analyticsData.criticalCount + analyticsData.highCount}
            </div>
            <span className="text-[11px] text-muted">Expiring &lt;30d or overdue</span>
          </AppCard>
        </div>

        {/* 2-Column Visual Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Renewals in 60 Days */}
          <AppCard className="p-6 flex flex-col bg-surface border border-border rounded-lg space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-danger-soft text-danger-text">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Upcoming renewals (next 60 days)</h3>
                  <p className="text-xs text-muted">Contracts approaching expiration requiring renewal decision.</p>
                </div>
              </div>
              <span className="text-xs font-semibold font-mono text-accent-soft-text">{analyticsData.upcomingRenewals.length} Action items</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px]">
              {analyticsData.upcomingRenewals.length === 0 ? (
                <div className="text-center p-8 text-muted italic text-xs">No renewals due in the next 60 days.</div>
              ) : (
                analyticsData.upcomingRenewals.map(rec => (
                  <div key={rec.id} className="p-3.5 rounded-lg border border-border bg-sunken flex items-center justify-between gap-3 hover:border-border-active transition-all">
                    <div>
                      <div className="font-semibold text-xs text-foreground">{rec.software_name}</div>
                      <div className="text-[11px] text-muted">{rec.vendor_master?.name || 'Direct Provider'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold font-mono ${rec.daysLeft <= 15 ? 'text-danger-text' : 'text-warning-text'}`}>
                        {rec.daysLeft} days left
                      </div>
                      <div className="text-[11px] text-muted">{String(rec.expiry_date).slice(0, 10)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AppCard>

          {/* Spend by Cost Center */}
          <AppCard className="p-6 flex flex-col bg-surface border border-border rounded-lg space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-accent-soft text-accent-soft-text">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Cost center spend allocation</h3>
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
                        <span className="font-semibold font-mono text-foreground">{formatCurrency(dept.spend)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-elevated">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted text-right font-medium">{percent}% of portfolio</div>
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
