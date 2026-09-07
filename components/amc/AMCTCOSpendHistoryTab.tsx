"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import {
  TrendingUp,
  Receipt,
  CalendarClock,
  DollarSign,
  Layers,
  ArrowUpRight,
  Download,
  FileText,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  User,
  Paperclip,
  Clock,
  Activity,
  History,
  Info
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { createClient } from "@/utils/supabase/client";

interface AMCTCOSpendHistoryTabProps {
  amcId: string;
  isLightMode: boolean;
  currency?: string;
  record?: any;
  onRefresh?: () => void;
}

export interface SpendEvent {
  id: string;
  source: 'acquisition' | 'transaction' | 'renewal';
  date: string;
  displayDate: string;
  title: string;
  type: string;
  description: string;
  poNumber?: string;
  amount: number;
  runningTotal: number;
  percentOfTotal: number;
  user?: string;
  notes?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export function AMCTCOSpendHistoryTab({
  amcId,
  isLightMode,
  currency = 'INR',
  record,
  onRefresh
}: AMCTCOSpendHistoryTabProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [amcRecord, setAmcRecord] = useState<any>(record || null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'acquisition' | 'transaction' | 'renewal'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAllSpendData();
  }, [amcId]);

  const fetchAllSpendData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Master AMC Record if not supplied or for latest state
      const { data: amcData, error: amcErr } = await supabase
        .from('software_amc')
        .select(`
          *,
          vendor_master(name, code),
          user_master(full_name, email),
          departments(name)
        `)
        .eq('id', amcId)
        .single();

      if (!amcErr && amcData) {
        setAmcRecord(amcData);
      }

      // 2. Fetch Mid-Year Transactions
      const { data: txData, error: txErr } = await supabase
        .from('amc_transactions')
        .select('*, user_master(full_name)')
        .eq('amc_id', amcId)
        .eq('is_deleted', false)
        .order('transaction_date', { ascending: true });

      if (!txErr && txData) {
        setTransactions(txData);
      }

      // 3. Fetch Renewals
      const { data: rnData, error: rnErr } = await supabase
        .from('amc_renewals')
        .select('*, user_master(full_name)')
        .eq('amc_id', amcId)
        .order('renewal_date', { ascending: true });

      if (!rnErr && rnData) {
        setRenewals(rnData);
      }
    } catch (err: any) {
      console.error("Error fetching TCO spend data:", err);
      toast.error("Failed to load spend history ledger");
    } finally {
      setLoading(false);
    }
  };

  // Base Acquisition Numbers
  const baseCost = useMemo(() => {
    if (!amcRecord) return 0;
    // Check if line-items exist and sum up, else take rec.cost
    if (Array.isArray(amcRecord.solution_line_items) && amcRecord.solution_line_items.length > 0) {
      const sum = amcRecord.solution_line_items.reduce((acc: number, item: any) => acc + (parseFloat(item.netAmount) || 0), 0);
      if (sum > 0) return sum;
    }
    return parseFloat(amcRecord.cost) || 0;
  }, [amcRecord]);

  // Unified Chronological Spend Event Ledger
  const { spendEvents, kpiMetrics, chartData } = useMemo(() => {
    const events: SpendEvent[] = [];

    // 1. Initial Acquisition Event
    if (amcRecord) {
      const initialDate = amcRecord.purchase_date || amcRecord.po_date || amcRecord.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      events.push({
        id: `acq-${amcRecord.id}`,
        source: 'acquisition',
        date: initialDate,
        displayDate: initialDate ? new Date(initialDate).toLocaleDateString() : 'Initial Purchase',
        title: `Initial Acquisition (${amcRecord.software_name})`,
        type: amcRecord.contract_type || 'Initial Purchase',
        description: amcRecord.solution_name ? `Base Solution: ${amcRecord.solution_name}` : 'Software License & Core Onboarding',
        poNumber: amcRecord.po_number || 'Initial PO',
        amount: baseCost,
        runningTotal: baseCost,
        percentOfTotal: 0, // calculated later
        user: amcRecord.user_master?.full_name || 'System / Contract Owner',
        notes: amcRecord.specifications || amcRecord.notes || 'Initial baseline acquisition contract.'
      });
    }

    // 2. Mid-Year Add-ons & Transactions
    transactions.forEach((tx) => {
      const txDate = tx.transaction_date || tx.created_at?.split('T')[0];
      const txCost = parseFloat(tx.cost) || 0;
      events.push({
        id: `tx-${tx.id}`,
        source: 'transaction',
        date: txDate,
        displayDate: txDate ? new Date(txDate).toLocaleDateString() : 'N/A',
        title: `${tx.transaction_type} (${tx.line_item_name || 'Global'})`,
        type: tx.transaction_type || 'Mid-Year Change',
        description: tx.licenses_added ? `Added +${tx.licenses_added} licenses` : 'Support / OTC Enhancement',
        poNumber: tx.po_number || 'N/A',
        amount: txCost,
        runningTotal: 0, // calculated later
        percentOfTotal: 0, // calculated later
        user: tx.user_master?.full_name || 'Authorized Admin',
        notes: tx.notes || '',
        attachmentUrl: tx.attachment_path,
        attachmentName: tx.attachment_path ? tx.attachment_path.split('_').slice(2).join('_') || 'Attachment' : null
      });
    });

    // 3. Renewals
    renewals.forEach((rn, index) => {
      const rnDate = rn.renewal_date || rn.created_at?.split('T')[0];
      const rnCost = parseFloat(rn.renewal_cost) || 0;
      events.push({
        id: `rn-${rn.id}`,
        source: 'renewal',
        date: rnDate,
        displayDate: rnDate ? new Date(rnDate).toLocaleDateString() : 'N/A',
        title: `Contract Renewal Cycle #${index + 1}`,
        type: 'Annual Renewal',
        description: rn.new_expiry ? `Extended validity to ${new Date(rn.new_expiry).toLocaleDateString()}` : 'Validity Extended',
        poNumber: rn.po_number || 'Renewal PO',
        amount: rnCost,
        runningTotal: 0, // calculated later
        percentOfTotal: 0, // calculated later
        user: rn.user_master?.full_name || 'Contract Owner',
        notes: rn.notes || ''
      });
    });

    // Sort Chronologically (earliest to latest)
    events.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateA - dateB;
    });

    // Compute Running Totals
    let cumulative = 0;
    events.forEach((evt) => {
      cumulative += evt.amount;
      evt.runningTotal = cumulative;
    });

    const lifetimeTCO = cumulative;

    // Calculate Percentages
    events.forEach((evt) => {
      evt.percentOfTotal = lifetimeTCO > 0 ? (evt.amount / lifetimeTCO) * 100 : 0;
    });

    // Compute Sub-aggregates
    const transactionTotal = transactions.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
    const renewalTotal = renewals.reduce((sum, r) => sum + (parseFloat(r.renewal_cost) || 0), 0);
    const multiplier = baseCost > 0 ? (lifetimeTCO / baseCost).toFixed(2) : "1.00";
    const growthPercent = baseCost > 0 ? (((lifetimeTCO - baseCost) / baseCost) * 100).toFixed(1) : "0.0";

    // Compute Annualized Run-Rate
    let annualRunRate = lifetimeTCO;
    if (amcRecord?.purchase_date) {
      const pDate = new Date(amcRecord.purchase_date);
      const now = new Date();
      const diffYears = Math.max((now.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0.5);
      annualRunRate = lifetimeTCO / diffYears;
    }

    // Prepare Curve Chart Data
    const cData = events.map((evt, idx) => ({
      index: idx + 1,
      date: evt.displayDate,
      label: evt.title,
      eventAmount: evt.amount,
      cumulativeTCO: evt.runningTotal,
      type: evt.type,
      source: evt.source
    }));

    return {
      spendEvents: events,
      kpiMetrics: {
        lifetimeTCO,
        baseCost,
        transactionTotal,
        renewalTotal,
        multiplier,
        growthPercent,
        annualRunRate,
        eventCount: events.length
      },
      chartData: cData
    };
  }, [amcRecord, baseCost, transactions, renewals]);

  // Filtered Events for the Ledger Table
  const filteredEvents = useMemo(() => {
    return spendEvents.filter((evt) => {
      const matchFilter = selectedFilter === 'all' || evt.source === selectedFilter;
      const matchSearch =
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.poNumber && evt.poNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (evt.notes && evt.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (evt.user && evt.user.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchFilter && matchSearch;
    });
  }, [spendEvents, selectedFilter, searchQuery]);

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(num);
  };

  const handleDownloadAttachment = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('amc-attachments').createSignedUrl(path, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e: any) {
      toast.error("Failed to load attachment: " + e.message);
    }
  };

  // Export TCO Statement as CSV
  const handleExportCSV = () => {
    if (spendEvents.length === 0) {
      toast.error("No spend events to export.");
      return;
    }

    const headers = [
      "Event #",
      "Date",
      "Event Source",
      "Event Title / Milestone",
      "Type",
      "PO / Reference #",
      "Delta Amount (INR)",
      "Running Total Balance (INR)",
      "Share of Total TCO (%)",
      "Author / Owner",
      "Notes"
    ];

    const rows = spendEvents.map((evt, idx) => [
      idx + 1,
      `"${evt.displayDate}"`,
      `"${evt.source.toUpperCase()}"`,
      `"${evt.title.replace(/"/g, '""')}"`,
      `"${evt.type.replace(/"/g, '""')}"`,
      `"${evt.poNumber || ''}"`,
      evt.amount.toFixed(2),
      evt.runningTotal.toFixed(2),
      `${evt.percentOfTotal.toFixed(1)}%`,
      `"${evt.user || ''}"`,
      `"${(evt.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TCO_Spend_Statement_${amcRecord?.software_name || 'Software'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("TCO Financial Statement exported successfully.");
  };

  // Formal Print TCO Dossier
  const handlePrintTCOReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to generate the TCO Statement Report.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Total Cost of Ownership (TCO) Spend Statement - ${amcRecord?.software_name || 'Software'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
            .subtitle { font-size: 13px; color: #64748b; margin: 0; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
            .kpi-card { padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
            .kpi-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            .kpi-val { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
            .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; }
            .amount { text-align: right; font-family: monospace; font-weight: 700; }
            .running { color: #059669; font-weight: 800; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">${amcRecord?.software_name || 'Software Subscription'}</h1>
              <p class="subtitle">Total Cost of Ownership (TCO) & Cumulative Spend History Audit Dossier</p>
              <div style="margin-top: 8px; font-size: 12px; color: #475569;">
                <strong>Provider:</strong> ${amcRecord?.vendor_master?.name || 'N/A'} &nbsp;|&nbsp; 
                <strong>Contract Type:</strong> ${amcRecord?.contract_type || 'AMC'} &nbsp;|&nbsp; 
                <strong>Acquisition Date:</strong> ${amcRecord?.purchase_date || 'N/A'}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="badge">Cumulative TCO Till Date</div>
              <div style="margin-top: 6px; font-size: 24px; font-weight: 900; color: #059669;">
                ₹ ${formatAmount(kpiMetrics.lifetimeTCO)}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                ${kpiMetrics.multiplier}x Initial Baseline Cost
              </div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Initial Baseline Cost</div>
              <div class="kpi-val">₹ ${formatAmount(kpiMetrics.baseCost)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Mid-Year Add-ons & OTC</div>
              <div class="kpi-val">₹ ${formatAmount(kpiMetrics.transactionTotal)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Renewals Outlay</div>
              <div class="kpi-val">₹ ${formatAmount(kpiMetrics.renewalTotal)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Annualized Run Rate</div>
              <div class="kpi-val">₹ ${formatAmount(kpiMetrics.annualRunRate)}/yr</div>
            </div>
          </div>

          <div class="section-title">Chronological Spend Ledger (Audit Trail)</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Milestone / Event</th>
                <th>Type</th>
                <th>PO / Ref #</th>
                <th style="text-align: right;">Delta Outlay</th>
                <th style="text-align: right;">Cumulative Balance</th>
                <th style="text-align: right;">% Share</th>
              </tr>
            </thead>
            <tbody>
              ${spendEvents.map((evt, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${evt.displayDate}</td>
                  <td><strong>${evt.title}</strong><br/><span style="font-size: 10px; color: #64748b;">${evt.description}</span></td>
                  <td>${evt.type}</td>
                  <td>${evt.poNumber || '-'}</td>
                  <td class="amount">+₹ ${formatAmount(evt.amount)}</td>
                  <td class="amount running">₹ ${formatAmount(evt.runningTotal)}</td>
                  <td style="text-align: right;">${evt.percentOfTotal.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>Generated by Enterprise Operations Portal &bull; Antigravity TCO Engine on ${new Date().toLocaleString()}</div>
            <div>Official Financial Audit Record</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 text-muted">
        <RefreshCw className="h-8 w-8 animate-spin text-theme-icon" />
        <p className="text-sm font-semibold">Aggregating Total Cost of Ownership (TCO) ledger...</p>
      </div>
    );
  }

  // Base vs Expansion vs Renewal percentages for visual strip
  const baseShare = kpiMetrics.lifetimeTCO > 0 ? (kpiMetrics.baseCost / kpiMetrics.lifetimeTCO) * 100 : 100;
  const txShare = kpiMetrics.lifetimeTCO > 0 ? (kpiMetrics.transactionTotal / kpiMetrics.lifetimeTCO) * 100 : 0;
  const rnShare = kpiMetrics.lifetimeTCO > 0 ? (kpiMetrics.renewalTotal / kpiMetrics.lifetimeTCO) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* 1. HERO TOTAL COST OF OWNERSHIP BANNER */}
      <AppCard className="p-6 md:p-8 bg-gradient-to-br from-surface via-surface to-elevated/80 border border-border shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Enterprise Total Cost of Ownership (TCO) Engine</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {amcRecord?.software_name || "Software Subscription"}
            </h2>
            <p className="text-sm text-muted max-w-2xl leading-relaxed">
              Complete chronological audit trail and capital lifecycle from initial acquisition baseline (<span className="font-semibold text-foreground">{amcRecord?.purchase_date || 'N/A'}</span>) to present date across add-on licenses, customizations, and renewals.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="h-4 w-4 text-theme-icon" />}
              className="h-10 text-xs font-bold"
            >
              Export CSV
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrintTCOReport}
              leftIcon={<FileText className="h-4 w-4" />}
              className="h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/20"
            >
              Audit Dossier
            </AppButton>
          </div>
        </div>

        {/* Visual Capital Progression Strip */}
        <div className="mt-8 pt-6 border-t border-border/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                <span className="text-muted font-medium">Initial Purchase:</span>
                <span className="font-bold text-foreground">₹ {formatAmount(kpiMetrics.baseCost)} ({baseShare.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="text-muted font-medium">Mid-Year Add-ons:</span>
                <span className="font-bold text-foreground">₹ {formatAmount(kpiMetrics.transactionTotal)} ({txShare.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-muted font-medium">Renewals Outlay:</span>
                <span className="font-bold text-foreground">₹ {formatAmount(kpiMetrics.renewalTotal)} ({rnShare.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="text-xs font-bold text-emerald-400">
              +{kpiMetrics.growthPercent}% Capital Growth ({kpiMetrics.multiplier}x)
            </div>
          </div>

          <div className="w-full h-3 bg-elevated rounded-full overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-blue-500 transition-all duration-700"
              style={{ width: `${baseShare}%` }}
              title={`Initial Purchase: ₹ ${formatAmount(kpiMetrics.baseCost)}`}
            ></div>
            <div
              className="h-full bg-amber-500 transition-all duration-700"
              style={{ width: `${txShare}%` }}
              title={`Add-on Transactions: ₹ ${formatAmount(kpiMetrics.transactionTotal)}`}
            ></div>
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${rnShare}%` }}
              title={`Renewals Outlay: ₹ ${formatAmount(kpiMetrics.renewalTotal)}`}
            ></div>
          </div>
        </div>
      </AppCard>

      {/* 2. 6 EXECUTIVE KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Lifetime TCO */}
        <AppCard className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Spend (TCO)</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹ {formatAmount(kpiMetrics.lifetimeTCO)}
            </div>
            <p className="text-[10px] text-muted mt-0.5">Cumulative till date</p>
          </div>
        </AppCard>

        {/* KPI 2: Initial Baseline */}
        <AppCard className="p-4 border border-border bg-surface rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Initial Purchase</span>
            <Receipt className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground font-mono">
              ₹ {formatAmount(kpiMetrics.baseCost)}
            </div>
            <p className="text-[10px] text-muted mt-0.5">Base contract cost</p>
          </div>
        </AppCard>

        {/* KPI 3: Mid-Year Add-ons */}
        <AppCard className="p-4 border border-border bg-surface rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mid-Year Add-ons</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground font-mono">
              ₹ {formatAmount(kpiMetrics.transactionTotal)}
            </div>
            <p className="text-[10px] text-muted mt-0.5">{transactions.length} mid-term changes</p>
          </div>
        </AppCard>

        {/* KPI 4: Renewal Outlays */}
        <AppCard className="p-4 border border-border bg-surface rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Renewals Outlay</span>
            <CalendarClock className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground font-mono">
              ₹ {formatAmount(kpiMetrics.renewalTotal)}
            </div>
            <p className="text-[10px] text-muted mt-0.5">{renewals.length} renewal cycles</p>
          </div>
        </AppCard>

        {/* KPI 5: Growth Multiplier */}
        <AppCard className="p-4 border border-border bg-surface rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Spend Multiplier</span>
            <TrendingUp className="h-4 w-4 text-theme-icon" />
          </div>
          <div>
            <div className="text-xl font-black text-theme-icon font-mono">
              {kpiMetrics.multiplier}x
            </div>
            <p className="text-[10px] text-muted mt-0.5">vs Acquisition baseline</p>
          </div>
        </AppCard>

        {/* KPI 6: Annualized Run Rate */}
        <AppCard className="p-4 border border-border bg-surface rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">Annual Run Rate</span>
            <Activity className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground font-mono">
              ₹ {formatAmount(kpiMetrics.annualRunRate)}
            </div>
            <p className="text-[10px] text-muted mt-0.5">Effective cost / year</p>
          </div>
        </AppCard>
      </div>

      {/* 3. INTERACTIVE CUMULATIVE SPEND PROGRESSION CURVE */}
      <AppCard className="p-6 md:p-8 border border-border bg-surface space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Cumulative Capital Progression Curve
            </h3>
            <p className="text-xs text-muted mt-1">
              Visual trajectory of cumulative expenditures as milestones, add-ons, and renewals are logged over time.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
              <Activity className="h-3.5 w-3.5" />
              <span>{chartData.length} Financial Milestone Events</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTCO" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? "#e2e8f0" : "#334155"} vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke={isLightMode ? "#64748b" : "#94a3b8"} 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: isLightMode ? "#cbd5e1" : "#475569" }}
              />
              <YAxis 
                stroke={isLightMode ? "#64748b" : "#94a3b8"} 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: isLightMode ? "#cbd5e1" : "#475569" }}
                tickFormatter={(v) => `₹ ${(v / 100000).toFixed(1)}L`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-surface border border-border rounded-xl shadow-xl text-xs space-y-1.5 z-50">
                        <div className="font-bold text-foreground">{data.label}</div>
                        <div className="text-muted flex items-center gap-2">
                          <span>Date:</span> <strong className="text-foreground">{data.date}</strong>
                        </div>
                        <div className="text-muted flex items-center gap-2">
                          <span>Milestone Outlay:</span> 
                          <strong className="text-theme-icon font-mono">+₹ {formatAmount(data.eventAmount)}</strong>
                        </div>
                        <div className="pt-1 border-t border-border flex items-center gap-2">
                          <span className="font-semibold text-emerald-500">Cumulative TCO:</span>
                          <strong className="text-emerald-500 font-mono text-sm">₹ {formatAmount(data.cumulativeTCO)}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="cumulativeTCO" 
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorTCO)" 
                activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </AppCard>

      {/* 4. CHRONOLOGICAL FINANCIAL SPEND EVENT LEDGER */}
      <AppCard className="p-6 md:p-8 border border-border bg-surface space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-theme-icon" />
              Chronological Financial Event Ledger & Audit Stream
            </h3>
            <p className="text-xs text-muted mt-1">
              Line-by-line historical breakdown from purchase date with calculated running balance total.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center bg-elevated p-1 rounded-xl border border-border">
              {[
                { key: 'all', label: 'All Events' },
                { key: 'acquisition', label: 'Acquisition' },
                { key: 'transaction', label: 'Add-ons' },
                { key: 'renewal', label: 'Renewals' }
              ].map((f) => (
                <AppButton
                  key={f.key}
                  type="button"
                  variant={selectedFilter === f.key ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedFilter(f.key as any)}
                  className="h-7 text-xs font-semibold px-3"
                >
                  {f.label}
                </AppButton>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <AppInput
                placeholder="Search PO, author, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-64 h-8 text-xs pl-8"
              />
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <AppTable className="w-full text-left text-xs whitespace-nowrap">
            <AppTableHeader>
              <AppTableRow className="border-b border-border text-muted font-bold uppercase tracking-wider">
                <AppTableHead className="pb-3 pr-3">#</AppTableHead>
                <AppTableHead className="pb-3 px-3">Date</AppTableHead>
                <AppTableHead className="pb-3 px-3">Milestone / Event</AppTableHead>
                <AppTableHead className="pb-3 px-3">Category</AppTableHead>
                <AppTableHead className="pb-3 px-3">PO / Ref #</AppTableHead>
                <AppTableHead className="pb-3 px-3 text-right">Delta Outlay (+₹)</AppTableHead>
                <AppTableHead className="pb-3 px-3 text-right text-emerald-500 font-bold">Running Balance (₹)</AppTableHead>
                <AppTableHead className="pb-3 px-3 text-center">% Share</AppTableHead>
                <AppTableHead className="pb-3 px-3">Logged By</AppTableHead>
                <AppTableHead className="pb-3 pl-3 text-right">Proof</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody className="divide-y divide-border/60">
              {filteredEvents.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={10} className="py-12 text-center text-muted">
                    No financial events found matching filter criteria.
                  </AppTableCell>
                </AppTableRow>
              ) : (
                filteredEvents.map((evt, idx) => {
                  const isInitial = evt.source === 'acquisition';
                  const isRenewal = evt.source === 'renewal';
                  const isTx = evt.source === 'transaction';

                  return (
                    <AppTableRow key={evt.id} className="hover:bg-elevated/40 transition-colors">
                      <AppTableCell className="py-3.5 pr-3 font-bold text-muted">{idx + 1}</AppTableCell>
                      
                      <AppTableCell className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted" />
                          <span>{evt.displayDate}</span>
                        </div>
                      </AppTableCell>

                      <AppTableCell className="py-3.5 px-3 max-w-xs truncate">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            {evt.title}
                          </div>
                          <div className="text-[11px] text-muted truncate">{evt.description}</div>
                          {evt.notes && (
                            <div className="text-[10px] text-muted italic truncate">Note: {evt.notes}</div>
                          )}
                        </div>
                      </AppTableCell>

                      <AppTableCell className="py-3.5 px-3">
                        <AppBadge
                          variant={
                            isInitial ? 'accent' :
                            isRenewal ? 'success' :
                            'warning'
                          }
                        >
                          {evt.type}
                        </AppBadge>
                      </AppTableCell>

                      <AppTableCell className="py-3.5 px-3 font-mono font-medium text-foreground">
                        {evt.poNumber ? (
                          <span className="px-2 py-0.5 rounded bg-elevated border border-border">
                            {evt.poNumber}
                          </span>
                        ) : '-'}
                      </AppTableCell>

                      <AppTableCell className="py-3.5 px-3 text-right font-mono font-bold text-foreground">
                        +₹ {formatAmount(evt.amount)}
                      </AppTableCell>

                      <AppTableCell className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2.5 rounded-lg">
                        ₹ {formatAmount(evt.runningTotal)}
                      </AppTableCell>

                      <AppTableCell className="py-3.5 px-3 text-center">
                        <span className="font-semibold text-muted">
                          {evt.percentOfTotal.toFixed(1)}%
                        </span>
                      </AppTableCell>

                      <AppTableCell className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-muted">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{evt.user || 'System'}</span>
                        </div>
                      </AppTableCell>

                      <AppTableCell className="py-3.5 pl-3 text-right">
                        {evt.attachmentUrl ? (
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(evt.attachmentUrl!)}
                            className="text-theme-icon hover:underline text-xs h-7 px-2"
                            title="Download Invoice / Proof"
                            leftIcon={<Paperclip className="h-3 w-3" />}
                          >
                            Proof
                          </AppButton>
                        ) : (
                          <span className="text-muted text-[11px]">-</span>
                        )}
                      </AppTableCell>
                    </AppTableRow>
                  );
                })
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </AppCard>
    </div>
  );
}
