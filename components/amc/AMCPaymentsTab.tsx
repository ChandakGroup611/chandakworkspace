"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { FileText, Plus, Search, Calendar, DollarSign, CheckCircle2, Clock, Check, Trash2, Loader2, IndianRupee, CheckCircle, AlertCircle } from "lucide-react";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc";
import { createClient } from "@/utils/supabase/client";

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
    } finally {
      setLoading(false);
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
      await fetchInvoices();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'Paid') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-success/10 text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Paid</span>;
    }
    const isOverdue = new Date(dueDate) < new Date();
    if (isOverdue) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-danger/10 text-danger flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Overdue</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-warning/10 text-warning flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</span>;
  };

  return (
    <div className="space-y-8">


      {/* Invoice Ledger */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Payment Schedule & Invoices</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-theme-icon" /></div>
        ) : invoices.length === 0 ? (
          <div className={`p-8 text-center text-muted italic rounded-xl border bg-elevated border-border`}>
            No invoices scheduled for this subscription.
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <AppCard key={inv.id} className={`p-4 flex items-center justify-between theme-card-structural`}>
                <div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(inv.status, inv.due_date)}
                    <span className="font-semibold text-sm">{inv.description}</span>
                    {inv.payment_type && (
                      <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">
                        {inv.payment_type}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-2 flex items-center gap-4">
                    <span>Payment Date: {new Date(inv.due_date).toLocaleDateString()}</span>
                    {inv.invoice_number && <span>Invoice #: {inv.invoice_number}</span>}
                    {inv.payment_date && <span className="text-success font-semibold">Paid On: {new Date(inv.payment_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-black text-lg">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(inv.amount)}
                    </div>
                    {inv.exchange_rate && inv.exchange_rate !== 1 && inv.base_currency_amount && (
                      <div className="text-[10px] text-muted font-mono mt-1">
                        Base (INR): {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(inv.base_currency_amount)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {inv.status === 'Pending' && (
                      <AppButton 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleMarkPaid(inv.id)}
                        disabled={processingId === inv.id}
                      >
                        {processingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark Paid"}
                      </AppButton>
                    )}
                    <AppButton variant="secondary" onClick={() => handleDelete(inv.id)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors">
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
