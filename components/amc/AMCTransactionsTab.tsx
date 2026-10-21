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
  Eye,
  Edit3, 
  CheckCircle2, 
  Layers,
  X
} from "lucide-react";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc-client";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { createClient } from "@/utils/supabase/client";
import { confirmAction } from "@/components/ui/feedback/confirm";
import { formatDate } from "@/components/ui/data";

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
    if (!(await confirmAction("Are you sure you want to delete this transaction? (Master contract licenses will be automatically recalculated)"))) return;
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
      <div className="p-6 rounded-lg border bg-surface border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent-soft text-accent-soft-text">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Mid-year transactions & capacity ledger</h3>
              <p className="text-xs text-muted">Log add-on licenses, customizations (OTC), and support expansion.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-accent-soft text-accent-soft-text border border-border-active">
              {summaryMetrics.transactionCount} Mid-year change{summaryMetrics.transactionCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* 4 Summary Stat Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Box 1: Original vs Revised Cost */}
          <div className="p-3.5 rounded-lg border bg-sunken border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted">Revised total spend</span>
            <div className="text-lg font-semibold text-foreground font-mono">
              {currency} {summaryMetrics.revisedTotalCost.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted flex items-center gap-1">
              <span>Base: {currency} {numericBaseCost.toFixed(0)}</span>
              {summaryMetrics.totalAddedCost > 0 && (
                <span className="text-success-text font-semibold font-mono">+{currency} {summaryMetrics.totalAddedCost.toFixed(0)}</span>
              )}
            </div>
          </div>

          {/* Box 2: Original vs Revised Seats */}
          <div className="p-3.5 rounded-lg border bg-sunken border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted">Active license capacity</span>
            <div className="text-lg font-semibold text-foreground">
              {summaryMetrics.revisedTotalLicenses} <span className="text-xs font-normal text-muted">Seats</span>
            </div>
            <div className="text-[11px] text-muted">
              <span>Base: {numericBaseLicenses}</span>
              {summaryMetrics.totalAddedLicenses > 0 && (
                <span className="text-accent-soft-text font-semibold ml-1">+{summaryMetrics.totalAddedLicenses} Add-ons</span>
              )}
            </div>
          </div>

          {/* Box 3: Customization & OTC */}
          <div className="p-3.5 rounded-lg border bg-sunken border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted">OTC customizations</span>
            <div className="text-lg font-semibold text-foreground font-mono">
              {currency} {summaryMetrics.customizationCost.toFixed(2)}
            </div>
            <div className="text-[11px] text-muted">Scope expansion & dev</div>
          </div>

          {/* Box 4: Spend Growth % */}
          <div className="p-3.5 rounded-lg border bg-sunken border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted">Mid-year expansion</span>
            <div className="text-lg font-semibold text-accent-soft-text flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>+{summaryMetrics.costGrowthPercent}%</span>
            </div>
            <div className="text-[11px] text-muted">Incremental budget impact</div>
          </div>
        </div>
      </div>

      {/* 2. Add / Edit Transaction Form */}
      <AppCard className="p-6 border border-border bg-surface shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent-soft-text" />
            {editId ? "Edit Transaction Record" : "Log Mid-Year Transaction"}
          </h4>
          {editId && (
            <AppButton type="button" variant="ghost" size="sm" onClick={handleResetForm} className="text-muted hover:text-foreground text-xs">
              Cancel edit
            </AppButton>
          )}
        </div>

        <form onSubmit={handleAddOrEditTransaction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Transaction Type */}
            <div className="space-y-2">
              <label className="theme-label">Transaction type <span className="text-danger-text">*</span></label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)} 
                required 
                className="w-full h-11 px-4 rounded-lg text-sm transition-all outline-none border bg-elevated text-foreground border-border cursor-pointer"
              >
                <option value="Add-on Licenses">Add-on licenses</option>
                <option value="Customization (OTC)">Customization (OTC)</option>
                <option value="Support Services">Support services</option>
                <option value="Infrastructure Add-on">Infrastructure Add-on</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Target Line Item / Module */}
            <div className="space-y-2">
              <label className="theme-label">Target line item / module</label>
              <select 
                value={selectedLineItemId} 
                onChange={(e) => setSelectedLineItemId(e.target.value)} 
                className="w-full h-11 px-4 rounded-lg text-sm transition-all outline-none border bg-elevated text-foreground border-border cursor-pointer"
              >
                <option value="">General / headwise contract</option>
                {solutionLineItems.map((item, idx) => (
                  <option key={item.id} value={item.id}>
                    Item #{idx + 1}: {item.resolutionName || "Unnamed Solution"} {item.qty ? `(${item.qty} Qty)` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <label className="theme-label">Transaction date <span className="text-danger-text">*</span></label>
              <AppInput type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required className="h-11" />
            </div>

            {/* PO Number */}
            <div className="space-y-2">
              <label className="theme-label">PO / reference number</label>
              <AppInput value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g., PO-2026-ADD01" className="h-11" />
            </div>

            {/* Cost */}
            <div className="space-y-2">
              <label className="theme-label">Total cost <span className="text-danger-text">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">{currency}</span>
                <AppInput type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="pl-12 h-11" placeholder="0.00" />
              </div>
            </div>

            {/* Licenses Added */}
            {type === 'Add-on Licenses' && (
              <div className="space-y-2">
                <label className="theme-label">Licenses / seats added <span className="text-danger-text">*</span></label>
                <AppInput type="number" min="1" value={licensesAdded} onChange={(e) => setLicensesAdded(e.target.value)} required className="h-11" placeholder="e.g., 10" />
              </div>
            )}

            {/* Exchange Rate (if foreign currency) */}
            {currency !== 'INR' && (
              <div className="space-y-2">
                <label className="theme-label">Exchange rate (to INR) <span className="text-danger-text">*</span></label>
                <AppInput type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} required className="h-11" />
              </div>
            )}

            {/* Attachment File Input */}
            <div className="space-y-2 md:col-span-2">
              <label className="theme-label">Attachment (PO / invoice / approval)</label>
              <div className="flex flex-col gap-2">
                <input 
                  type="file" 
                  onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-soft file:text-accent-soft-text hover:file:bg-accent-soft cursor-pointer border border-border rounded-lg h-11 bg-elevated pt-1"
                />
                {attachedFile && (
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <Paperclip className="h-3.5 w-3.5 text-accent-soft-text shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate text-foreground" title={attachedFile.name}>
                          {attachedFile.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {(attachedFile.size / 1024).toFixed(1)} KB • staged for upload
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = URL.createObjectURL(attachedFile);
                          window.open(url, '_blank');
                        }}
                        className="h-7 px-2 text-xs text-accent hover:bg-accent-soft gap-1 font-semibold"
                        title="View staged file"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </AppButton>
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = URL.createObjectURL(attachedFile);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = attachedFile.name;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="h-7 px-2 text-xs text-accent-soft-text hover:bg-accent-soft gap-1 font-semibold"
                        title="Download staged file"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </AppButton>
                      <AppButton aria-label="Remove file"
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachedFile(null)}
                        className="h-7 w-7 p-0 text-muted hover:text-danger-text"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </AppButton>
                    </div>
                  </div>
                )}
                {existingAttachmentPath && !attachedFile && (
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface/50 text-xs">
                    <span className="text-xs text-muted truncate max-w-[200px]" title={existingAttachmentPath}>
                      Current file: {existingAttachmentPath.split('/').pop()}
                    </span>
                    <div className="flex items-center gap-1">
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = supabase.storage.from('amc-attachments').getPublicUrl(existingAttachmentPath).data.publicUrl;
                          window.open(url, '_blank');
                        }}
                        className="h-6 px-2 text-xs text-accent gap-1 font-semibold"
                        title="View existing document"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </AppButton>
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = supabase.storage.from('amc-attachments').getPublicUrl(existingAttachmentPath).data.publicUrl;
                          const a = document.createElement('a');
                          a.href = `${url}${url.includes('?') ? '&' : '?'}download=1`;
                          a.download = existingAttachmentPath.split('/').pop() || 'document';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="h-6 px-2 text-xs text-accent-soft-text gap-1 font-semibold"
                        title="Download existing document"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </AppButton>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes / Remarks */}
            <div className={`space-y-2 ${type === 'Add-on Licenses' ? 'lg:col-span-4' : 'lg:col-span-2'}`}>
              <label className="theme-label">Description / remarks</label>
              <AppInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for mid-year change, business justification…" className="h-11" />
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
          <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent-soft-text" />
            Logged transaction history ({transactions.length})
          </h4>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <ChandakLoader size="sm" title="Loading transactions…" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-muted italic rounded-lg border bg-sunken border-border">
            No mid-year transactions logged for this contract yet. Use the form above to add ad-hoc licenses or customizations.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <AppCard 
                key={tx.id} 
                className="p-4 rounded-lg border border-border bg-surface hover:border-border-active flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-accent-soft-text border border-border-active">
                      {tx.transaction_type}
                    </span>
                    {tx.line_item_name && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-elevated text-foreground border border-border">
                        {tx.line_item_name}
                      </span>
                    )}
                    {tx.po_number && (
                      <span className="text-xs font-semibold text-muted">
                        PO: <strong className="text-foreground">{tx.po_number}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span>Date: <strong className="text-foreground">{formatDate(tx.transaction_date)}</strong></span>
                    {tx.licenses_added > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-accent-soft-text">+{tx.licenses_added} Seats added</span>
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
                    <div className="font-semibold text-base font-mono text-success-text">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(tx.cost)}
                    </div>
                    {tx.exchange_rate && tx.exchange_rate !== 1 && tx.base_currency_amount && (
                      <div className="text-[11px] text-muted font-mono">
                        Base: ₹ {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(tx.base_currency_amount)}
                      </div>
                    )}
                    <div className="text-[11px] text-muted">Logged by {tx.user_master?.full_name || 'System'}</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {tx.attachment_file_path && (
                      <div className="flex items-center gap-1">
                        <AppButton aria-label="View document" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            const url = supabase.storage.from('amc-attachments').getPublicUrl(tx.attachment_file_path).data.publicUrl;
                            window.open(url, '_blank');
                          }}
                          title="View document"
                          className="h-8 w-8 p-0 text-accent hover:bg-accent-soft"
                        >
                          <Eye className="h-4 w-4" />
                        </AppButton>
                        <AppButton aria-label="Download document" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            const url = supabase.storage.from('amc-attachments').getPublicUrl(tx.attachment_file_path).data.publicUrl;
                            const a = document.createElement('a');
                            a.href = `${url}${url.includes('?') ? '&' : '?'}download=1`;
                            a.download = tx.attachment_file_path.split('/').pop() || 'attachment';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          title="Download document"
                          className="h-8 w-8 p-0 text-accent-soft-text hover:bg-accent-soft"
                        >
                          <Download className="h-4 w-4" />
                        </AppButton>
                      </div>
                    )}
                    <AppButton aria-label="Edit transaction" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(tx)} 
                      title="Edit transaction"
                      className="h-8 w-8 p-0 text-muted hover:text-foreground"
                    >
                      <Edit3 className="h-4 w-4" />
                    </AppButton>
                    <AppButton aria-label="Delete transaction" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(tx.id)} 
                      title="Delete transaction"
                      className="h-8 w-8 p-0 text-danger-text hover:bg-danger-soft"
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
