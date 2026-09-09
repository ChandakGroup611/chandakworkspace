"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Receipt,
  X,
  CreditCard,
  Building2,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc-client";
import { createClient } from "@/utils/supabase/client";
import ChandakLoader from "@/components/ui/ChandakLoader";

interface AMCPaymentsTabProps {
  amcId: string;
  isLightMode: boolean;
  currency?: string;
}

export function AMCPaymentsTab({ amcId, isLightMode, currency = 'INR' }: AMCPaymentsTabProps) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Invoice Form State
  const [formDescription, setFormDescription] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaymentType, setFormPaymentType] = useState("Milestone");
  const [formPaymentMethod, setFormPaymentMethod] = useState("NEFT / RTGS");

  useEffect(() => {
    fetchInvoices();
  }, [amcId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('amc_invoices')
        .select('*, user_master(full_name)')
        .eq('amc_id', amcId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!formDueDate) {
      toast.error("Please select a due date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await saveAMCEntity("amc_invoices", {
        amc_id: amcId,
        description: formDescription || "Scheduled Payment",
        invoice_number: formInvoiceNumber || null,
        amount: amt,
        due_date: formDueDate,
        payment_type: formPaymentType,
        payment_method: formPaymentMethod,
        status: 'Pending',
        created_by: user?.id || null
      });

      if (!res.success) throw new Error(res.error);
      toast.success("Payment schedule created successfully.");
      setShowAddModal(false);
      setFormDescription("");
      setFormInvoiceNumber("");
      setFormAmount("");
      setFormDueDate("");
      await fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment schedule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await saveAMCEntity("amc_invoices", {
        status: 'Paid', 
        payment_date: new Date().toISOString().split('T')[0] 
      }, id);
      if (!res.success) throw new Error(res.error);
      toast.success("Payment marked as paid.");
      await fetchInvoices();
    } catch (e: any) {
      toast.error("Error marking as paid: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await deleteAMCEntity("amc_invoices", id, true);
      if (!res.success) throw new Error(res.error);
      toast.success("Invoice removed.");
      await fetchInvoices();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  // Summary Metrics
  const summary = useMemo(() => {
    let totalScheduled = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    const now = new Date();

    invoices.forEach(inv => {
      const amt = parseFloat(inv.amount) || 0;
      totalScheduled += amt;
      if (inv.status === 'Paid') {
        totalPaid += amt;
      } else {
        totalPending += amt;
        if (inv.due_date && new Date(inv.due_date) < now) {
          totalOverdue += amt;
          overdueCount++;
        }
      }
    });

    return {
      totalScheduled,
      totalPaid,
      totalPending,
      totalOverdue,
      overdueCount,
      paidPercent: totalScheduled > 0 ? ((totalPaid / totalScheduled) * 100).toFixed(1) : "0.0"
    };
  }, [invoices]);

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'Paid') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-success/15 text-success border border-success/30 flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" /> Paid
        </span>
      );
    }
    const isOverdue = dueDate && new Date(dueDate) < new Date();
    if (isOverdue) {
      const diffDays = Math.ceil((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-danger/15 text-danger border border-danger/30 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> {diffDays}d Overdue
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-warning/15 text-warning border border-warning/30 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-theme-btn-primary/10 text-theme-icon">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Payment Schedule & Invoicing Ledger</h3>
              <p className="text-xs text-muted">Track upcoming payouts, release milestones, and record payment confirmations.</p>
            </div>
          </div>
        </div>
        <AppButton
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="h-4 w-4" />}
          className="h-9 text-xs font-semibold shrink-0"
        >
          Schedule Payment
        </AppButton>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AppCard className="p-4 border border-border bg-surface rounded-xl space-y-1">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Scheduled</span>
          <div className="text-xl font-bold text-foreground font-mono">
            ₹ {summary.totalScheduled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted">{invoices.length} Payment Schedule(s)</span>
        </AppCard>

        <AppCard className="p-4 border border-success/30 bg-success/5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold text-success uppercase tracking-wider">Total Disbursed</span>
          <div className="text-xl font-bold text-success font-mono">
            ₹ {summary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted">{summary.paidPercent}% Released</span>
        </AppCard>

        <AppCard className="p-4 border border-warning/30 bg-warning/5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold text-warning uppercase tracking-wider">Pending Outlay</span>
          <div className="text-xl font-bold text-warning font-mono">
            ₹ {summary.totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-muted">Awaiting Release</span>
        </AppCard>

        <AppCard className="p-4 border border-danger/30 bg-danger/5 rounded-xl space-y-1">
          <span className="text-[11px] font-bold text-danger uppercase tracking-wider">Overdue Payments</span>
          <div className="text-xl font-bold text-danger font-mono">
            ₹ {summary.totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-danger font-semibold">{summary.overdueCount} Overdue Item(s)</span>
        </AppCard>
      </div>

      {/* Invoice Ledger */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center p-8"><ChandakLoader size="sm" title="Loading invoices..." /></div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center text-muted italic rounded-2xl border bg-elevated/40 border-border space-y-2">
            <Receipt className="h-8 w-8 text-muted mx-auto opacity-50" />
            <p className="font-semibold text-foreground text-sm">No scheduled invoices or payments found.</p>
            <p className="text-xs">Click &ldquo;Schedule Payment&rdquo; to record payment tranches or milestones.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <AppCard 
                key={inv.id} 
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border bg-surface hover:border-theme-btn-primary/40 transition-all rounded-xl shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    {getStatusBadge(inv.status, inv.due_date)}
                    <span className="font-bold text-sm text-foreground">{inv.description || "Scheduled Tranche"}</span>
                    {inv.payment_type && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20">
                        {inv.payment_type}
                      </span>
                    )}
                    {inv.payment_method && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-elevated text-muted border border-border">
                        {inv.payment_method}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted flex items-center gap-4 flex-wrap">
                    <span>Due: <strong className="text-foreground">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</strong></span>
                    {inv.invoice_number && <span>Invoice #: <strong className="text-foreground font-mono">{inv.invoice_number}</strong></span>}
                    {inv.payment_date && <span className="text-success font-semibold">Paid On: {new Date(inv.payment_date).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                  <div className="text-right">
                    <div className="font-black text-lg font-mono text-foreground">
                      ₹ {(parseFloat(inv.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {inv.status === 'Pending' && (
                      <AppButton 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleMarkPaid(inv.id)}
                        disabled={processingId === inv.id}
                        className="h-8 text-xs font-bold shadow-sm"
                      >
                        {processingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Paid"}
                      </AppButton>
                    )}
                    <AppButton 
                      variant="secondary" 
                      onClick={() => handleDelete(inv.id)} 
                      className="p-2 h-8 w-8 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AppButton>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-surface/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl p-6 bg-surface border border-border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-theme-btn-primary/10 text-theme-icon">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Schedule Payment / Invoice</h3>
              </div>
              <AppButton variant="ghost" size="sm" onClick={() => setShowAddModal(false)} className="p-1 rounded-full">
                <X className="h-5 w-5" />
              </AppButton>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Tranche Description</label>
                <AppInput 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)} 
                  placeholder="e.g., Phase 1 Advance / Annual Subscription Renewal Tranche"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Amount (₹)</label>
                  <AppInput 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formAmount} 
                    onChange={(e) => setFormAmount(e.target.value)} 
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Due / Target Date</label>
                  <AppInput 
                    type="date"
                    value={formDueDate} 
                    onChange={(e) => setFormDueDate(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Invoice / PO Number</label>
                  <AppInput 
                    value={formInvoiceNumber} 
                    onChange={(e) => setFormInvoiceNumber(e.target.value)} 
                    placeholder="e.g., INV-2026-0089"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-xs font-medium outline-none"
                  >
                    <option value="NEFT / RTGS">NEFT / RTGS</option>
                    <option value="Corporate Credit Card">Corporate Credit Card</option>
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="Cheque / Draft">Cheque / Draft</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <AppButton type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </AppButton>
                <AppButton type="submit" variant="primary" size="sm" disabled={isSubmitting} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                  {isSubmitting ? "Scheduling..." : "Schedule Payment"}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
