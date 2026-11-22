"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Check, 
  Calendar, 
  DollarSign, 
  User, 
  Building2, 
  Lock, 
  Paperclip, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2,
  Zap,
  ShieldCheck,
  Users
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { createClient } from "@/utils/supabase/client";
import { saveAMCEntity } from "@/lib/actions/amc-client";
import { toast } from "react-toastify";

interface AttachmentEntry {
  id: string;
  docName: string;
  file: File | null;
}

interface SubscriptionContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialRecord?: any;
  vendors: any[];
  departments: any[];
  users: any[];
}

export function SubscriptionContractModal({
  isOpen,
  onClose,
  onSaved,
  initialRecord,
  vendors,
  departments,
  users
}: SubscriptionContractModalProps) {
  const supabase = createClient();

  const [softwareName, setSoftwareName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("Active");

  // Plan & Commercials
  const [billingFrequency, setBillingFrequency] = useState("Yearly");
  const [totalCost, setTotalCost] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [notifyBeforeDays, setNotifyBeforeDays] = useState("30");

  // Seats
  const [totalLicenses, setTotalLicenses] = useState("");
  const [usedLicenses, setUsedLicenses] = useState("");

  // Compliance & Security
  const [licenseKey, setLicenseKey] = useState("");
  const [dataClassification, setDataClassification] = useState("");
  const [complianceStatus, setComplianceStatus] = useState<string[]>([]);
  const [dpaSigned, setDpaSigned] = useState(false);
  const [notes, setNotes] = useState("");

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate when editing
  useEffect(() => {
    if (initialRecord) {
      setSoftwareName(initialRecord.software_name || "");
      setVendorId(initialRecord.vendor_id || "");
      setDepartmentId(initialRecord.department_id || "");
      setAssignedTo(initialRecord.assigned_to || "");
      setStatus(initialRecord.status || "Active");
      setBillingFrequency(initialRecord.billing_frequency || "Yearly");
      setTotalCost(initialRecord.cost ? String(initialRecord.cost) : "");
      setCurrency(initialRecord.currency || "INR");
      setPurchaseDate(initialRecord.purchase_date || "");
      setExpiryDate(initialRecord.expiry_date || "");
      setAutoRenewal(!!initialRecord.auto_renewal);
      setNotifyBeforeDays(initialRecord.notify_before_days ? String(initialRecord.notify_before_days) : "30");
      setTotalLicenses(initialRecord.total_licenses ? String(initialRecord.total_licenses) : "");
      setUsedLicenses(initialRecord.used_licenses ? String(initialRecord.used_licenses) : "");
      setLicenseKey(initialRecord.license_key || "");
      setDataClassification(initialRecord.data_classification || "");
      setComplianceStatus(Array.isArray(initialRecord.compliance_status) ? initialRecord.compliance_status : []);
      setDpaSigned(!!initialRecord.dpa_signed);
      setNotes(initialRecord.notes || "");

      // Fetch existing files
      if (initialRecord.id) {
        supabase.storage
          .from("amc-attachments")
          .list(initialRecord.id)
          .then(({ data }) => setExistingAttachments(data || []));
      }
    } else {
      // Defaults for new subscription
      setSoftwareName("");
      setVendorId("");
      setDepartmentId("");
      setAssignedTo("");
      setStatus("Active");
      setBillingFrequency("Yearly");
      setTotalCost("");
      setCurrency("INR");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setExpiryDate("");
      setAutoRenewal(false);
      setNotifyBeforeDays("30");
      setTotalLicenses("");
      setUsedLicenses("");
      setLicenseKey("");
      setDataClassification("Internal");
      setComplianceStatus([]);
      setDpaSigned(false);
      setNotes("");
      setAttachments([
        { id: "1", docName: "Purchase Order", file: null },
        { id: "2", docName: "Agreement", file: null }
      ]);
      setExistingAttachments([]);
    }
    setErrorMsg(null);
  }, [initialRecord, isOpen, supabase]);

  if (!isOpen) return null;

  const handleAddAttachment = () => {
    setAttachments(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), docName: "Contract Document", file: null }
    ]);
  };

  const handleFileChange = (id: string, file: File | null) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, file } : a));
  };

  const handleDocNameChange = (id: string, docName: string) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, docName } : a));
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!softwareName.trim()) {
      setErrorMsg("Software / Tool Name is mandatory.");
      return;
    }
    if (!vendorId) {
      setErrorMsg("Provider / Vendor is mandatory.");
      return;
    }
    if (!departmentId) {
      setErrorMsg("Department is mandatory.");
      return;
    }
    if (!assignedTo) {
      setErrorMsg("Subscription Owner is mandatory.");
      return;
    }
    if (!purchaseDate) {
      setErrorMsg("Purchase / Start Date is mandatory.");
      return;
    }

    // Attachment validation (PO and Agreement)
    const isPoDoc = (type: string) => /purchase\s*order|po\b/i.test(type);
    const isAgreementDoc = (type: string) => /agreement|contract|sign\s*off|invoice/i.test(type);

    const allDocs = [
      ...attachments.filter(a => a.file).map(a => a.docName),
      ...existingAttachments.map(f => f.name)
    ];

    const hasPo = allDocs.some(isPoDoc);
    const hasAgreement = allDocs.some(isAgreementDoc);

    if (!hasPo || !hasAgreement) {
      setErrorMsg("Both Purchase Order (PO) and Agreement / Invoice documents are mandatory.");
      return;
    }

    const costNum = parseFloat(totalCost) || 0;
    const totalLicNum = parseInt(totalLicenses) || 0;
    const usedLicNum = parseInt(usedLicenses) || 0;

    const monthlyAmortized = costNum > 0
      ? (billingFrequency === "Monthly" ? costNum : parseFloat((costNum / 12).toFixed(2)))
      : null;

    const payload = {
      software_name: softwareName.trim(),
      contract_type: "Subscription",
      vendor_id: vendorId,
      department_id: departmentId,
      assigned_to: assignedTo,
      status: status,
      billing_frequency: billingFrequency,
      cost: costNum,
      currency: currency,
      purchase_date: purchaseDate,
      expiry_date: expiryDate || null,
      auto_renewal: autoRenewal,
      notify_before_days: parseInt(notifyBeforeDays) || 30,
      total_licenses: totalLicNum || null,
      used_licenses: usedLicNum || null,
      cost_per_license: (totalLicNum > 0 && costNum > 0) ? parseFloat((costNum / totalLicNum).toFixed(2)) : null,
      license_key: licenseKey || null,
      data_classification: dataClassification || null,
      compliance_status: complianceStatus,
      dpa_signed: dpaSigned,
      notes: notes,
      monthly_amortized_cost: monthlyAmortized
    };

    setSaving(true);
    try {
      let recordId = initialRecord?.id;
      if (recordId) {
        const res = await saveAMCEntity("software_amc", payload, recordId);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await saveAMCEntity("software_amc", payload);
        if (!res.success) throw new Error(res.error);
        recordId = res.data?.id;
      }

      // Upload newly staged files
      if (recordId && attachments.length > 0) {
        for (const entry of attachments) {
          if (!entry.file) continue;
          const safeName = (entry.docName || "Document").replace(/[^a-zA-Z0-9 -]/g, "");
          const fileName = `${recordId}/[HEAD_${safeName}]_${Math.random().toString(36).substring(2, 8)}_${entry.file.name}`;
          await supabase.storage.from("amc-attachments").upload(fileName, entry.file);
        }
      }

      toast.success(initialRecord ? "Subscription updated successfully!" : "Subscription created successfully!");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Save subscription error:", err);
      setErrorMsg(err.message || "Failed to save subscription.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-5 bg-[var(--overlay)] animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl overflow-hidden border border-border bg-surface shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b shrink-0 border-border bg-elevated">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-soft text-warning-text border border-warning-border">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {initialRecord ? `Edit Subscription: ${initialRecord.software_name}` : "New Software Subscription"}
              </h2>
              <p className="text-xs text-muted">
                Track recurring SaaS tools, seat counts, and automatic renewal dates.
              </p>
            </div>
          </div>
          <AppButton 
            variant="ghost" 
            size="icon-sm"
            aria-label="Close subscription modal"
            onClick={onClose} 
            className="text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </AppButton>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-soft p-3 text-xs text-danger-text">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Group 1: Basics */}
          <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-theme-icon" /> 1. Subscription Basics
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Software / Tool Name <span className="text-danger">*</span>
                </label>
                <AppInput
                  placeholder="e.g. Figma Enterprise, Slack Business+, Zoom Pro"
                  value={softwareName}
                  onChange={(e) => setSoftwareName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Provider / Vendor <span className="text-danger">*</span>
                </label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                  required
                >
                  <option value="">Select Vendor…</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.vendor_name || v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Owning Department <span className="text-danger">*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                  required
                >
                  <option value="">Select Department…</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Subscription Owner <span className="text-danger">*</span>
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                  required
                >
                  <option value="">Select Employee / Owner…</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Expired">Expired</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Group 2: Plan, Seats & Renewals */}
          <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-theme-icon" /> 2. Plan, Seats & Renewal Terms
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Billing Frequency</label>
                <select
                  value={billingFrequency}
                  onChange={(e) => setBillingFrequency(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Annual / Yearly</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Recurring Cost <span className="text-danger">*</span>
                </label>
                <AppInput
                  type="number"
                  step="0.01"
                  placeholder="e.g. 120000"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Start / Purchase Date <span className="text-danger">*</span>
                </label>
                <AppInput
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Next Renewal Date</label>
                <AppInput
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Alert Window (Days)</label>
                <select
                  value={notifyBeforeDays}
                  onChange={(e) => setNotifyBeforeDays(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                >
                  <option value="15">15 days before renewal</option>
                  <option value="30">30 days before renewal</option>
                  <option value="45">45 days before renewal</option>
                  <option value="60">60 days before renewal</option>
                </select>
              </div>

              {/* Seats */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Total Seats / Licenses</label>
                <AppInput
                  type="number"
                  min="0"
                  placeholder="e.g. 25"
                  value={totalLicenses}
                  onChange={(e) => setTotalLicenses(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Currently Assigned Seats</label>
                <AppInput
                  type="number"
                  min="0"
                  placeholder="e.g. 18"
                  value={usedLicenses}
                  onChange={(e) => setUsedLicenses(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Auto Renewal Toggle */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={autoRenewal}
                    onChange={(e) => setAutoRenewal(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Auto-renews automatically</span>
                </label>
              </div>
            </div>
          </div>

          {/* Group 3: Documents & Attachments */}
          <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-theme-icon" /> 3. Mandatory Documents (PO & Agreement)
              </h3>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAttachment}
                className="h-7 text-xs"
              >
                + Add File
              </AppButton>
            </div>

            <p className="text-[11.5px] text-muted">
              Please attach both the Purchase Order (PO) and the signed Agreement / Invoice for verification.
            </p>

            <div className="space-y-2">
              {attachments.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Purchase Order, Agreement)"
                    value={entry.docName}
                    onChange={(e) => handleDocNameChange(entry.id, e.target.value)}
                    className="h-8 flex-1 rounded border border-border bg-surface px-2.5 text-xs text-foreground min-w-[160px]"
                  />
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(entry.id, e.target.files?.[0] || null)}
                    className="text-xs text-muted file:mr-2 file:h-7 file:rounded file:border-0 file:bg-sunken file:px-2.5 file:text-xs file:font-semibold file:text-foreground"
                  />
                  {attachments.length > 2 && (
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveAttachment(entry.id)}
                      className="text-muted hover:text-danger-text"
                    >
                      <X className="h-3.5 w-3.5" />
                    </AppButton>
                  )}
                </div>
              ))}
            </div>

            {/* Existing Documents if editing */}
            {existingAttachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <span className="text-[11px] font-semibold text-muted block mb-1.5">Existing Attachments:</span>
                <div className="flex flex-wrap gap-1.5">
                  {existingAttachments.map((file, idx) => (
                    <span key={idx} className="rounded bg-sunken px-2 py-1 text-[11px] font-mono text-foreground border border-border/50">
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Group 4: Remarks / Notes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Operational Notes / Remarks</label>
            <textarea
              rows={2}
              placeholder="e.g. Team license managed by Design lead. 10 additional seats requested next quarter."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <AppButton
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="text-xs"
            >
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              variant="primary"
              disabled={saving}
              leftIcon={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              className="text-xs font-semibold"
            >
              {saving ? "Saving…" : initialRecord ? "Update Subscription" : "Create Subscription"}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
}
