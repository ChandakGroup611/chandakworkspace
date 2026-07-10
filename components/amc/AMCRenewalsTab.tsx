"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { Plus, Trash2, Loader2, IndianRupee, Calendar } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface AMCRenewalsTabProps {
  amcId: string;
  isLightMode: boolean;
  onUpdate: () => void;
  currentExpiryDate?: string;
}

export function AMCRenewalsTab({ amcId, isLightMode, onUpdate, currentExpiryDate }: AMCRenewalsTabProps) {
  const supabase = createClient();
  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Renewal Form
  const [poNumber, setPoNumber] = useState("");
  const [renewalCost, setRenewalCost] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [renewalDate, setRenewalDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

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

      const { error } = await supabase
        .from('amc_renewals')
        .insert([{
          amc_id: amcId,
          po_number: poNumber,
          renewal_cost: parseFloat(renewalCost) || 0,
          previous_expiry: currentExpiryDate || null,
          new_expiry: newExpiry,
          renewal_date: renewalDate,
          notes,
          created_by: user.id
        }]);

      if (error) throw error;

      // Reset form
      setPoNumber("");
      setRenewalCost("");
      setNewExpiry("");
      setNotes("");
      
      await fetchRenewals();
      onUpdate(); // Trigger parent refresh (for new expiry date)
      alert("Renewal logged successfully! Master record expiry date has been pushed forward.");
    } catch (e: any) {
      alert("Error logging renewal: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this renewal log?")) return;
    try {
      const { error } = await supabase.from('amc_renewals').delete().eq('id', id);
      if (error) throw error;
      await fetchRenewals();
      onUpdate();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Add New Renewal */}
      <AppCard className={`p-6 border bg-surface border-border`}>
        <h3 className="text-lg font-bold text-emerald-500 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Log AMC Renewal
        </h3>
        <form onSubmit={handleAddRenewal} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Renewal Date *</label>
              <AppInput type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">New Expiry Date *</label>
              <AppInput type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">PO Number</label>
              <AppInput value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-2027" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Renewal Cost *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <AppInput type="number" step="0.01" value={renewalCost} onChange={(e) => setRenewalCost(e.target.value)} required className="pl-9" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2 lg:col-span-4">
              <label className="text-xs font-bold text-gray-500 uppercase">Notes / Remarks</label>
              <AppInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="E.g., Price locked in for 3 years" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <AppButton type="submit" variant="primary" disabled={isSubmitting} leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}>
              Process Renewal
            </AppButton>
          </div>
        </form>
      </AppCard>

      {/* Renewals Ledger */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Renewal History</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : renewals.length === 0 ? (
          <div className={`p-8 text-center text-gray-500 italic rounded-xl border bg-elevated border-border`}>
            No renewals logged for this subscription yet.
          </div>
        ) : (
          <div className="space-y-3">
            {renewals.map(rn => (
              <AppCard key={rn.id} className={`p-4 flex items-center justify-between border bg-white border-border`}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-500">
                      Renewal
                    </span>
                    <span className="font-semibold text-sm">{rn.po_number || 'No PO'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                    <span>Renewed On: {new Date(rn.renewal_date).toLocaleDateString()}</span>
                    <span>New Expiry: {new Date(rn.new_expiry).toLocaleDateString()}</span>
                    {rn.notes && <span>Notes: {rn.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-black text-lg text-emerald-500">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rn.renewal_cost)}
                    </div>
                    <div className="text-[10px] text-gray-400">Processed by {rn.user_master?.full_name}</div>
                  </div>
                  <button onClick={() => handleDelete(rn.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
