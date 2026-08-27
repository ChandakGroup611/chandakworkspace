"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { CalendarClock, Plus, Search, Trash2, Calendar, FileText, ArrowRight, Loader2, IndianRupee } from "lucide-react";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc";
import { createClient } from "@/utils/supabase/client";

interface AMCRenewalsTabProps {
  amcId: string;
  isLightMode: boolean;
  onUpdate: () => void;
  currentExpiryDate?: string;
  currency?: string;
}

export function AMCRenewalsTab({ amcId, isLightMode, onUpdate, currentExpiryDate, currency = 'INR' }: AMCRenewalsTabProps) {
  const supabase = createClient();
  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // New Renewal Form
  const [poNumber, setPoNumber] = useState("");
  const [renewalCost, setRenewalCost] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [renewalDate, setRenewalDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.0");

  useEffect(() => {
    fetchRenewals();
  }, [amcId]);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('amc_renewals')
        .select('*, user_master(full_name)')
        .eq('amc_id', amcId)
        .order('renewal_date', { ascending: false });
      
      if (error) throw error;
      setRenewals(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: any = {
        amc_id: amcId,
        po_number: poNumber,
        renewal_cost: parseFloat(renewalCost) || 0,
        new_expiry: newExpiry,
        renewal_date: renewalDate,
        notes,
        base_currency: 'INR',
        exchange_rate: parseFloat(exchangeRate) || 1.0,
        base_currency_amount: (parseFloat(renewalCost) || 0) * (parseFloat(exchangeRate) || 1.0)
      };

      if (!editId) {
        payload.previous_expiry = currentExpiryDate || null;
        payload.created_by = user.id;
      }

      const res = await saveAMCEntity("amc_renewals", payload, editId || undefined);
      if (!res.success) throw new Error(res.error);

      // Reset form
      setEditId(null);
      setPoNumber("");
      setRenewalCost("");
      setNewExpiry("");
      setNotes("");
      setExchangeRate("1.0");
      
      await fetchRenewals();
      onUpdate(); // Trigger parent refresh (for new expiry date)
      toast.success("Renewal logged successfully! Master record expiry date has been pushed forward.");
    } catch (e: any) {
      toast.error("Error logging renewal: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rn: any) => {
    setEditId(rn.id);
    setPoNumber(rn.po_number || "");
    setRenewalCost(String(rn.renewal_cost || ""));
    setNewExpiry(rn.new_expiry ? new Date(rn.new_expiry).toISOString().split('T')[0] : "");
    setRenewalDate(rn.renewal_date ? new Date(rn.renewal_date).toISOString().split('T')[0] : "");
    setNotes(rn.notes || "");
    setExchangeRate(String(rn.exchange_rate || "1.0"));
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setPoNumber("");
    setRenewalCost("");
    setNewExpiry("");
    setNotes("");
    setExchangeRate("1.0");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this renewal log?")) return;
    try {
      const res = await deleteAMCEntity("amc_renewals", id, true);
      if (!res.success) throw new Error(res.error);
      await fetchRenewals();
      onUpdate();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Add/Edit Renewal */}
      <AppCard className={`p-6 theme-card-structural`}>
        <h3 className="text-lg font-bold text-success mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {editId ? "Edit Renewal Record" : "Log AMC Renewal"}
        </h3>
        <form onSubmit={handleAddRenewal} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase">Renewal Date *</label>
              <AppInput type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase">New Expiry Date *</label>
              <AppInput type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase">PO Number</label>
              <AppInput value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-2027" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted uppercase">Renewal Cost *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">{currency}</span>
                <AppInput type="number" step="0.01" value={renewalCost} onChange={(e) => setRenewalCost(e.target.value)} required className="pl-12" placeholder="0.00" />
              </div>
            </div>
            {currency !== 'INR' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted uppercase">Exchange Rate (to INR) *</label>
                <AppInput type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2 lg:col-span-4">
              <label className="text-sm font-bold text-muted uppercase">Notes / Remarks</label>
              <AppInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="E.g., Price locked in for 3 years" />
            </div>
          </div>
          <div className="flex justify-end pt-2 gap-2">
            {editId && (
              <AppButton type="button" variant="outline" onClick={handleCancelEdit} className="text-danger border-danger/30 hover:bg-danger/10 hover:border-danger hover:text-danger">
                Discard
              </AppButton>
            )}
            <AppButton type="submit" variant="primary" disabled={isSubmitting} leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}>
              {editId ? "Update Renewal" : "Process Renewal"}
            </AppButton>
          </div>
        </form>
      </AppCard>

      {/* Renewals Ledger */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Renewal History</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-theme-icon" /></div>
        ) : renewals.length === 0 ? (
          <div className={`p-8 text-center text-muted italic rounded-xl border bg-elevated border-border`}>
            No renewals logged for this subscription yet.
          </div>
        ) : (
          <div className="space-y-3">
            {renewals.map(rn => (
              <AppCard key={rn.id} className={`p-4 flex items-center justify-between theme-card-structural`}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-success/10 text-success">
                      Renewal
                    </span>
                    <span className="font-semibold text-sm">{rn.po_number || 'No PO'}</span>
                  </div>
                  <div className="text-xs text-muted mt-2 flex items-center gap-4">
                    <span>Renewed On: {new Date(rn.renewal_date).toLocaleDateString()}</span>
                    <span>New Expiry: {new Date(rn.new_expiry).toLocaleDateString()}</span>
                    {rn.notes && <span>Notes: {rn.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-black text-lg text-success">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(rn.renewal_cost)}
                    </div>
                    {rn.exchange_rate && rn.exchange_rate !== 1 && rn.base_currency_amount && (
                      <div className="text-[10px] text-muted font-mono">
                        Base (INR): {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(rn.base_currency_amount)}
                      </div>
                    )}
                    <div className="text-[10px] text-muted">Processed by {rn.user_master?.full_name}</div>
                  </div>
                  <div className="flex gap-2">
                    <AppButton variant="secondary" onClick={() => handleEdit(rn)} className="p-2 text-theme-icon hover:bg-elevated rounded-lg transition-colors" title="Edit Renewal">
                      <FileText className="h-4 w-4" />
                    </AppButton>
                    <AppButton variant="secondary" onClick={() => handleDelete(rn.id)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Delete Renewal">
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
