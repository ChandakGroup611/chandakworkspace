"use client";

import React, { useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { X, Calendar, DollarSign, FileText, Loader2 } from "lucide-react";
import { saveAMCEntity } from "@/lib/actions/amc";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "@/components/theme/ThemeProvider";

interface AMCRenewalModalProps {
  amcData: any;
  isLightMode: boolean;
  onClose: () => void;
  onRenewed: () => void;
}

export function AMCRenewalModal({ amcData, isLightMode, onClose, onRenewed }: AMCRenewalModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cost, setCost] = useState("");
  const [poNumber, setPoNumber] = useState("");

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseDate || !expiryDate || !cost) {
      alert("Please fill in all mandatory fields.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update old record status to "Renewed"
      const updateRes = await saveAMCEntity("software_amc", { status: 'Renewed' }, amcData.id);
      if (!updateRes.success) throw new Error(updateRes.error);

      // 2. Create new record based on old data but new dates/cost
      const newAmc = {
        ...amcData,
        id: undefined, // Let DB generate new UUID
        created_at: undefined,
        status: 'Active',
        purchase_date: purchaseDate,
        expiry_date: expiryDate,
        cost: parseFloat(cost),
        po_number: poNumber || amcData.po_number,
        used_licenses: 0, // Reset used licenses for new term, or we could copy them? Let's copy them if needed, but usually they are re-allocated. We'll leave as 0 and let triggers handle it if we copy allocations.
      };
      
      // Let's actually not reset used_licenses manually, but the DB default is 0. 
      // If they want to carry over allocations, they'll need a backend function. For now, new term = fresh allocations.

      const insertRes = await saveAMCEntity("software_amc", newAmc);
      if (!insertRes.success) throw new Error(insertRes.error);

      alert("Contract renewed successfully! Old record is archived as 'Renewed'.");
      onRenewed();
    } catch (e: any) {
      alert("Failed to renew: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <AppCard className={`relative w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 bg-surface`}>
        
        <div className={`flex items-center justify-between p-6 border-b border-border`}>
          <div>
            <h3 className="text-xl font-bold text-accent">Renew Subscription</h3>
            <p className="text-sm text-gray-500 mt-1">
              {amcData.software_name} - {amcData.provider_name}
            </p>
          </div>
          <AppButton variant="destructive" onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </AppButton>
        </div>

        <form onSubmit={handleRenew} className="p-6 space-y-6">
          <div className={`p-4 rounded-xl border bg-orange-50 border-orange-200 text-orange-800`}>
            <p className="text-sm">
              Renewing will archive the current active contract as <strong>"Renewed"</strong> and create a fresh <strong>"Active"</strong> record with the new dates and financials.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">New Purchase Date *</label>
                <AppInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">New Expiry Date *</label>
                <AppInput type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Renewal Cost ({amcData.currency || 'INR'}) *</label>
                <AppInput type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required placeholder="e.g., 5000" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">New PO Number</label>
                <AppInput value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <AppButton type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</AppButton>
            <AppButton type="submit" variant="primary" disabled={loading} leftIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}>
              Confirm Renewal
            </AppButton>
          </div>
        </form>

      </AppCard>
    </div>
  );
}
