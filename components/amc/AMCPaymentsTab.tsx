"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { Plus, Trash2, Loader2, IndianRupee, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface AMCPaymentsTabProps {
  amcId: string;
  isLightMode: boolean;
}

export function AMCPaymentsTab({ amcId, isLightMode }: AMCPaymentsTabProps) {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New Invoice Form
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('amc_invoices')
        .insert([{
          amc_id: amcId,
          description,
          amount: parseFloat(amount) || 0,
          due_date: dueDate,
          invoice_number: invoiceNumber,
          status: 'Pending',
          created_by: user.id
        }]);

      if (error) throw error;

      setDescription("");
      setAmount("");
      setDueDate("");
      setInvoiceNumber("");
      
      await fetchInvoices();
    } catch (e: any) {
      alert("Error adding invoice: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('amc_invoices')
        .update({ 
          status: 'Paid', 
          payment_date: new Date().toISOString().split('T')[0] 
        })
        .eq('id', id);

      if (error) throw error;
      await fetchInvoices();
    } catch (e: any) {
      alert("Error marking as paid: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const { error } = await supabase.from('amc_invoices').delete().eq('id', id);
      if (error) throw error;
      await fetchInvoices();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'Paid') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Paid</span>;
    }
    const isOverdue = new Date(dueDate) < new Date();
    if (isOverdue) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Overdue</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</span>;
  };

  return (
    <div className="space-y-8">
      {/* Add Manual Invoice */}
      <AppCard className={`p-6 border bg-surface border-border`}>
        <h3 className="text-lg font-bold text-accent mb-4">Add Custom Invoice</h3>
        <form onSubmit={handleAddInvoice} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Description *</label>
              <AppInput value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="e.g. Q1 Installment" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Amount *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <AppInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="pl-9" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Due Date *</label>
              <AppInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Invoice Number</label>
              <AppInput value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-2026-001" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <AppButton type="submit" disabled={isSubmitting} leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}>
              Add Invoice
            </AppButton>
          </div>
        </form>
      </AppCard>

      {/* Invoice Ledger */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Payment Schedule & Invoices</h3>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : invoices.length === 0 ? (
          <div className={`p-8 text-center text-gray-500 italic rounded-xl border bg-elevated border-border`}>
            No invoices scheduled for this subscription.
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <AppCard key={inv.id} className={`p-4 flex items-center justify-between border bg-white border-border`}>
                <div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(inv.status, inv.due_date)}
                    <span className="font-semibold text-sm">{inv.description}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                    <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>
                    {inv.invoice_number && <span>Invoice #: {inv.invoice_number}</span>}
                    {inv.payment_date && <span className="text-emerald-500 font-semibold">Paid On: {new Date(inv.payment_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-black text-lg">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inv.amount)}
                    </div>
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
                    <button onClick={() => handleDelete(inv.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
