"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { Receipt, Plus, Search, Trash2, Calendar, FileText, ArrowRight, Loader2, DollarSign, IndianRupee } from "lucide-react";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc";
import { createClient } from "@/utils/supabase/client";

interface AMCTransactionsTabProps {
  amcId: string;
  isLightMode: boolean;
  onUpdate: () => void;
}

export function AMCTransactionsTab({ amcId, isLightMode, onUpdate }: AMCTransactionsTabProps) {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Transaction Form
  const [type, setType] = useState("Add-on Licenses");
  const [poNumber, setPoNumber] = useState("");
  const [cost, setCost] = useState("");
  const [licensesAdded, setLicensesAdded] = useState("0");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

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
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await saveAMCEntity("amc_transactions", {
        amc_id: amcId,
        transaction_type: type,
        po_number: poNumber,
        cost: parseFloat(cost) || 0,
        licenses_added: parseInt(licensesAdded) || 0,
        transaction_date: transactionDate,
        notes,
        created_by: user.id
      });
      if (!res.success) throw new Error(res.error);

      // Reset form
      setPoNumber("");
      setCost("");
      setLicensesAdded("0");
      setNotes("");
      
      await fetchTransactions();
      onUpdate(); // Trigger parent refresh (for Total Licenses)
      alert("Transaction logged successfully!");
    } catch (e: any) {
      alert("Error logging transaction: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction? (This will recalculate licenses)")) return;
    try {
      const res = await deleteAMCEntity("amc_transactions", id, true);
      if (!res.success) throw new Error(res.error);
      await fetchTransactions();
      onUpdate();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Add New Transaction */}
      <AppCard className={`p-6 theme-card-structural`}>
        <h3 className="text-lg font-bold text-accent mb-4">Log New Transaction</h3>
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Transaction Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value)} required className={`w-full h-11 px-4 rounded-xl text-sm transition-all outline-none border bg-elevated border-border`}>
                <option value="Add-on Licenses">Add-on Licenses</option>
                <option value="Customization">Customization (OTC)</option>
                <option value="Support Services">Support Services</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Date *</label>
              <AppInput type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">PO Number</label>
              <AppInput value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-1024" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Cost (Total) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <AppInput type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="pl-9" placeholder="0.00" />
              </div>
            </div>
            {type === 'Add-on Licenses' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Licenses Added *</label>
                <AppInput type="number" value={licensesAdded} onChange={(e) => setLicensesAdded(e.target.value)} required />
              </div>
            )}
            <div className={`space-y-2 ${type !== 'Add-on Licenses' ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
              <label className="text-xs font-bold text-gray-500 uppercase">Notes / Remarks</label>
              <AppInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Description of the purchase" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <AppButton type="submit" disabled={isSubmitting} leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}>
              Log Transaction
            </AppButton>
          </div>
        </form>
      </AppCard>

      {/* Transaction Ledger */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Transaction Ledger</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : transactions.length === 0 ? (
          <div className={`p-8 text-center text-gray-500 italic rounded-xl border bg-elevated border-border`}>
            No post-purchase transactions logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => (
              <AppCard key={tx.id} className={`p-4 flex items-center justify-between border bg-white border-border`}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${tx.transaction_type === 'Add-on Licenses' ? 'bg-accent/10 text-accent' : 'bg-accent/10 text-accent'}`}>
                      {tx.transaction_type}
                    </span>
                    <span className="font-semibold text-sm">{tx.po_number || 'No PO'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                    <span>Date: {new Date(tx.transaction_date).toLocaleDateString()}</span>
                    {tx.licenses_added > 0 && <span>+{tx.licenses_added} Licenses</span>}
                    {tx.notes && <span>Notes: {tx.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-black text-lg text-emerald-500">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tx.cost)}
                    </div>
                    <div className="text-[10px] text-gray-400">Logged by {tx.user_master?.full_name}</div>
                  </div>
                  <AppButton variant="secondary" onClick={() => handleDelete(tx.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </AppButton>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
