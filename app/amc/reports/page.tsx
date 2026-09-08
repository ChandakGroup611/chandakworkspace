"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  AlertCircle,
  Activity,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { usePermissions } from "@/hooks/usePermissions";
import { Lock } from "lucide-react";

export default function AMCReportsPage() {
  let isLightMode = false;
  try {
    const { theme } = useTheme();
    isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
  } catch (e) {}
  const supabase = createClient();
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<'invoices' | 'amortization'>('invoices');

  // Master AMCs and Invoices
  const [amcList, setAmcList] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  if (!permsLoading && !isSuperAdmin && !hasPermission("AMC_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-muted">
        <Lock className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm mt-2 text-muted">You do not have permission to view AMC Reports.</p>
        <Link href="/" className="mt-4">
          <AppButton variant="primary" size="sm">Return to Dashboard</AppButton>
        </Link>
      </div>
    );
  }

  const fetchData = async () => {
    try {
      // 1. Fetch AMCs with departments and vendor
      const { data: amcs } = await supabase
        .from('software_amc')
        .select(`
          id, software_name, cost, total_licenses, used_licenses, 
          purchase_date, expiry_date, monthly_amortized_cost, contract_type,
          vendor_master(name),
          departments:cost_center_id(name)
        `)
        .eq('is_deleted', false);
      
      // 2. Fetch all Invoices
      const { data: invData } = await supabase
        .from('amc_invoices')
        .select('*, software_amc:amc_id(software_name)')
        .eq('is_deleted', false)
        .order('due_date', { ascending: true });

      setAmcList(amcs || []);
      setInvoices(invData || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Compute Global & Department Analytics
  const reportData = useMemo(() => {
    let totalContractValue = 0;
    let totalMonthlyBurn = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    const now = new Date();

    amcList.forEach(amc => {
      const cost = parseFloat(amc.cost) || 0;
      totalContractValue += cost;

      let monthly = parseFloat(amc.monthly_amortized_cost) || 0;
      if (monthly === 0 && cost > 0 && amc.purchase_date && amc.expiry_date) {
        const start = new Date(amc.purchase_date);
        const end = new Date(amc.expiry_date);
        const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
        monthly = cost / months;
      } else if (monthly === 0 && cost > 0) {
        monthly = cost / 12;
      }
      totalMonthlyBurn += monthly;
    });

    invoices.forEach(inv => {
      const amt = parseFloat(inv.amount) || 0;
      if (inv.status === 'Paid') {
        totalPaid += amt;
      } else {
        totalPending += amt;
        if (inv.due_date && new Date(inv.due_date) < now) {
          totalOverdue += amt;
        }
      }
    });

    // Department breakdown
    const deptMap: Record<string, { name: string; contracted: number; licenses: number; used: number }> = {};
    amcList.forEach(amc => {
      const dName = amc.departments?.name || 'Uncategorized / IT';
      if (!deptMap[dName]) {
        deptMap[dName] = { name: dName, contracted: 0, licenses: 0, used: 0 };
      }
      deptMap[dName].contracted += (parseFloat(amc.cost) || 0);
      deptMap[dName].licenses += (amc.total_licenses || 0);
      deptMap[dName].used += (amc.used_licenses || 0);
    });

    const deptMetrics = Object.values(deptMap).sort((a, b) => b.contracted - a.contracted);

    return {
      totalContractValue,
      totalMonthlyBurn,
      totalPaid,
      totalPending,
      totalOverdue,
      deptMetrics
    };
  }, [amcList, invoices]);

  const exportToCSV = () => {
    if (activeReportTab === 'invoices') {
      let csv = "Software Name,Invoice Description,Due Date,Amount (INR),Status,Payment Date,Payment Type\n";
      invoices.forEach(inv => {
        const swName = inv.software_amc?.software_name?.replace(/,/g, '') || 'Unknown';
        const desc = inv.description?.replace(/,/g, '') || '';
        const due = inv.due_date || '';
        const amt = inv.amount || 0;
        const stat = inv.status || '';
        const pdate = inv.payment_date || '';
        const ptype = inv.payment_type || 'Scheduled';
        csv += `"${swName}","${desc}","${due}",${amt},"${stat}","${pdate}","${ptype}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `AMC_Invoice_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      let csv = "Software Name,Vendor,Contract Type,Total Cost (INR),Monthly Amortization (INR),Start Date,Expiry Date,Remaining Value (INR)\n";
      const today = new Date();
      amcList.forEach(amc => {
        const swName = amc.software_name?.replace(/,/g, '') || '';
        const vendor = amc.vendor_master?.name?.replace(/,/g, '') || 'N/A';
        const cType = amc.contract_type || 'AMC';
        const cost = parseFloat(amc.cost) || 0;
        const start = amc.purchase_date ? new Date(amc.purchase_date) : null;
        const end = amc.expiry_date ? new Date(amc.expiry_date) : null;
        let monthly = parseFloat(amc.monthly_amortized_cost) || 0;
        if (monthly === 0 && cost > 0 && start && end) {
          const m = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
          monthly = cost / m;
        } else if (monthly === 0 && cost > 0) {
          monthly = cost / 12;
        }

        let remaining = 0;
        if (end && end > today && cost > 0) {
          const totalDays = start ? Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24)) : 365;
          const leftDays = Math.max(0, (end.getTime() - today.getTime()) / (1000 * 3600 * 24));
          remaining = (cost * (leftDays / totalDays));
        }

        csv += `"${swName}","${vendor}","${cType}",${cost.toFixed(2)},${monthly.toFixed(2)},"${amc.purchase_date || ''}","${amc.expiry_date || ''}",${remaining.toFixed(2)}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `AMC_Amortization_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

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
        title="Financial & Amortization Reports"
        description="Comprehensive cashflow reporting, straight-line expense accruals, and invoice tracking."
        icon={<PieChart className="h-6 w-6" />}
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={exportToCSV} leftIcon={<Download className="h-4 w-4" />}>
              Export {activeReportTab === 'invoices' ? 'Invoices' : 'Amortization'} CSV
            </AppButton>
            <Link href="/amc">
              <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to Contracts
              </AppButton>
            </Link>
          </>
        }
      />

      <div className="space-y-8">
        {/* Level 1: Global Executive Summary */}
        <div>
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-theme-btn-primary text-white h-5 w-5 rounded flex items-center justify-center text-xs font-bold">L1</span>
            Global Portfolio Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <AppCard className="p-5 border-l-4 border-l-blue-500 bg-surface rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-muted uppercase">Total Portfolio Value</p>
              <h4 className="text-2xl font-black mt-1 text-foreground font-mono">{formatCurrency(reportData.totalContractValue)}</h4>
            </AppCard>

            <AppCard className="p-5 border-l-4 border-l-emerald-500 bg-surface rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-emerald-500 uppercase">Monthly Run-Rate</p>
              <h4 className="text-2xl font-black mt-1 text-emerald-500 font-mono">{formatCurrency(reportData.totalMonthlyBurn)}<span className="text-xs font-normal text-muted">/mo</span></h4>
            </AppCard>

            <AppCard className="p-5 border-l-4 border-l-teal-500 bg-surface rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-muted uppercase">Total Cash Disbursed</p>
              <h4 className="text-2xl font-black mt-1 text-teal-500 font-mono">{formatCurrency(reportData.totalPaid)}</h4>
            </AppCard>

            <AppCard className="p-5 border-l-4 border-l-amber-500 bg-surface rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-muted uppercase">Upcoming Scheduled</p>
              <h4 className="text-2xl font-black mt-1 text-amber-500 font-mono">{formatCurrency(reportData.totalPending - reportData.totalOverdue)}</h4>
            </AppCard>

            <AppCard className="p-5 border-l-4 border-l-rose-500 bg-surface rounded-xl shadow-sm">
              <p className="text-xs font-semibold text-muted uppercase">Overdue Invoices</p>
              <h4 className="text-2xl font-black mt-1 text-rose-500 font-mono">{formatCurrency(reportData.totalOverdue)}</h4>
            </AppCard>
          </div>
        </div>

        {/* Level 2: Department Drill-down */}
        <div>
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-theme-btn-primary text-white h-5 w-5 rounded flex items-center justify-center text-xs font-bold">L2</span>
            Cost Center & License Utilization Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reportData.deptMetrics.map((dept, idx) => (
              <AppCard key={idx} className="p-5 flex flex-col bg-surface border border-border rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-foreground text-sm">{dept.name}</h4>
                  <div className="text-sm font-black font-mono text-theme-icon">{formatCurrency(dept.contracted)}</div>
                </div>
                <div className="flex justify-between items-end mt-auto pt-3 border-t border-border text-xs text-muted">
                  <span className="font-semibold uppercase tracking-wider">Seats Utilization</span>
                  <span className="font-bold text-foreground font-mono">
                    {dept.used} / {dept.licenses} ({dept.licenses > 0 ? Math.round((dept.used / dept.licenses) * 100) : 0}%)
                  </span>
                </div>
              </AppCard>
            ))}
          </div>
        </div>

        {/* Level 3: Transactional & Amortization View */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <span className="bg-theme-btn-primary text-white h-5 w-5 rounded flex items-center justify-center text-xs font-bold">L3</span>
              Detailed Audit Ledger
            </h3>

            <div className="flex rounded-xl border border-border p-1 bg-elevated text-xs">
              <AppButton
                type="button"
                variant={activeReportTab === 'invoices' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveReportTab('invoices')}
                leftIcon={<List className="h-3.5 w-3.5" />}
                className="h-7 px-3 text-xs font-semibold rounded-lg"
              >
                Invoices & Cashflow
              </AppButton>
              <AppButton
                type="button"
                variant={activeReportTab === 'amortization' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveReportTab('amortization')}
                leftIcon={<Activity className="h-3.5 w-3.5" />}
                className="h-7 px-3 text-xs font-semibold rounded-lg"
              >
                Expense Amortization Schedule
              </AppButton>
            </div>
          </div>

          <AppCard className="overflow-hidden border border-border bg-surface rounded-2xl shadow-sm">
            {activeReportTab === 'invoices' ? (
              <div className="overflow-x-auto">
                <AppTable className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <AppTableHeader className="bg-surface">
                    <AppTableRow>
                      <AppTableHead className="p-3 font-semibold text-muted">Software</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Invoice Description</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Due Date</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Amount</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Status</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Paid Date</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {invoices.length === 0 ? (
                      <AppTableRow>
                        <AppTableCell colSpan={6} className="p-8 text-center text-muted italic">
                          No invoice records found.
                        </AppTableCell>
                      </AppTableRow>
                    ) : (
                      invoices.map(inv => {
                        const isOverdue = inv.status === 'Pending' && inv.due_date && new Date(inv.due_date) < new Date();
                        return (
                          <AppTableRow key={inv.id} className="border-b border-border/60 hover:bg-elevated/60 transition-colors">
                            <AppTableCell className="p-3 font-bold text-foreground">{inv.software_amc?.software_name || '-'}</AppTableCell>
                            <AppTableCell className="p-3 text-muted">{inv.description || '-'}</AppTableCell>
                            <AppTableCell className="p-3 text-muted">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</AppTableCell>
                            <AppTableCell className="p-3 font-mono font-bold text-foreground">
                              ₹ {(parseFloat(inv.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </AppTableCell>
                            <AppTableCell className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                inv.status === 'Paid' ? 'bg-success/15 text-success border-success/30' :
                                isOverdue ? 'bg-danger/15 text-danger border-danger/30' :
                                'bg-warning/15 text-warning border-warning/30'
                              }`}>
                                {inv.status === 'Paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                              </span>
                            </AppTableCell>
                            <AppTableCell className="p-3 text-muted">{inv.payment_date ? new Date(inv.payment_date).toLocaleDateString() : '-'}</AppTableCell>
                          </AppTableRow>
                        );
                      })
                    )}
                  </AppTableBody>
                </AppTable>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <AppTable className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <AppTableHeader className="bg-surface">
                    <AppTableRow>
                      <AppTableHead className="p-3 font-semibold text-muted">Software</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Provider</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Contract Type</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Total Cost</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Monthly Accrual</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Start Date</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Expiry Date</AppTableHead>
                      <AppTableHead className="p-3 font-semibold text-muted">Remaining Balance</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {amcList.length === 0 ? (
                      <AppTableRow>
                        <AppTableCell colSpan={8} className="p-8 text-center text-muted italic">
                          No subscriptions recorded for amortization.
                        </AppTableCell>
                      </AppTableRow>
                    ) : (
                      amcList.map(amc => {
                        const cost = parseFloat(amc.cost) || 0;
                        const start = amc.purchase_date ? new Date(amc.purchase_date) : null;
                        const end = amc.expiry_date ? new Date(amc.expiry_date) : null;
                        const today = new Date();

                        let monthly = parseFloat(amc.monthly_amortized_cost) || 0;
                        if (monthly === 0 && cost > 0 && start && end) {
                          const m = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                          monthly = cost / m;
                        } else if (monthly === 0 && cost > 0) {
                          monthly = cost / 12;
                        }

                        let remaining = 0;
                        if (end && end > today && cost > 0) {
                          const totalDays = start ? Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24)) : 365;
                          const leftDays = Math.max(0, (end.getTime() - today.getTime()) / (1000 * 3600 * 24));
                          remaining = cost * (leftDays / totalDays);
                        }

                        return (
                          <AppTableRow key={amc.id} className="border-b border-border/60 hover:bg-elevated/60 transition-colors">
                            <AppTableCell className="p-3 font-bold text-foreground">{amc.software_name}</AppTableCell>
                            <AppTableCell className="p-3 text-muted">{amc.vendor_master?.name || 'Direct'}</AppTableCell>
                            <AppTableCell className="p-3 text-muted">{amc.contract_type || 'AMC'}</AppTableCell>
                            <AppTableCell className="p-3 font-mono font-bold text-foreground">
                              ₹ {cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </AppTableCell>
                            <AppTableCell className="p-3 font-mono font-bold text-emerald-500">
                              ₹ {monthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}<span className="text-[10px] text-muted font-normal">/mo</span>
                            </AppTableCell>
                            <AppTableCell className="p-3 text-muted">{amc.purchase_date || '-'}</AppTableCell>
                            <AppTableCell className="p-3 text-muted">{amc.expiry_date || '-'}</AppTableCell>
                            <AppTableCell className="p-3 font-mono font-bold text-theme-icon">
                              ₹ {remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </AppTableCell>
                          </AppTableRow>
                        );
                      })
                    )}
                  </AppTableBody>
                </AppTable>
              </div>
            )}
          </AppCard>
        </div>
      </div>
    </PageContainer>
  );
}
