"use client";

import React, { useEffect, useState } from "react";
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
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";

export default function AMCAnalyticsPage() {
  let isLightMode = false;
  try {
    const { theme } = useTheme() as any;
    isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);
  } catch (e) {}
  const supabase = createClient();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSpend: 0,
    totalLicenses: 0,
    usedLicenses: 0,
    activeContracts: 0
  });
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);
  const [departmentSpend, setDepartmentSpend] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: amcData, error } = await supabase
        .from('software_amc')
        .select('*, departments:cost_center_id(name)')
        .eq('status', 'Active');

      if (error) throw error;
      
      const records = amcData || [];
      
      // Calculate Metrics
      let totalSpend = 0;
      let totalLicenses = 0;
      let usedLicenses = 0;
      const deptSpendMap: Record<string, number> = {};

      const now = new Date();
      const in60Days = new Date();
      in60Days.setDate(now.getDate() + 60);

      const renewals = [];

      for (const rec of records) {
        totalSpend += (rec.cost || 0);
        totalLicenses += (rec.total_licenses || 0);
        usedLicenses += (rec.used_licenses || 0);

        const deptName = rec.departments?.name || 'Uncategorized';
        deptSpendMap[deptName] = (deptSpendMap[deptName] || 0) + (rec.cost || 0);

        if (rec.expiry_date) {
          const expDate = new Date(rec.expiry_date);
          if (expDate <= in60Days && expDate >= now) {
            renewals.push(rec);
          }
        }
      }

      // Sort renewals
      renewals.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      // Format department spend for charts/lists
      const deptSpendArray = Object.entries(deptSpendMap)
        .map(([name, spend]) => ({ name, spend }))
        .sort((a, b) => b.spend - a.spend);

      setMetrics({
        totalSpend,
        totalLicenses,
        usedLicenses,
        activeContracts: records.length
      });
      setDepartmentSpend(deptSpendArray);
      setUpcomingRenewals(renewals);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (used: number, total: number) => {
    if (total === 0) return 'text-gray-500';
    const percent = (used / total) * 100;
    if (percent >= 90) return 'text-emerald-500';
    if (percent >= 50) return 'text-accent';
    return 'text-amber-500';
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="AMC Analytics Dashboard"
        description="High-level metrics, usage tracking, and upcoming renewals for software subscriptions."
        icon={<BarChart2 className="h-6 w-6" />}
        actions={
          <Link href="/amc">
            <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to List
            </AppButton>
          </Link>
        }
      />

      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AppCard className={`p-6 flex items-center gap-4 bg-surface`}>
            <div className={`p-4 rounded-xl bg-accent/10 text-accent`}>
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Total Active Spend</p>
              <h4 className="text-2xl font-black mt-1">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(metrics.totalSpend)}
              </h4>
            </div>
          </AppCard>

          <AppCard className={`p-6 flex items-center gap-4 bg-surface`}>
            <div className={`p-4 rounded-xl bg-emerald-50 text-emerald-600`}>
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Active Contracts</p>
              <h4 className="text-2xl font-black mt-1">{metrics.activeContracts}</h4>
            </div>
          </AppCard>

          <AppCard className={`p-6 flex items-center gap-4 bg-surface`}>
            <div className={`p-4 rounded-xl bg-accent/10 text-accent`}>
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Total Licenses</p>
              <h4 className="text-2xl font-black mt-1">{metrics.totalLicenses}</h4>
            </div>
          </AppCard>

          <AppCard className={`p-6 flex items-center gap-4 bg-surface`}>
            <div className={`p-4 rounded-xl bg-amber-50 text-amber-600`}>
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Overall Utilization</p>
              <h4 className={`text-2xl font-black mt-1 ${getUtilizationColor(metrics.usedLicenses, metrics.totalLicenses)}`}>
                {metrics.totalLicenses > 0 ? Math.round((metrics.usedLicenses / metrics.totalLicenses) * 100) : 0}%
              </h4>
              <p className="text-xs text-gray-400 mt-1">{metrics.usedLicenses} allocated</p>
            </div>
          </AppCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Renewals */}
          <AppCard className={`flex flex-col bg-surface`}>
            <div className={`p-6 border-b flex items-center gap-2 border-border`}>
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <h3 className="font-bold text-accent">Renewals in Next 60 Days</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
              {upcomingRenewals.length === 0 ? (
                <div className="text-center p-8 text-gray-500 italic">No upcoming renewals!</div>
              ) : (
                <div className="space-y-3">
                  {upcomingRenewals.map(rec => {
                    const daysLeft = Math.ceil((new Date(rec.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    return (
                      <div key={rec.id} className={`p-4 rounded-xl border flex items-center justify-between border-border bg-elevated`}>
                        <div>
                          <div className="font-bold text-sm">{rec.software_name}</div>
                          <div className="text-xs text-gray-500 mt-1">{rec.provider_name}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-black ${daysLeft <= 15 ? 'text-rose-500' : 'text-amber-500'}`}>
                            {daysLeft} days left
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{new Date(rec.expiry_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </AppCard>

          {/* Spend by Cost Center */}
          <AppCard className={`flex flex-col bg-surface`}>
            <div className={`p-6 border-b flex items-center gap-2 border-border`}>
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-accent">Spend by Cost Center</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
              {departmentSpend.length === 0 ? (
                <div className="text-center p-8 text-gray-500 italic">No financial data available.</div>
              ) : (
                <div className="space-y-4">
                  {departmentSpend.map((dept, idx) => {
                    const percent = Math.round((dept.spend / metrics.totalSpend) * 100) || 0;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-gray-300">{dept.name}</span>
                          <span className="font-black">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(dept.spend)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-surface/10">
                          <div 
                            className="h-full bg-accent"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-500 text-right">{percent}% of total</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </AppCard>
        </div>
      </div>
    </PageContainer>
  );
}

