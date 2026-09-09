"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Calendar, 
  FileText, 
  Loader2, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Paperclip, 
  Download, 
  Edit3, 
  CheckCircle2, 
  Layers,
  X
} from "lucide-react";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc-client";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { createClient } from "@/utils/supabase/client";

interface AMCTransactionsTabProps {
  amcId: string;
  isLightMode: boolean;
  onUpdate: () => void;
  currency?: string;
  baseContractCost?: number | string;
  baseLicenses?: number | string;
  solutionLineItems?: Array<{ id: string; resolutionName?: string; qty?: number; netAmount?: number }>;
}

export function AMCTransactionsTab({
  amcId,
  isLightMode,
  onUpdate,
  currency = 'INR',
  baseContractCost = 0,
  baseLicenses = 0,
  solutionLineItems = []
}: AMCTransactionsTabProps) {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState("Add-on Licenses");
  const [selectedLineItemId, setSelectedLineItemId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [cost, setCost] = useState("");
  const [licensesAdded, setLicensesAdded] = useState("0");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [existingAttachmentPath, setExistingAttachmentPath] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [amcId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('amc_transactions')
        .select('*, user_master(full_name)')
        .eq('amc_id', amcId)
        .eq('is_deleted', false)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (e: any) {
      console.error("Error fetching transactions:", e);
    } finally {
      setLoading(false);
    }
  };

  const numericBaseCost = typeof baseContractCost === 'string' ? parseFloat(baseContractCost) || 0 : baseContractCost || 0;
  const numericBaseLicenses = typeof baseLicenses === 'string' ? parseInt(baseLicenses) || 0 : baseLicenses || 0;

  // Cumulative Analytics
  const summaryMetrics = useMemo(() => {
    let totalAddedCost = 0;
    let totalAddedLicenses = 0;
    let addonLicensesCost = 0;
    let customizationCost = 0;
    let supportCost = 0;

    transactions.forEach((tx) => {
      const c = parseFloat(tx.cost) || 0;
      totalAddedCost += c;
      const lic = parseInt(tx.licenses_added) || 0;
      totalAddedLicenses += lic;

      if (tx.transaction_type === 'Add-on Licenses') addonLicensesCost += c;
      else if (tx.transaction_type === 'Customization (OTC)' || tx.transaction_type === 'Customization') customizationCost += c;
      else if (tx.transaction_type === 'Support Services') supportCost += c;
    });

    const revisedTotalCost = numericBaseCost + totalAddedCost;
    const revisedTotalLicenses = numericBaseLicenses + totalAddedLicenses;
    const costGrowthPercent = numericBaseCost > 0 ? ((totalAddedCost / numericBaseCost) * 100).toFixed(1) : "0";

    return {
      totalAddedCost,
      totalAddedLicenses,
      revisedTotalCost,
      revisedTotalLicenses,
      costGrowthPercent,
      transactionCount: transactions.length,
      addonLicensesCost,
      customizationCost,
      supportCost
    };
  }, [transactions, numericBaseCost, numericBaseLicenses]);

  const handleAddOrEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let targetLineItemName = "";
      if (selectedLineItemId) {
        const item = solutionLineItems.find(i => i.id === selectedLineItemId);
        targetLineItemName = item?.resolutionName || "Line Item";
      }

      const txCost = parseFloat(cost) || 0;
      const txLicenses = type === 'Add-on Licenses' ? parseInt(licensesAdded) || 0 : 0;
      const exRate = parseFloat(exchangeRate) || 1.0;

      let uploadedFilePath = existingAttachmentPath;

      // Handle file upload if provided
      if (attachedFile) {
        const safeName = attachedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${amcId}/[TX_${Math.random().toString(36).substring(2, 7)}]_${safeName}`;
        const { error: uploadErr } = await supabase.storage.from('amc-attachments').upload(storagePath, attachedFile);
        if (uploadErr) throw uploadErr;
        uploadedFilePath = storagePath;
      }

      const payload: any = {
        amc_id: amcId,
        transaction_type: type,
        line_item_id: selectedLineItemId || null,
        line_item_name: targetLineItemName || null,
        po_number: poNumber || null,
        cost: txCost,
        licenses_added: txLicenses,
        transaction_date: transactionDate,
        notes: notes || null,
        attachment_file_path: uploadedFilePath || null,
        base_currency: 'INR',
        exchange_rate: exRate,
        base_currency_amount: txCost * exRate
      };

      if (!editId) {
        payload.created_by = user.id;
      }

      const res = await saveAMCEntity("amc_transactions", payload, editId || undefined);
      if (!res.success) throw new Error(res.error);

      // Reset form
      handleResetForm();

      // Refresh list
      const { data: updatedTxList } = await supabase
        .from('amc_transactions')
        .select('*')
        .eq('amc_id', amcId)
        .eq('is_deleted', false);
      
      const newTotalLicensesAdded = (updatedTxList || []).reduce((sum, t) => sum + (parseInt(t.licenses_added) || 0), 0);
      const newMasterTotalLicenses = numericBaseLicenses + newTotalLicensesAdded;

      // Auto-Sync Parent software_amc Total Licenses
      await saveAMCEntity("software_amc", { total_licenses: newMasterTotalLicenses }, amcId);

      await fetchTransactions();
      onUpdate(); // Trigger parent page refresh
      toast.success(editId ? "Transaction updated successfully!" : "Transaction logged & master capacity updated!");
    } catch (e: any) {
      toast.error("Error saving transaction: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tx: any) => {
    setEditId(tx.id);
    setType(tx.transaction_type || "Add-on Licenses");
    setSelectedLineItemId(tx.line_item_id || "");
    setPoNumber(tx.po_number || "");
    setCost(String(tx.cost || ""));
    setLicensesAdded(String(tx.licenses_added || "0"));
    setTransactionDate(tx.transaction_date ? new Date(tx.transaction_date).toISOString().split('T')[0] : "");
    setNotes(tx.notes || "");
    setExchangeRate(String(tx.exchange_rate || "1.0"));
    setExistingAttachmentPath(tx.attachment_file_path || null);
    setAttachedFile(null);
  };

  const handleResetForm = () => {
    setEditId(null);
    setType("Add-on Licenses");
    setSelectedLineItemId("");
    setPoNumber("");
    setCost("");
    setLicensesAdded("0");
    setNotes("");
    setExchangeRate("1.0");
    setAttachedFile(null);
    setExistingAttachmentPath(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction? (Master contract licenses will be automatically recalculated)")) return;
    try {
      const res = await deleteAMCEntity("amc_transactions", id, true);
      if (!res.success) throw new Error(res.error);

      // Recalculate remaining licenses
      const { data: remainingTx } = await supabase
        .from('amc_transactions')
        .select('*')
        .eq('amc_id', amcId)
        .eq('is_deleted', false);

      const remainingLicensesAdded = (remainingTx || []).reduce((sum, t) => sum + (parseInt(t.licenses_added) || 0), 0);
      const newMasterTotalLicenses = numericBaseLicenses + remainingLicensesAdded;

      // Auto-sync parent software_amc
      await saveAMCEntity("software_amc", { total_licenses: newMasterTotalLicenses }, amcId);

      await fetchTransactions();
      onUpdate();
      toast.success("Transaction deleted & master licenses updated.");
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Cumulative Financial & Seat Impact Summary Card */}
      <div className="p-6 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-theme-btn-primary/10 text-theme-icon">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Mid-Year Transactions & Capacity Ledger</h3>
              <p className="text-xs text-muted">Log add-on licenses, customizations (OTC), and support expansion.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20">
              {summaryMetrics.transactionCount} Mid-Year Change{summaryMetrics.transactionCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* 4 Summary Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Box 1: Original vs Revised Cost */}
          <div className="p-3.5 rounded-xl border bg-elevated/40 border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Revised Total Spend</span>
            <div className="text-lg font-black text-foreground font-mono">
              {currency} {summaryMetrics.revisedTotalCost.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted flex items-center gap-1">
              <span>Base: {currency} {numericBaseCost.toFixed(0)}</span>
              {summaryMetrics.totalAddedCost > 0 && (
                <span className="text-success font-bold font-mono">+{currency} {summaryMetrics.totalAddedCost.toFixed(0)}</span>
              )}
            </div>
          </div>

          {/* Box 2: Original vs Revised Seats */}
          <div className="p-3.5 rounded-xl border bg-elevated/40 border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Active License Capacity</span>
            <div className="text-lg font-black text-foreground">
              {summaryMetrics.revisedTotalLicenses} <span className="text-xs font-normal text-muted">Seats</span>
            </div>
            <div className="text-[11px] text-muted">
              <span>Base: {numericBaseLicenses}</span>
              {summaryMetrics.totalAddedLicenses > 0 && (
                <span className="text-theme-icon font-bold ml-1">+{summaryMetrics.totalAddedLicenses} Add-ons</span>
              )}
            </div>
          </div>

          {/* Box 3: Customization & OTC */}
          <div className="p-3.5 rounded-xl border bg-elevated/40 border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">OTC Customizations</span>
            <div className="text-lg font-black text-foreground font-mono">
              {currency} {summaryMetrics.customizationCost.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted">Scope expansion & dev</div>
          </div>

          {/* Box 4: Spend Growth % */}
          <div className="p-3.5 rounded-xl border bg-elevated/40 border-border/60 space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Mid-Year Expansion</span>
            <div className="text-lg font-black text-theme-icon flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>+{summaryMetrics.costGrowthPercent}%</span>
            </div>
            <div className="text-[11px] text-muted">Incremental budget impact</div>
          </div>
        </div>
      </div>

      {/* 2. Add / Edit Transaction Form */}
      <AppCard className="p-6 border border-border bg-surface shadow-[var(--shadow-ambient)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-theme-icon" />
            {editId ? "Edit Transaction Record" : "Log Mid-Year Transaction"}
          </h4>
          {editId && (
            <AppButton type="button" variant="ghost" size="sm" onClick={handleResetForm} className="text-muted hover:text-foreground text-xs">
              Cancel Edit
            </AppButton>
          )}
        </div>

        <form onSubmit={handleAddOrEditTransaction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Transaction Type */}
            <div className="space-y-2">
              <label className="theme-label">Transaction Type <span className="text-danger">*</span></label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)} 
                required 
                className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none border bg-elevated text-foreground border-border cursor-pointer"
              >
                <option value="Add-on Licenses">Add-on Licenses</option>
                <option value="Customization (OTC)">Customization (OTC)</option>
                <option value="Support Services">Support Services</option>
                <option value="Infrastructure Add-on">Infrastructure Add-on</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Target Line Item / Module */}
            <div className="space-y-2">
              <label className="theme-label">Target Line Item / Module</label>
              <select 
                value={selectedLineItemId} 
                onChange={(e) => setSelectedLineItemId(e.target.value)} 
                className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none border bg-elevated text-foreground border-border cursor-pointer"
              >
                <option value="">-- General / Headwise Contract --</option>
                {solutionLineItems.map((item, idx) => (
                  <option key={item.id} value={item.id}>
                    Item #{idx + 1}: {item.resolutionName || "Unnamed Solution"} {item.qty ? `(${item.qty} Qty)` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <label className="theme-label">Transaction Date <span className="text-danger">*</span></label>
              <AppInput type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required className="h-11" />
            </div>

            {/* PO Number */}
            <div className="space-y-2">
              <label className="theme-label">PO / Reference Number</label>
              <AppInput value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g., PO-2026-ADD01" className="h-11" />
            </div>

            {/* Cost */}
            <div className="space-y-2">
              <label className="theme-label">Total Cost <span className="text-danger">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{currency}</span>
                <AppInput type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="pl-12 h-11" placeholder="0.00" />
              </div>
            </div>

            {/* Licenses Added */}
            {type === 'Add-on Licenses' && (
              <div className="space-y-2">
                <label className="theme-label">Licenses / Seats Added <span className="text-danger">*</span></label>
                <AppInput type="number" min="1" value={licensesAdded} onChange={(e) => setLicensesAdded(e.target.value)} required className="h-11" placeholder="e.g., 10" />
              </div>
            )}

            {/* Exchange Rate (if foreign currency) */}
            {currency !== 'INR' && (
              <div className="space-y-2">
                <label className="theme-label">Exchange Rate (to INR) <span className="text-danger">*</span></label>
                <AppInput type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} required className="h-11" />
              </div>
            )}

            {/* Attachment File Input */}
            <div className="space-y-2 md:col-span-2">
              <label className="theme-label">Attachment (PO / Invoice / Approval)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                  className="flex-1 w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-theme-btn-primary/10 file:text-theme-icon hover:file:bg-theme-btn-primary/20 cursor-pointer border border-border rounded-xl h-11 bg-elevated pt-1"
                />
                {existingAttachmentPath && !attachedFile && (
                  <span className="text-xs text-muted truncate max-w-[150px]" title={existingAttachmentPath}>
                    Current file attached
                  </span>
                )}
              </div>
            </div>

            {/* Notes / Remarks */}
            <div className={`space-y-2 ${type === 'Add-on Licenses' ? 'lg:col-span-4' : 'lg:col-span-2'}`}>
              <label className="theme-label">Description / Remarks</label>
              <AppInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for mid-year change, business justification..." className="h-11" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {editId && (
              <AppButton type="button" variant="outline" onClick={handleResetForm} disabled={isSubmitting}>
                Cancel
              </AppButton>
            )}
            <AppButton 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting} 
              leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              className="min-w-[180px]"
            >
              {isSubmitting ? "Saving & Syncing..." : editId ? "Update Transaction" : "Save & Sync Master"}
            </AppButton>
          </div>
        </form>
      </AppCard>

      {/* 3. Transaction Ledger History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-theme-icon" />
            Logged Transaction History ({transactions.length})
          </h4>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <ChandakLoader size="sm" title="Loading transactions..." />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-muted italic rounded-xl border bg-elevated/40 border-border">
            No mid-year transactions logged for this contract yet. Use the form above to add ad-hoc licenses or customizations.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <AppCard 
                key={tx.id} 
                className="p-4 rounded-xl border border-border bg-surface hover:border-theme-btn-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20">
                      {tx.transaction_type}
                    </span>
                    {tx.line_item_name && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-elevated text-foreground border border-border">
                        🎯 {tx.line_item_name}
                      </span>
                    )}
                    {tx.po_number && (
                      <span className="text-xs font-semibold text-muted">
                        PO: <strong className="text-foreground">{tx.po_number}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>Date: <strong className="text-foreground">{new Date(tx.transaction_date).toLocaleDateString()}</strong></span>
                    {tx.licenses_added > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-theme-icon">+{tx.licenses_added} Seats Added</span>
                      </>
                    )}
                    {tx.notes && (
                      <>
                        <span>•</span>
                        <span className="italic">"{tx.notes}"</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-base font-mono text-success">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(tx.cost)}
                    </div>
                    {tx.exchange_rate && tx.exchange_rate !== 1 && tx.base_currency_amount && (
                      <div className="text-[10px] text-muted font-mono">
                        Base: ₹ {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(tx.base_currency_amount)}
                      </div>
                    )}
                    <div className="text-[10px] text-muted">Logged by {tx.user_master?.full_name || 'System'}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {tx.attachment_file_path && (
                      <AppButton 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          const url = supabase.storage.from('amc-attachments').getPublicUrl(tx.attachment_file_path).data.publicUrl;
                          window.open(url, '_blank');
                        }}
                        title="Download Document"
                        className="h-8 w-8 p-0 text-theme-icon hover:bg-theme-btn-primary/10"
                      >
                        <Download className="h-4 w-4" />
                      </AppButton>
                    )}
                    <AppButton 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(tx)} 
                      title="Edit Transaction"
                      className="h-8 w-8 p-0 text-muted hover:text-foreground"
                    >
                      <Edit3 className="h-4 w-4" />
                    </AppButton>
                    <AppButton 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(tx.id)} 
                      title="Delete Transaction"
                      className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </AppButton>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
