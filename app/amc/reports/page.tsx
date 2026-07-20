"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { 
  BarChart2, 
  DollarSign, 
  Download, 
  ArrowLeft,
  PieChart,
  List,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";


export default function AMCReportsPage() {
  let isLightMode = false;
  try {
    const { theme } = useTheme();
    isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  } catch (e) {}
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  // Level 1: Global Summary
  const [globalMetrics, setGlobalMetrics] = useState({
    totalContractValue: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0
  });

  // Level 2: Department View
  const [deptMetrics, setDeptMetrics] = useState<any[]>([]);

  // Level 3: Transactional View
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch AMCs with departments
      const { data: amcs } = await supabase
        .from('software_amc')
        .select('id, cost, total_licenses, used_licenses, departments:cost_center_id(name)');
      
      // 2. Fetch all Invoices
      const { data: invData } = await supabase
        .from('amc_invoices')
        .select('*, software_amc:amc_id(software_name)')
        .order('due_date', { ascending: true });

      const allInvoices = invData || [];
      setInvoices(allInvoices);

      // Calculate Global
      let totalContractValue = (amcs || []).reduce((sum, amc) => sum + (amc.cost || 0), 0);
      let totalPaid = 0;
      let totalPending = 0;
      let totalOverdue = 0;

      const now = new Date();

      allInvoices.forEach(inv => {
        if (inv.status === 'Paid') {
          totalPaid += inv.amount;
        } else if (inv.status === 'Pending') {
          totalPending += inv.amount;
          if (new Date(inv.due_date) < now) {
            totalOverdue += inv.amount;
          }
        }
      });

      setGlobalMetrics({
        totalContractValue,
        totalPaid,
        totalPending,
        totalOverdue
      });

      // Calculate Department Drill-down
      const deptMap: any = {};
      (amcs || []).forEach(amc => {
        let dName = 'Uncategorized';
        const depts = amc.departments as any;
        if (depts) {
          dName = Array.isArray(depts) ? depts[0]?.name : depts.name;
        }
        if (!dName) dName = 'Uncategorized';
        
        if (!deptMap[dName]) {
          deptMap[dName] = { name: dName, contracted: 0, licenses: 0, used: 0 };
        }
        deptMap[dName].contracted += (amc.cost || 0);
        deptMap[dName].licenses += (amc.total_licenses || 0);
        deptMap[dName].used += (amc.used_licenses || 0);
      });

      setDeptMetrics(Object.values(deptMap).sort((a: any, b: any) => b.contracted - a.contracted));

    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csv = "Software,Invoice Desc,Due Date,Amount,Status,Payment Date\n";
    invoices.forEach(inv => {
      const swName = inv.software_amc?.software_name?.replace(/,/g, '') || 'Unknown';
      const desc = inv.description?.replace(/,/g, '') || '';
      const due = inv.due_date || '';
      const amt = inv.amount || 0;
      const stat = inv.status || '';
      const pdate = inv.payment_date || '';
      csv += `${swName},${desc},${due},${amt},${stat},${pdate}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'AMC_Payment_Report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Financial Reports & Payments"
        description="Multi-level cashflow reporting and invoice tracking for software subscriptions."
        icon={<PieChart className="h-6 w-6" />}
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={exportToCSV} leftIcon={<Download className="h-4 w-4" />}>
              Export to CSV
            </AppButton>
            <Link href="/amc">
              <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to List
              </AppButton>
            </Link>
          </>
        }
      />

      <div className="space-y-8">
        
        {/* Level 1: Global Summary */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">L1</span>
            Global Executive Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AppCard className={`p-6 border-l-4 border-l-blue-500 bg-surface`}>
              <p className="text-sm font-semibold text-gray-500">Total Contract Value</p>
              <h4 className="text-2xl font-black mt-1">{formatCurrency(globalMetrics.totalContractValue)}</h4>
            </AppCard>
            <AppCard className={`p-6 border-l-4 border-l-emerald-500 bg-surface`}>
              <p className="text-sm font-semibold text-gray-500">Total Cash Paid</p>
              <h4 className="text-2xl font-black mt-1 text-emerald-500">{formatCurrency(globalMetrics.totalPaid)}</h4>
            </AppCard>
            <AppCard className={`p-6 border-l-4 border-l-amber-500 bg-surface`}>
              <p className="text-sm font-semibold text-gray-500">Upcoming / Pending</p>
              <h4 className="text-2xl font-black mt-1 text-amber-500">{formatCurrency(globalMetrics.totalPending - globalMetrics.totalOverdue)}</h4>
            </AppCard>
            <AppCard className={`p-6 border-l-4 border-l-rose-500 bg-surface`}>
              <p className="text-sm font-semibold text-gray-500">Overdue Payments</p>
              <h4 className="text-2xl font-black mt-1 text-rose-500">{formatCurrency(globalMetrics.totalOverdue)}</h4>
            </AppCard>
          </div>
        </div>

        {/* Level 2: Department Drill-down */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">L2</span>
            Department / Cost Center View
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deptMetrics.map((dept, idx) => (
              <AppCard key={idx} className={`p-6 flex flex-col bg-surface border-border`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-accent">{dept.name}</h4>
                  <div className="text-sm font-black">{formatCurrency(dept.contracted)}</div>
                </div>
                <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-200 dark:border-white/10">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Utilization</div>
                  <div className="text-sm font-bold">
                    {dept.used} / {dept.licenses} ({dept.licenses > 0 ? Math.round((dept.used/dept.licenses)*100) : 0}%)
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        </div>

        {/* Level 3: Transactional View */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">L3</span>
            Detailed Cashflow / Payment Forecast
          </h3>
          <AppCard className={`overflow-hidden border bg-surface border-border`}>
            <div className="overflow-x-auto">
              <AppTable className="w-full text-left border-collapse">
                <AppTableHeader>
                  <AppTableRow className={`text-xs uppercase tracking-wider text-gray-500 border-b bg-elevated border-border`}>
                    <AppTableHead className="p-4 font-bold">Status</AppTableHead>
                    <AppTableHead className="p-4 font-bold">Due Date</AppTableHead>
                    <AppTableHead className="p-4 font-bold">Software</AppTableHead>
                    <AppTableHead className="p-4 font-bold">Description</AppTableHead>
                    <AppTableHead className="p-4 font-bold">Payment Date</AppTableHead>
                    <AppTableHead className="p-4 font-bold text-right">Amount</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-gray-200 dark:divide-white/5 text-sm">
                  {invoices.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={6} className="p-8 text-center text-gray-500 italic">No payment records found.</AppTableCell>
                    </AppTableRow>
                  ) : invoices.map(inv => {
                    const isOverdue = inv.status === 'Pending' && new Date(inv.due_date) < new Date();
                    return (
                      <AppTableRow key={inv.id} className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isOverdue ? 'bg-rose-500/5' : ''}`}>
                        <AppTableCell className="p-4">
                          {inv.status === 'Paid' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 flex items-center gap-1 w-max"><CheckCircle className="h-3 w-3" /> PAID</span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 flex items-center gap-1 w-max"><AlertCircle className="h-3 w-3" /> OVERDUE</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 flex items-center gap-1 w-max"><Clock className="h-3 w-3" /> PENDING</span>
                          )}
                        </AppTableCell>
                        <AppTableCell className={`p-4 font-semibold ${isOverdue ? 'text-rose-500' : ''}`}>
                          {new Date(inv.due_date).toLocaleDateString()}
                        </AppTableCell>
                        <AppTableCell className="p-4 font-medium text-accent">
                          {inv.software_amc?.software_name}
                        </AppTableCell>
                        <AppTableCell className="p-4 text-gray-500">
                          {inv.description}
                        </AppTableCell>
                        <AppTableCell className="p-4">
                          {inv.payment_date ? new Date(inv.payment_date).toLocaleDateString() : '-'}
                        </AppTableCell>
                        <AppTableCell className="p-4 text-right font-black">
                          {formatCurrency(inv.amount)}
                        </AppTableCell>
                      </AppTableRow>
                    )
                  })}
                </AppTableBody>
              </AppTable>
            </div>
          </AppCard>
        </div>

      </div>
    </PageContainer>
  );
}
